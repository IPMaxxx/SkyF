/**
 * Автономный офлайн-экран «Вернуться к точке входа».
 *
 * Открывается нативной оболочкой, когда боевой сайт недоступен (нет сети на
 * холодном старте). Полностью самодостаточен: не зависит от Next-сборки и сети.
 *
 *  - активный поход берётся из Capacitor Preferences (ключ sf_active_track),
 *    куда его зеркалирует приложение (см. src/lib/trackState.ts);
 *  - тайлы карты — из Capacitor Filesystem (скачаны через OfflineMapManager),
 *    доступ по Capacitor.convertFileSrc; при наличии сети — дозагрузка из сети;
 *  - позиция — через плагин фоновой геолокации (запись продолжается со
 *    свёрнутым приложением и погашенным экраном), с откатом на Capacitor
 *    Geolocation и браузерный API;
 *
 * Гео-формулы — мини-копия src/lib/trackGeo.ts (тот модуль в сборку сюда не
 * попадает).
 */
(function () {
  "use strict";

  /**
   * Доступ к нативным плагинам с этой страницы. Случаев три, и ни в одном
   * window.Capacitor.Plugins не годится: его заполняет registerPlugin из
   * бандла сайта, а здесь бандла нет.
   *
   *  - iOS: native-bridge.js оболочка инжектит, и он даёт низкоуровневые
   *    nativePromise/nativeCallback — плагины зовём через них напрямую;
   *  - Android с заданным server.url: в errorPath-страницу native-bridge.js не
   *    инжектится вовсе, но androidBridge (WebMessageListener) на странице
   *    есть — постим вызовы в штатном формате
   *    {callbackId, pluginId, methodName, options} и разбираем ответы
   *    {callbackId, success, data, save} (см. MessageHandler.java);
   *  - обычный браузер (отладка): моста нет, остаётся navigator.geolocation.
   */
  function injectedBridgeTransport() {
    var cap = window.Capacitor;
    if (!cap || typeof cap.nativeCallback !== "function" || typeof cap.nativePromise !== "function") {
      return null;
    }
    return {
      convertFileSrc: typeof cap.convertFileSrc === "function"
        ? function (uri) { return cap.convertFileSrc(uri); }
        : function (uri) { return uri; },
      callMethod: function (pluginId, methodName, options) {
        return cap.nativePromise(pluginId, methodName, options || {});
      },
      callWatch: function (pluginId, methodName, options, cb) {
        return cap.nativeCallback(pluginId, methodName, options || {}, function (data, error) {
          cb(error ? null : data);
        });
      },
    };
  }

  function androidShimTransport() {
    var ab = window.androidBridge;
    if (!ab || typeof ab.postMessage !== "function") return null;

    var callbacks = {};
    var counter = Math.floor(Math.random() * 134217728);

    ab.onmessage = function (event) {
      var result;
      try { result = JSON.parse(event.data); } catch (e) { return; }
      var stored = callbacks[result.callbackId];
      if (!stored) return;
      if (!result.save) delete callbacks[result.callbackId];
      if (result.success) stored.onResult(result.data);
      else stored.onError(result.error || {});
    };

    function post(id, pluginId, methodName, options) {
      ab.postMessage(JSON.stringify({
        callbackId: id,
        pluginId: pluginId,
        methodName: methodName,
        options: options || {},
      }));
    }

    return {
      convertFileSrc: function (uri) {
        return typeof uri === "string" && uri.indexOf("file://") === 0
          ? window.location.origin + "/_capacitor_file_" + uri.slice(7)
          : uri;
      },
      callMethod: function (pluginId, methodName, options) {
        return new Promise(function (resolve, reject) {
          var id = String(++counter);
          callbacks[id] = { onResult: resolve, onError: reject };
          try { post(id, pluginId, methodName, options); }
          catch (e) { delete callbacks[id]; reject(e); }
        });
      },
      // Callback-методы (watchPosition, старт фоновой записи): ответы приходят
      // многократно (save=true).
      callWatch: function (pluginId, methodName, options, cb) {
        var id = String(++counter);
        callbacks[id] = {
          onResult: function (data) { cb(data); },
          onError: function () { cb(null); },
        };
        try { post(id, pluginId, methodName, options); } catch (e) {}
        return id;
      },
    };
  }

  /**
   * Срок на ожидание. На этой странице ответа может не быть вовсе, и это не
   * теория: androidShimTransport ждёт ответ по callbackId, и если нативная
   * сторона его не пришлёт (плагина нет в оболочке, служба умерла, мост ещё не
   * поднят), промис не отклонится никогда. Снаружи такое ожидание выглядит не
   * ошибкой, а пустым экраном — ровно тот класс дефекта, из-за которого
   * фоновая запись искалась полтора дня. Поэтому у каждого ожидания здесь есть
   * исход: значение, отказ или срок.
   */
  function withDeadline(work, ms, onLate) {
    return new Promise(function (resolve, reject) {
      var settled = false;
      var timer = setTimeout(function () {
        if (settled) return;
        settled = true;
        if (typeof onLate === "function") resolve(onLate());
        else reject(new Error("timeout"));
      }, ms);
      Promise.resolve(work).then(
        function (value) {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(value);
        },
        function (error) {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          reject(error);
        },
      );
    });
  }

  /**
   * Срок на один вызов моста. Нативная сторона здесь либо отвечает сразу, либо
   * не ответит уже никогда, поэтому пяти секунд с запасом хватает, а истёкший
   * срок уходит отказом — его разбирают те же `catch`, что и обычную ошибку
   * плагина.
   */
  var BRIDGE_MS = 5000;
  function bridgeCall(work) {
    return withDeadline(work, BRIDGE_MS);
  }

  function createBridge() {
    var t = injectedBridgeTransport() || androidShimTransport();
    if (!t) return null;
    // Срок навешивается здесь, а не у каждого вызывающего: тогда его нельзя
    // забыть, а разбирать истёкший срок можно тем же `catch`, что и отказ
    // плагина. Исключение одно — getCurrentPosition: у него свой таймаут на
    // холодный GPS, и обрывать его раньше нельзя.
    var call = function (pluginId, methodName, options) {
      return bridgeCall(t.callMethod(pluginId, methodName, options));
    };
    var slowCall = function (pluginId, methodName, options, ms) {
      return withDeadline(t.callMethod(pluginId, methodName, options), ms);
    };
    var watch = t.callWatch;
    return {
      convertFileSrc: t.convertFileSrc,
      Plugins: {
        SplashScreen: {
          hide: function (o) { return call("SplashScreen", "hide", o); },
        },
        Preferences: {
          get: function (o) { return call("Preferences", "get", o); },
          set: function (o) { return call("Preferences", "set", o); },
          remove: function (o) { return call("Preferences", "remove", o); },
        },
        Filesystem: {
          stat: function (o) { return call("Filesystem", "stat", o); },
          getUri: function (o) { return call("Filesystem", "getUri", o); },
          writeFile: function (o) { return call("Filesystem", "writeFile", o); },
        },
        Geolocation: {
          // Свой таймаут замера + запас на дорогу до моста: холодный GPS
          // отвечает десятки секунд, и своим сроком его глушить нельзя.
          getCurrentPosition: function (o) {
            return slowCall("Geolocation", "getCurrentPosition", o, ((o && o.timeout) || 30000) + 5000);
          },
          requestPermissions: function () { return call("Geolocation", "requestPermissions", {}); },
          watchPosition: function (o, cb) { return watch("Geolocation", "watchPosition", o, cb); },
          clearWatch: function (o) { return call("Geolocation", "clearWatch", o); },
        },
        // Своя служба переднего плана (оболочка Android, versionCode 9 и
        // новее): честный промис вместо колбэчного старта и уведомление,
        // которое видно сразу и на экране блокировки. Координаты приходят
        // событием location, поэтому подписка — через callWatch.
        WayBackTrack: {
          start: function (o) { return call("WayBackTrack", "start", o); },
          stop: function () { return call("WayBackTrack", "stop", {}); },
          status: function () { return call("WayBackTrack", "status", {}); },
          requestNotifications: function () { return call("WayBackTrack", "requestNotifications", {}); },
          onLocation: function (cb) {
            return watch("WayBackTrack", "addListener", { eventName: "location" }, cb);
          },
          removeAllListeners: function () { return call("WayBackTrack", "removeAllListeners", {}); },
        },
        // Плагина нет в оболочках, собранных до появления фоновой записи:
        // вызов там ответит ошибкой, и страница останется на обычном watch.
        BackgroundGeolocation: {
          start: function (o, cb) { return watch("BackgroundGeolocation", "start", o, cb); },
          stop: function () { return call("BackgroundGeolocation", "stop", {}); },
          getPluginVersion: function () { return call("BackgroundGeolocation", "getPluginVersion", {}); },
        },
      },
    };
  }

  var Cap = createBridge();

  // Нативный splash не прячется автоматически (launchAutoHide: false) — на
  // офлайн-странице прячем его сами, иначе он завис бы поверх карты.
  function hideNativeSplash() {
    if (Cap && Cap.Plugins && Cap.Plugins.SplashScreen) {
      Cap.Plugins.SplashScreen.hide({ fadeOutDuration: 250 }).catch(function () {});
    }
  }

  // Страховка: любая необработанная ошибка не должна оставить вечный splash.
  window.addEventListener("error", hideNativeSplash);

  var ACTIVE_TRACK_KEY = "sf_active_track";
  var TILE_DIR = "sf-tiles";
  // Источники тайлов — те же id и шаблоны, что в src/lib/offline/tileStore.ts:
  // регион скачивается сайтом в оба слоя (тропы + спутник).
  var SOURCES = {
    outdoor: {
      id: "outdoor",
      url: "https://{s}.tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey=1faca5b7ed0d462b8630f4c3ec1acbcb",
      subs: ["a", "b", "c"],
    },
    satellite: {
      id: "satellite",
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      subs: [""],
    },
  };
  var APP_URL = "https://skyforest.ai/dashboard/track";

  var MIN_POINT_DISTANCE_M = 20;
  var MIN_COURSE_DISTANCE_M = 12;
  var MAX_COURSE_AGE_MS = 45000;
  var COURSE_STALE_MS = 20000;
  var GAP_MS = 5 * 60000;

  var BLANK_TILE =
    "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==";

  /* ------------------------- Локализация ------------------------- */

  var RU = String(navigator.language || "").toLowerCase().indexOf("ru") === 0;
  var DIRS = RU
    ? { n: "север", ne: "северо-восток", e: "восток", se: "юго-восток", s: "юг", sw: "юго-запад", w: "запад", nw: "северо-запад" }
    : { n: "north", ne: "north-east", e: "east", se: "south-east", s: "south", sw: "south-west", w: "west", nw: "north-west" };
  var T = RU
    ? {
        title: "Возврат к точке входа",
        offline: "ОФЛАЙН",
        offlineNote: "Вы сейчас офлайн — всё работает без интернета.",
        distance: "До входа",
        duration: "В походе",
        startPrompt: "Выберите на карте стартовую точку, к которой нужно выйти: коснитесь карты или используйте свою геолокацию. Стрелка покажет направление.",
        start: "Way Back",
        finish: "Я вернулся из похода",
        geoError: "Не удалось определить местоположение. Проверьте разрешение на геолокацию.",
        locate: "Моё местоположение",
        layerTrails: "Тропы",
        layerSatellite: "Спутник",
        openApp: "Открыть приложение",
        waiting: "Определяем местоположение…",
        move: "Пройдите несколько шагов — направление определится по GPS.",
        course: "По GPS: стрелка вверх — идти прямо, вбок — повернуть туда.",
        compass: "Направление по компасу телефона — держите его ровно.",
        enableCompass: "Включить компас",
        dirText: function (dir, dist) { return "Вход: " + dir + ", " + dist; },
        // Постоянное уведомление Android на всё время записи.
        bgTitle: "Записываем путь назад",
        bgMessage: "Ведём тропинку к точке входа, пока экран погашен",
      }
    : {
        title: "Return to entry point",
        offline: "OFFLINE",
        offlineNote: "You are currently offline — everything works without internet.",
        distance: "To entry point",
        duration: "On the walk",
        startPrompt: "Pick the start point on the map you need to get back to: tap the map or use your location. The arrow will show the direction.",
        start: "Way Back",
        finish: "I'm back from outdoors",
        geoError: "Could not determine your location. Check GPS permission.",
        locate: "My location",
        layerTrails: "Trails",
        layerSatellite: "Satellite",
        openApp: "Open the app",
        waiting: "Determining your location…",
        move: "Walk a few steps — we'll detect your direction from GPS.",
        course: "From GPS: arrow up means go straight, sideways means turn that way.",
        compass: "Direction from the phone compass — hold the phone flat.",
        enableCompass: "Enable compass",
        dirText: function (dir, dist) { return "Entry point: " + dir + ", " + dist; },
        // Постоянное уведомление Android на всё время записи.
        bgTitle: "Recording your way back",
        bgMessage: "Keeps the trail to your entry point while the screen is off",
      };

  function $(id) { return document.getElementById(id); }

  function applyStrings() {
    $("t-title").textContent = T.title;
    $("t-offline").textContent = T.offline;
    $("t-offlineNote").textContent = T.offlineNote;
    $("t-distance").textContent = T.distance;
    $("t-duration").textContent = T.duration;
    $("t-startPrompt").textContent = T.startPrompt;
    $("startBtn").textContent = T.start;
    $("finishBtn").textContent = T.finish;
    $("openApp").textContent = T.openApp;
    $("enableCompass").textContent = T.enableCompass;
    $("locateBtn").setAttribute("aria-label", T.locate);
    $("locateBtn").setAttribute("title", T.locate);
    $("layerTrails").textContent = T.layerTrails;
    $("layerSatellite").textContent = T.layerSatellite;
    $("dir").textContent = T.waiting;
    $("hint").textContent = T.move;
    document.documentElement.lang = RU ? "ru" : "en";
  }

  /* ------------------------- Гео-математика ------------------------- */

  var R = 6371000;
  function toRad(d) { return (d * Math.PI) / 180; }
  function haversineM(a, b) {
    var dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
    var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(s));
  }
  function bearingDeg(a, b) {
    var f1 = toRad(a.lat), f2 = toRad(b.lat), dl = toRad(b.lng - a.lng);
    var y = Math.sin(dl) * Math.cos(f2);
    var x = Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl);
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  }
  function courseOverGround(samples) {
    if (samples.length < 2) return null;
    var cur = samples[samples.length - 1];
    for (var i = samples.length - 2; i >= 0; i--) {
      if (haversineM(samples[i], cur) >= MIN_COURSE_DISTANCE_M) return bearingDeg(samples[i], cur);
    }
    return null;
  }
  function smoothAngle(prev, next, factor) {
    if (prev == null || isNaN(prev)) return next;
    var diff = ((next - prev + 540) % 360) - 180;
    return (((prev + diff * (factor || 0.35)) % 360) + 360) % 360;
  }
  function compassDir(b) {
    var d = ["n", "ne", "e", "se", "s", "sw", "w", "nw"];
    return d[Math.round((((b % 360) + 360) % 360) / 45) % 8];
  }
  function fmtDist(m) {
    if (m == null) return "—";
    if (m < 1000) return Math.round(m) + (RU ? " м" : " m");
    return (m / 1000).toFixed(1) + (RU ? " км" : " km");
  }

  /* ------------------------- Хранилище ------------------------- */

  function loadTrack() {
    return new Promise(function (resolve) {
      if (Cap && Cap.Plugins && Cap.Plugins.Preferences) {
        Cap.Plugins.Preferences.get({ key: ACTIVE_TRACK_KEY })
          .then(function (r) {
            if (r && r.value) { try { resolve(JSON.parse(r.value)); return; } catch (e) {} }
            resolveLocal(resolve);
          })
          .catch(function () { resolveLocal(resolve); });
      } else {
        resolveLocal(resolve);
      }
    });
  }
  function resolveLocal(resolve) {
    try { var raw = localStorage.getItem(ACTIVE_TRACK_KEY); resolve(raw ? JSON.parse(raw) : null); }
    catch (e) { resolve(null); }
  }
  function saveTrack(track) {
    var json = JSON.stringify(track);
    if (Cap && Cap.Plugins && Cap.Plugins.Preferences) {
      Cap.Plugins.Preferences.set({ key: ACTIVE_TRACK_KEY, value: json }).catch(function () {});
    }
    try { localStorage.setItem(ACTIVE_TRACK_KEY, json); } catch (e) {}
  }
  function clearTrackStore() {
    if (Cap && Cap.Plugins && Cap.Plugins.Preferences) {
      Cap.Plugins.Preferences.remove({ key: ACTIVE_TRACK_KEY }).catch(function () {});
    }
    try { localStorage.removeItem(ACTIVE_TRACK_KEY); } catch (e) {}
  }

  function remoteUrl(source, coords) {
    var s = source.subs[(coords.x + coords.y) % source.subs.length];
    return source.url.replace("{s}", s).replace("{z}", coords.z).replace("{x}", coords.x).replace("{y}", coords.y);
  }

  function base64FromBlob(blob) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onloadend = function () { var s = String(r.result); res(s.slice(s.indexOf(",") + 1)); };
      r.onerror = rej;
      r.readAsDataURL(blob);
    });
  }

  /**
   * Срок на скачивание одного тайла. `navigator.onLine` в лесу врёт чаще, чем
   * говорит правду: сеть «есть» (регистрация в соте), а данные не идут — и
   * тогда `fetch` не отваливается сам, а висит, пока держится сокет. Тайл,
   * который ждёт этого, не показывает ни картинки, ни родителя: у Leaflet он
   * так и остаётся незавершённым, и на карте вместо местности серая клетка.
   */
  var TILE_FETCH_MS = 8000;

  function fetchWithDeadline(url, ms) {
    var ctrl = typeof AbortController === "function" ? new AbortController() : null;
    var request = fetch(url, ctrl ? { signal: ctrl.signal } : undefined);
    // Срок и обрывает запрос (чтобы не держал сокет), и отвечает за исход —
    // отмена в старых WebView может не отклонить промис.
    return withDeadline(request, ms).catch(function (e) {
      if (ctrl) { try { ctrl.abort(); } catch (ignored) {} }
      throw e;
    });
  }

  // Автокеш: скачивает тайл, сохраняет в Filesystem и отдаёт локальный URL.
  // Любой сбой — сети, срока, записи — откатывает на прямую ссылку: показать
  // тайл из сети всё ещё лучше, чем не показать ничего, а следующий заход
  // попробует закешировать его снова.
  function cacheAndResolve(path, remote) {
    return fetchWithDeadline(remote, TILE_FETCH_MS)
      .then(function (resp) { if (!resp.ok) throw 0; return resp.blob(); })
      .then(function (blob) {
        return base64FromBlob(blob).then(function (b64) {
          return Cap.Plugins.Filesystem.writeFile({ path: path, directory: "DATA", data: b64, recursive: true })
            .then(function () { return Cap.Plugins.Filesystem.getUri({ path: path, directory: "DATA" }); })
            .then(function (r) { return Cap.convertFileSrc ? Cap.convertFileSrc(r.uri) : r.uri; });
        });
      })
      .catch(function () { return remote; });
  }

  // Детальный слой: локальный тайл → (онлайн) докешируем из сети → иначе пусто.
  function resolveTile(source, coords) {
    var path = TILE_DIR + "/" + source.id + "/" + coords.z + "/" + coords.x + "/" + coords.y + ".png";
    var remote = navigator.onLine ? remoteUrl(source, coords) : null;
    if (Cap && Cap.Plugins && Cap.Plugins.Filesystem) {
      return Cap.Plugins.Filesystem.stat({ path: path, directory: "DATA" })
        .then(function () { return Cap.Plugins.Filesystem.getUri({ path: path, directory: "DATA" }); })
        .then(function (r) { return Cap.convertFileSrc ? Cap.convertFileSrc(r.uri) : r.uri; })
        .catch(function () { return remote ? cacheAndResolve(path, remote) : null; });
    }
    return Promise.resolve(remote);
  }

  /* ---------------- Фолбэк ближайшего родительского тайла ---------------- */

  // Насколько уровней вверх ищем родителя: 2^6 = 64-кратное увеличение — предел
  // читаемости; дальше карта не лучше зашитого basemap.
  var MAX_FALLBACK_DZ = 6;

  // Ищет вверх по пирамиде ближайший сохранённый офлайн тайл (скачанный регион
  // или автокеш). Возвращает { url, dz, px, py } либо null.
  function resolveParentTile(source, coords) {
    if (!(Cap && Cap.Plugins && Cap.Plugins.Filesystem)) return Promise.resolve(null);
    function attempt(dz) {
      if (dz > MAX_FALLBACK_DZ || coords.z - dz < 0) return Promise.resolve(null);
      var px = coords.x >> dz, py = coords.y >> dz;
      var path = TILE_DIR + "/" + source.id + "/" + (coords.z - dz) + "/" + px + "/" + py + ".png";
      return Cap.Plugins.Filesystem.stat({ path: path, directory: "DATA" })
        .then(function () { return Cap.Plugins.Filesystem.getUri({ path: path, directory: "DATA" }); })
        .then(function (r) {
          return { url: Cap.convertFileSrc ? Cap.convertFileSrc(r.uri) : r.uri, dz: dz, px: px, py: py };
        })
        .catch(function () { return attempt(dz + 1); });
    }
    return attempt(1);
  }

  // Вырезает из родительского тайла фрагмент, соответствующий coords, и
  // растягивает его до полного тайла. Так на пешеходных зумах вместо белого
  // поля виден увеличенный (пусть и менее чёткий) кусок ближайшей карты.
  function upscaleFromParent(coords, hit) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        try {
          var size = 256;
          var scale = Math.pow(2, hit.dz);
          var frac = img.width / scale;
          var sx = (coords.x - hit.px * scale) * frac;
          var sy = (coords.y - hit.py * scale) * frac;
          var canvas = document.createElement("canvas");
          canvas.width = size; canvas.height = size;
          var ctx = canvas.getContext("2d");
          ctx.imageSmoothingEnabled = true;
          ctx.drawImage(img, sx, sy, frac, frac, 0, 0, size, size);
          resolve(canvas.toDataURL("image/png"));
        } catch (e) { reject(e); }
      };
      img.onerror = reject;
      img.src = hit.url;
    });
  }

  /* ------------------------- Геолокация ------------------------- */

  function geoPlugin() {
    return Cap && Cap.Plugins && Cap.Plugins.Geolocation ? Cap.Plugins.Geolocation : null;
  }

  // Явно просим нативное разрешение до первого замера: без этого на iOS
  // getCurrentPosition может сразу упасть, если системный диалог ещё не был показан.
  function requestGeoPermission() {
    var geo = geoPlugin();
    if (geo && typeof geo.requestPermissions === "function") {
      return geo.requestPermissions().catch(function () {});
    }
    return Promise.resolve();
  }

  /* --- Обычный watch: живёт, только пока страница на экране --- */

  var plainWatchId = null;
  var browserWatchId = null;

  function startPlainWatch(onPos) {
    if (plainWatchId != null || browserWatchId != null) return;
    var geo = geoPlugin();
    if (geo) {
      try {
        plainWatchId = geo.watchPosition({ enableHighAccuracy: true }, function (pos) {
          if (pos && pos.coords) onPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        });
        return;
      } catch (e) {}
    }
    if (navigator.geolocation) {
      browserWatchId = navigator.geolocation.watchPosition(
        function (p) { onPos({ lat: p.coords.latitude, lng: p.coords.longitude }); },
        function () {},
        { enableHighAccuracy: true, maximumAge: 5000 },
      );
    }
  }

  /* --- Фоновая запись: продолжается со свёрнутым приложением --- */

  /**
   * Сдвиг, после которого плагин отдаёт координату: выше порога расчёта курса
   * (12 м) и ниже порога записи точки (20 м) — те же числа, что на сайте.
   */
  var BACKGROUND_DISTANCE_FILTER_M = 10;

  var backgroundOn = false;
  var backgroundAvailable = null;

  function bgPlugin() {
    return Cap && Cap.Plugins && Cap.Plugins.BackgroundGeolocation
      ? Cap.Plugins.BackgroundGeolocation
      : null;
  }

  function trackService() {
    return Cap && Cap.Plugins && Cap.Plugins.WayBackTrack ? Cap.Plugins.WayBackTrack : null;
  }

  /**
   * Своя служба, если она есть в этой оболочке. В отличие от плагина, здесь
   * можно честно узнать, поднялась ли она, и остаться на обычном watch, если
   * нет: start подтверждает лишь приём команды, а работает служба или нет,
   * спрашиваем у неё самой.
   */
  function confirmService(svc, status, left) {
    if (status && (status.running || status.failure)) return Promise.resolve(status);
    if (left <= 0) return Promise.resolve(status || {});
    return new Promise(function (done) { setTimeout(done, 300); })
      .then(function () { return svc.status(); })
      .catch(function () { return status; })
      .then(function (next) { return confirmService(svc, next, left - 1); });
  }

  function launchService(onPos) {
    var svc = trackService();
    if (!svc) return Promise.resolve(false);
    return svc.removeAllListeners()
      .catch(function () {})
      .then(function () {
        svc.onLocation(function (loc) {
          if (loc && typeof loc.latitude === "number") {
            onPos({ lat: loc.latitude, lng: loc.longitude });
          }
        });
        return svc.start({
          title: T.bgTitle,
          message: T.bgMessage,
          distanceFilter: BACKGROUND_DISTANCE_FILTER_M,
        });
      })
      .then(function (accepted) { return confirmService(svc, accepted, 12); })
      .then(function (status) {
        if (!status || !status.running) {
          svc.stop().catch(function () {});
          return false;
        }
        backgroundOn = true;
        // Разрешение на уведомления спрашиваем после старта и не дожидаясь
        // ответа: служба уже пишет путь, а диалог человек читает секунды.
        if (status.notifications === false) {
          svc.requestNotifications().catch(function () {});
        }
        return true;
      })
      .catch(function () { return false; });
  }

  /**
   * Плагина нет в оболочках, собранных до появления фоновой записи. Прокси
   * вызова есть всегда, поэтому спрашиваем самый дешёвый метод: ответил —
   * нативная часть на месте.
   */
  function probeBackground() {
    if (backgroundAvailable) return Promise.resolve(true);
    var bg = bgPlugin();
    if (!bg) return Promise.resolve(false);
    // Кешируем только удачу: нативная часть либо есть в бинарнике, либо нет,
    // но провалиться проверка может и по случайности (мост ещё не поднят на
    // самом первом обращении), а запомненный отказ означал бы поход без
    // фоновой записи до перезапуска приложения.
    return bg.getPluginVersion()
      .then(function () { backgroundAvailable = true; return true; })
      .catch(function () { return false; });
  }

  function launchBackground(onPos, retry) {
    var bg = bgPlugin();
    if (!bg) return;
    try {
      bg.start(
        {
          backgroundTitle: T.bgTitle,
          backgroundMessage: T.bgMessage,
          requestPermissions: true,
          distanceFilter: BACKGROUND_DISTANCE_FILTER_M,
          stale: false,
        },
        function (loc) {
          if (loc && typeof loc.latitude === "number") {
            onPos({ lat: loc.latitude, lng: loc.longitude });
            return;
          }
          // Ошибка старта. Самая частая — служба уже поднята приложением, а её
          // колбэк остался в прежнем контексте: глушим и пробуем один раз ещё.
          backgroundOn = false;
          if (retry) return;
          bg.stop()
            .catch(function () {})
            .then(function () { launchBackground(onPos, true); });
        },
      );
      // Оптимистично: bg.start отвечает идентификатором колбэка сразу и не
      // отклоняется, когда служба не поднялась. Поэтому обычный watch отсюда
      // не снимаем — он основа записи, а фон к нему добавка.
      backgroundOn = true;
    } catch (e) {
      backgroundOn = false;
    }
  }

  /**
   * Приводит источники координат к состоянию похода. Обычный watch работает
   * всегда, пока страница на экране: он не зависит ни от чего и без него
   * запись не идёт вовсе. Фоновая служба — добавка на время похода, она пишет
   * с погашенным экраном и держит постоянное уведомление Android.
   *
   * Раньше здесь был выбор «фон ИЛИ обычный», и любая осечка фона оставляла
   * поход без единой точки — в оболочках без плагина запись не начиналась
   * совсем. Так эта ловушка уже один раз сломала запись на сайте.
   */
  function syncWatch(onPos) {
    startPlainWatch(onPos);
    if (!track) {
      if (backgroundOn) {
        backgroundOn = false;
        var svc = trackService();
        if (svc) svc.stop().catch(function () {});
        var bg = bgPlugin();
        if (bg) bg.stop().catch(function () {});
      }
      return;
    }
    if (backgroundOn) return;
    launchService(onPos).then(function (started) {
      if (started || !track || backgroundOn) return;
      // Своей службы в этой оболочке нет — остаётся плагин.
      probeBackground().then(function (ok) {
        if (!ok || !track || backgroundOn) return;
        launchBackground(onPos, false);
      });
    });
  }

  /* ------------------------- Карта ------------------------- */

  // Детальный слой: скачанные/докешированные тайлы; если нужного зума нет —
  // увеличенный фрагмент ближайшего родительского тайла; прозрачно, если нет
  // вообще ничего (тогда просвечивает basemap). Источник (тропы/спутник) —
  // в options.sfSource.
  var OfflineLayer = L.TileLayer.extend({
    createTile: function (coords, done) {
      var source = this.options.sfSource || SOURCES.outdoor;
      var tile = document.createElement("img");
      tile.setAttribute("role", "presentation");
      tile.alt = "";

      var finished = false;
      var triedParent = false;
      function finish() {
        if (finished) return;
        finished = true;
        done(null, tile);
      }
      function show(src) {
        tile.onload = finish;
        tile.onerror = function () {
          if (src !== BLANK_TILE && !triedParent) tryParent();
          else finish();
        };
        tile.src = src;
      }
      function tryParent() {
        triedParent = true;
        resolveParentTile(source, coords)
          .then(function (hit) {
            if (!hit) { show(BLANK_TILE); return null; }
            // Срок и здесь: пока фрагмент родителя не вырезан, тайл у Leaflet
            // остаётся незавершённым, а незавершённые тайлы он не заменяет.
            return withDeadline(upscaleFromParent(coords, hit), BRIDGE_MS).then(show);
          })
          .catch(function () { show(BLANK_TILE); });
      }

      resolveTile(source, coords)
        .then(function (url) { if (url) show(url); else tryParent(); })
        .catch(tryParent);
      return tile;
    },
  });

  // Базовый слой: обзорные тайлы, зашитые в приложение (./basemap, z0–5).
  // Leaflet растягивает их на все зумы — карта никогда не пустая.
  var BaseLayer = L.TileLayer.extend({
    createTile: function (coords, done) {
      var tile = document.createElement("img");
      tile.setAttribute("role", "presentation");
      tile.alt = "";
      tile.onload = function () { done(null, tile); };
      tile.onerror = function () { tile.src = BLANK_TILE; done(null, tile); };
      tile.src = "./basemap/" + coords.z + "/" + coords.x + "/" + coords.y + ".png";
      return tile;
    },
  });

  // Зелёный точки входа — тот же #5fb573, что у действий в тёмной схеме; синий
  // «вы здесь» оставлен: это привычная конвенция карт, а не брендовый цвет.
  // Кольцо маркеров — цвет холста #0b120d: на светлых растровых тайлах он даёт
  // чёткий край (15.9:1), а на тёмной заглушке карты не светится заплаткой.
  var anchorIcon = L.divIcon({
    className: "",
    html: '<div style="width:30px;height:30px;background:#5fb573;border:3px solid #0b120d;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,.55)"></div>',
    iconSize: [30, 30], iconAnchor: [15, 15],
  });
  var currentIcon = L.divIcon({
    className: "",
    html: '<div style="width:20px;height:20px;background:#3b82f6;border:3px solid #0b120d;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,.55)"></div>',
    iconSize: [20, 20], iconAnchor: [10, 10],
  });

  /* ------------------------- Состояние ------------------------- */

  var track = null;
  var map = null;
  var pathLine = null;
  var returnLine = null;
  var currentMarker = null;
  var anchorMarker = null;
  var current = null;
  var course = null;
  var heading = null;
  var samples = [];
  var lastCourseAt = 0;
  var centeredOnUser = false;
  var picked = null;
  var pickMarker = null;

  function pathLatLngs() {
    var pts = [[track.anchor.lat, track.anchor.lng]];
    for (var i = 0; i < track.points.length; i++) pts.push([track.points[i].lat, track.points[i].lng]);
    if (current) pts.push([current.lat, current.lng]);
    return pts;
  }

  function onPosition(pos) {
    var now = Date.now();
    current = { lat: pos.lat, lng: pos.lng, t: now };

    // Пока похода нет — активируем Way Back и один раз центрируем карту.
    if (!track) {
      updateStartButton();
      if (map && !centeredOnUser) { centeredOnUser = true; map.setView([pos.lat, pos.lng], 15); }
      return;
    }

    // Запись точки пути с фильтром шума.
    var last = track.points.length ? track.points[track.points.length - 1] : track.anchor;
    if (haversineM(last, pos) >= MIN_POINT_DISTANCE_M) {
      track.points.push({ lat: pos.lat, lng: pos.lng, t: now });
      saveTrack(track);
    }

    // Курс движения по GPS.
    samples.push({ lat: pos.lat, lng: pos.lng, t: now });
    var cutoff = now - MAX_COURSE_AGE_MS;
    while (samples.length > 40 || (samples.length > 2 && samples[0].t < cutoff)) samples.shift();
    var cog = courseOverGround(samples);
    if (cog != null) { lastCourseAt = now; course = smoothAngle(course, cog); }
    else if (now - lastCourseAt > COURSE_STALE_MS) course = null;

    render();
  }

  function render() {
    if (!map || !track || !current) return;

    if (!currentMarker) currentMarker = L.marker([current.lat, current.lng], { icon: currentIcon }).addTo(map);
    else currentMarker.setLatLng([current.lat, current.lng]);

    // Пройденный путь — синий, как маркер «вы здесь»; пунктир напрямую к
    // точке входа — зелёный, как её маркер.
    if (!pathLine) pathLine = L.polyline(pathLatLngs(), { color: "#3b82f6", weight: 5, opacity: 0.95, lineCap: "round" }).addTo(map);
    else pathLine.setLatLngs(pathLatLngs());

    var rl = [[current.lat, current.lng], [track.anchor.lat, track.anchor.lng]];
    if (!returnLine) returnLine = L.polyline(rl, { color: "#5fb573", weight: 4, opacity: 0.9, dashArray: "8 10" }).addTo(map);
    else returnLine.setLatLngs(rl);

    var dist = haversineM(current, track.anchor);
    var bearing = bearingDeg(current, track.anchor);
    var ref = course != null ? course : heading;

    $("distance").textContent = fmtDist(dist);
    $("dir").textContent = T.dirText(DIRS[compassDir(bearing)], fmtDist(dist));
    $("hint").textContent = course != null ? T.course : heading != null ? T.compass : T.move;

    if (ref != null) {
      $("arrow").style.transform = "rotate(" + (bearing - ref) + "deg)";
    } else {
      $("arrow").style.transform = "rotate(0deg)";
    }
  }

  function tickDuration() {
    if (!track) return;
    var min = Math.max(0, Math.floor((Date.now() - track.startedAt) / 60000));
    $("duration").textContent = Math.floor(min / 60) + ":" + String(min % 60).padStart(2, "0");
  }

  /* ------------------------- Режимы (старт/поход) ------------------------- */

  function refreshMapSize() {
    if (map) setTimeout(function () { map.invalidateSize(); }, 60);
  }

  function showActiveMode() {
    $("active").classList.remove("hidden");
    $("startPane").classList.add("hidden");
    $("startBtn").classList.add("hidden");
    $("finishBtn").classList.remove("hidden");
    refreshMapSize();
  }

  function showStartMode() {
    $("active").classList.add("hidden");
    $("startPane").classList.remove("hidden");
    $("startBtn").classList.remove("hidden");
    $("finishBtn").classList.add("hidden");
    updateStartButton();
    refreshMapSize();
  }

  /** Way Back активна, когда есть точка старта: своя геолокация или тап по карте. */
  function updateStartButton() {
    $("startBtn").disabled = !(picked || current);
  }

  function drawAnchor() {
    if (!track) return;
    if (anchorMarker) map.removeLayer(anchorMarker);
    anchorMarker = L.marker([track.anchor.lat, track.anchor.lng], { icon: anchorIcon }).addTo(map);
  }

  /**
   * Старт похода от заданной точки. alsoCurrent=true, когда точка получена по
   * GPS (она же — текущая позиция); при ручной точке текущую позицию не
   * подменяем — её принесёт watchPosition, когда GPS появится.
   */
  function beginTrack(pos, alsoCurrent) {
    track = { anchor: { lat: pos.lat, lng: pos.lng, t: Date.now() }, points: [], startedAt: Date.now() };
    saveTrack(track);
    samples = []; course = null; lastCourseAt = 0;
    if (alsoCurrent) current = { lat: pos.lat, lng: pos.lng, t: Date.now() };
    showActiveMode();
    drawAnchor();
    map.setView([pos.lat, pos.lng], 16);
    render();
    tickDuration();
    // Поход начался — переводим запись в фон, чтобы она не оборвалась, когда
    // телефон уедет в карман.
    syncWatch(onPosition);
  }

  /**
   * Way Back: стартуем от ручной точки (приоритет — человек поставил её
   * осознанно, например уже потерявшись) либо от своей геолокации.
   */
  function startWayback() {
    var pos = picked || current;
    if (!pos) return;
    var fromGps = !picked;
    if (pickMarker) { map.removeLayer(pickMarker); pickMarker = null; }
    picked = null;
    beginTrack(pos, fromGps);
  }

  /* --------------------- Точка старта тапом по карте --------------------- */

  function onMapClick(e) {
    if (track) return;
    picked = { lat: e.latlng.lat, lng: e.latlng.lng };
    if (!pickMarker) pickMarker = L.marker([picked.lat, picked.lng], { icon: anchorIcon }).addTo(map);
    else pickMarker.setLatLng([picked.lat, picked.lng]);
    updateStartButton();
  }

  /* --------------------- Центрирование по геолокации --------------------- */

  function locateMe() {
    if (current) { map.setView([current.lat, current.lng], 16); return; }
    var btn = $("locateBtn");
    btn.disabled = true;
    getCurrentPositionOnce()
      .then(function (p) {
        current = { lat: p.lat, lng: p.lng, t: Date.now() };
        updateStartButton();
        map.setView([p.lat, p.lng], 16);
        btn.disabled = false;
      })
      .catch(function () {
        btn.disabled = false;
        alert(T.geoError);
      });
  }

  function finishWayback() {
    clearTrackStore();
    track = null;
    current = null;
    course = null;
    heading = null;
    samples = [];
    centeredOnUser = false;
    if (pathLine) { map.removeLayer(pathLine); pathLine = null; }
    if (returnLine) { map.removeLayer(returnLine); returnLine = null; }
    if (currentMarker) { map.removeLayer(currentMarker); currentMarker = null; }
    if (anchorMarker) { map.removeLayer(anchorMarker); anchorMarker = null; }
    if (pickMarker) { map.removeLayer(pickMarker); pickMarker = null; }
    picked = null;
    showStartMode();
    $("distance").textContent = "—";
    $("duration").textContent = "0:00";
    // Поход закрыт — глушим фоновую службу и снимаем постоянное уведомление.
    syncWatch(onPosition);
  }

  function browserPositionOnce() {
    return new Promise(function (resolve, reject) {
      if (!navigator.geolocation) { reject(new Error("no geolocation")); return; }
      navigator.geolocation.getCurrentPosition(
        function (p) { resolve({ lat: p.coords.latitude, lng: p.coords.longitude }); },
        reject,
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 },
      );
    });
  }

  // Плагин (с явным запросом разрешения и щедрым таймаутом на холодный GPS) →
  // при неудаче браузерный API → иначе ошибка.
  function getCurrentPositionOnce() {
    var geo = geoPlugin();
    if (geo) {
      return requestGeoPermission()
        .then(function () {
          return geo.getCurrentPosition({ enableHighAccuracy: true, timeout: 30000, maximumAge: 60000 });
        })
        .then(function (p) { return { lat: p.coords.latitude, lng: p.coords.longitude }; })
        .catch(function () { return browserPositionOnce(); });
    }
    return browserPositionOnce();
  }

  /* ------------------------- Компас ------------------------- */

  function enableCompass() {
    var DOE = window.DeviceOrientationEvent;
    function attach() {
      function handler(e) {
        var h = typeof e.webkitCompassHeading === "number"
          ? e.webkitCompassHeading
          : e.absolute && e.alpha != null ? (360 - e.alpha) % 360 : null;
        if (h != null && !isNaN(h)) { heading = h; render(); }
      }
      window.addEventListener("deviceorientationabsolute", handler);
      window.addEventListener("deviceorientation", handler);
      $("enableCompass").classList.add("hidden");
    }
    if (DOE && typeof DOE.requestPermission === "function") {
      DOE.requestPermission().then(function (r) { if (r === "granted") attach(); }).catch(function () {});
    } else {
      attach();
    }
  }

  /* ------------------------- Инициализация ------------------------- */

  function initMap(center) {
    map = L.map("map", { zoomControl: true, attributionControl: false }).setView(
      center || [20, 0],
      center ? 15 : 2,
    );
    // Базовый обзорный слой (всегда виден) + детальный поверх. Детальный при
    // онлайне и приближении подгружает нативные тайлы до z18 (все дорожки).
    new BaseLayer("", { maxNativeZoom: 5, maxZoom: 19 }).addTo(map);
    detailLayers.outdoor = new OfflineLayer("", {
      maxNativeZoom: 18, maxZoom: 19, sfSource: SOURCES.outdoor,
    }).addTo(map);
    detailLayers.satellite = new OfflineLayer("", {
      maxNativeZoom: 18, maxZoom: 19, sfSource: SOURCES.satellite,
    });
    // Тап по карте ставит стартовую точку (пока поход не начат).
    map.on("click", onMapClick);
  }

  /* --------------- Переключатель слоя: Тропы / Спутник --------------- */

  var detailLayers = { outdoor: null, satellite: null };
  var activeLayerId = "outdoor";

  function setLayer(id) {
    if (!map || !detailLayers[id] || id === activeLayerId) return;
    map.removeLayer(detailLayers[activeLayerId]);
    map.addLayer(detailLayers[id]);
    activeLayerId = id;
    $("layerTrails").setAttribute("aria-pressed", String(id === "outdoor"));
    $("layerSatellite").setAttribute("aria-pressed", String(id === "satellite"));
  }

  function start() {
    // Прячем нативный splash сразу: страница уже брендовая тёмная, и никакая
    // ошибка ниже не должна оставить пользователя на «вечной» заставке.
    hideNativeSplash();
    applyStrings();
    $("openApp").addEventListener("click", function () { window.location.href = APP_URL; });
    $("enableCompass").addEventListener("click", enableCompass);
    $("enableCompass").classList.remove("hidden");
    $("startBtn").addEventListener("click", startWayback);
    $("locateBtn").addEventListener("click", locateMe);
    $("layerTrails").addEventListener("click", function () { setLayer("outdoor"); });
    $("layerSatellite").addEventListener("click", function () { setLayer("satellite"); });
    $("finishBtn").addEventListener("click", finishWayback);

    loadTrack().then(function (loaded) {
      var hasTrack = loaded && loaded.anchor;
      if (hasTrack) {
        track = loaded;
        if (!Array.isArray(track.points)) track.points = [];
        initMap([track.anchor.lat, track.anchor.lng]);
        showActiveMode();
        drawAnchor();
        var pts = pathLatLngs();
        if (pts.length > 1) map.fitBounds(pts, { padding: [40, 40], maxZoom: 17 });
        render();
        tickDuration();
      } else {
        initMap(null);
        showStartMode();
      }
      setInterval(tickDuration, 30000);
      syncWatch(onPosition);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
