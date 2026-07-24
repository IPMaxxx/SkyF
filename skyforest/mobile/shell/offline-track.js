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
 *  - позиция — через Capacitor Geolocation (watchPosition), с браузерным
 *    fallback для отладки.
 *
 * Гео-формулы — мини-копия src/lib/trackGeo.ts (тот модуль в сборку сюда не
 * попадает).
 */
(function () {
  "use strict";

  var Cap = window.Capacitor;
  var ACTIVE_TRACK_KEY = "sf_active_track";
  var TILE_DIR = "sf-tiles";
  var SOURCE_ID = "outdoor";
  var OUTDOOR_URL =
    "https://{s}.tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey=1faca5b7ed0d462b8630f4c3ec1acbcb";
  var SUBS = ["a", "b", "c"];
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
        offline: "Офлайн",
        distance: "До входа",
        duration: "В лесу",
        startPrompt: "Отметьте точку входа в лес — покажем направление и расстояние обратно. Работает без интернета.",
        start: "Я вошёл в лес",
        starting: "Определяем местоположение…",
        finish: "Я вышел из леса",
        geoError: "Не удалось определить местоположение. Проверьте разрешение на геолокацию.",
        openApp: "Открыть приложение",
        waiting: "Определяем местоположение…",
        move: "Пройдите несколько шагов — направление определится по GPS.",
        course: "По GPS: стрелка вверх — идти прямо, вбок — повернуть туда.",
        compass: "Направление по компасу телефона — держите его ровно.",
        enableCompass: "Включить компас",
        dirText: function (dir, dist) { return "Вход: " + dir + ", " + dist; },
      }
    : {
        title: "Return to entry point",
        offline: "Offline",
        distance: "To entry point",
        duration: "In forest",
        startPrompt: "Mark where you entered the forest — we'll show the direction and distance back. Works without internet.",
        start: "I'm entering the forest",
        starting: "Getting your location…",
        finish: "I'm out of the forest",
        geoError: "Could not determine your location. Check GPS permission.",
        openApp: "Open the app",
        waiting: "Determining your location…",
        move: "Walk a few steps — we'll detect your direction from GPS.",
        course: "From GPS: arrow up means go straight, sideways means turn that way.",
        compass: "Direction from the phone compass — hold the phone flat.",
        enableCompass: "Enable compass",
        dirText: function (dir, dist) { return "Entry point: " + dir + ", " + dist; },
      };

  function $(id) { return document.getElementById(id); }

  function applyStrings() {
    $("t-title").textContent = T.title;
    $("t-offline").textContent = T.offline;
    $("t-distance").textContent = T.distance;
    $("t-duration").textContent = T.duration;
    $("t-startPrompt").textContent = T.startPrompt;
    $("startBtn").textContent = T.start;
    $("finishBtn").textContent = T.finish;
    $("openApp").textContent = T.openApp;
    $("enableCompass").textContent = T.enableCompass;
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

  function remoteUrl(coords) {
    var s = SUBS[(coords.x + coords.y) % SUBS.length];
    return OUTDOOR_URL.replace("{s}", s).replace("{z}", coords.z).replace("{x}", coords.x).replace("{y}", coords.y);
  }

  function base64FromBlob(blob) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onloadend = function () { var s = String(r.result); res(s.slice(s.indexOf(",") + 1)); };
      r.onerror = rej;
      r.readAsDataURL(blob);
    });
  }

  // Автокеш: скачивает тайл, сохраняет в Filesystem и отдаёт локальный URL.
  function cacheAndResolve(path, remote) {
    return fetch(remote)
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
  function resolveTile(coords) {
    var path = TILE_DIR + "/" + SOURCE_ID + "/" + coords.z + "/" + coords.x + "/" + coords.y + ".png";
    var remote = navigator.onLine ? remoteUrl(coords) : null;
    if (Cap && Cap.Plugins && Cap.Plugins.Filesystem) {
      return Cap.Plugins.Filesystem.stat({ path: path, directory: "DATA" })
        .then(function () { return Cap.Plugins.Filesystem.getUri({ path: path, directory: "DATA" }); })
        .then(function (r) { return Cap.convertFileSrc ? Cap.convertFileSrc(r.uri) : r.uri; })
        .catch(function () { return remote ? cacheAndResolve(path, remote) : null; });
    }
    return Promise.resolve(remote);
  }

  /* ------------------------- Геолокация ------------------------- */

  function startWatch(onPos) {
    if (Cap && Cap.Plugins && Cap.Plugins.Geolocation) {
      try {
        return Cap.Plugins.Geolocation.watchPosition({ enableHighAccuracy: true }, function (pos) {
          if (pos && pos.coords) onPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        });
      } catch (e) {}
    }
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        function (p) { onPos({ lat: p.coords.latitude, lng: p.coords.longitude }); },
        function () {},
        { enableHighAccuracy: true, maximumAge: 5000 },
      );
    }
    return null;
  }

  /* ------------------------- Карта ------------------------- */

  // Детальный слой: скачанные/докешированные тайлы, прозрачно где нет.
  var OfflineLayer = L.TileLayer.extend({
    createTile: function (coords, done) {
      var tile = document.createElement("img");
      tile.setAttribute("role", "presentation");
      tile.alt = "";
      resolveTile(coords)
        .then(function (url) {
          var finalUrl = url || BLANK_TILE;
          tile.onload = function () { done(null, tile); };
          tile.onerror = function () { done(null, tile); };
          tile.src = finalUrl;
        })
        .catch(function () { tile.src = BLANK_TILE; done(null, tile); });
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

  var anchorIcon = L.divIcon({
    className: "",
    html: '<div style="width:30px;height:30px;background:#10b981;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,.35)"></div>',
    iconSize: [30, 30], iconAnchor: [15, 15],
  });
  var currentIcon = L.divIcon({
    className: "",
    html: '<div style="width:20px;height:20px;background:#3b82f6;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>',
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

  function pathLatLngs() {
    var pts = [[track.anchor.lat, track.anchor.lng]];
    for (var i = 0; i < track.points.length; i++) pts.push([track.points[i].lat, track.points[i].lng]);
    if (current) pts.push([current.lat, current.lng]);
    return pts;
  }

  function onPosition(pos) {
    var now = Date.now();
    current = { lat: pos.lat, lng: pos.lng, t: now };

    // Пока похода нет — один раз центрируем карту на пользователе.
    if (!track) {
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

    if (!pathLine) pathLine = L.polyline(pathLatLngs(), { color: "#166534", weight: 4, opacity: 0.9 }).addTo(map);
    else pathLine.setLatLngs(pathLatLngs());

    var rl = [[current.lat, current.lng], [track.anchor.lat, track.anchor.lng]];
    if (!returnLine) returnLine = L.polyline(rl, { color: "#10b981", weight: 4, opacity: 0.9, dashArray: "8 10" }).addTo(map);
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
    refreshMapSize();
  }

  function drawAnchor() {
    if (!track) return;
    if (anchorMarker) map.removeLayer(anchorMarker);
    anchorMarker = L.marker([track.anchor.lat, track.anchor.lng], { icon: anchorIcon }).addTo(map);
  }

  function startWayback() {
    var begin = function (pos) {
      track = { anchor: { lat: pos.lat, lng: pos.lng, t: Date.now() }, points: [], startedAt: Date.now() };
      saveTrack(track);
      samples = []; course = null; lastCourseAt = 0;
      current = { lat: pos.lat, lng: pos.lng, t: Date.now() };
      showActiveMode();
      drawAnchor();
      map.setView([pos.lat, pos.lng], 16);
      render();
      tickDuration();
    };
    $("startBtn").textContent = T.starting;
    $("startBtn").disabled = true;
    var reset = function () { $("startBtn").textContent = T.start; $("startBtn").disabled = false; };
    if (current) { begin(current); reset(); return; }
    getCurrentPositionOnce()
      .then(function (pos) { begin(pos); reset(); })
      .catch(function () { alert(T.geoError); reset(); });
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
    showStartMode();
    $("distance").textContent = "—";
    $("duration").textContent = "0:00";
  }

  function getCurrentPositionOnce() {
    return new Promise(function (resolve, reject) {
      if (Cap && Cap.Plugins && Cap.Plugins.Geolocation) {
        Cap.Plugins.Geolocation.getCurrentPosition({ enableHighAccuracy: true })
          .then(function (p) { resolve({ lat: p.coords.latitude, lng: p.coords.longitude }); })
          .catch(reject);
        return;
      }
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          function (p) { resolve({ lat: p.coords.latitude, lng: p.coords.longitude }); },
          reject,
          { enableHighAccuracy: true, timeout: 15000 },
        );
        return;
      }
      reject(new Error("no geolocation"));
    });
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
    // Базовый обзорный слой (всегда виден) + детальный поверх.
    new BaseLayer("", { maxNativeZoom: 5, maxZoom: 19 }).addTo(map);
    new OfflineLayer("", { maxNativeZoom: 16, maxZoom: 19 }).addTo(map);
  }

  function start() {
    applyStrings();
    $("openApp").addEventListener("click", function () { window.location.href = APP_URL; });
    $("enableCompass").addEventListener("click", enableCompass);
    $("enableCompass").classList.remove("hidden");
    $("startBtn").addEventListener("click", startWayback);
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
      startWatch(onPosition);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
