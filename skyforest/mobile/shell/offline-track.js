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
        empty:
          "Активный поход не найден. Откройте приложение при интернете и начните поход, чтобы пользоваться офлайн-возвратом.",
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
        empty:
          "No active trip found. Open the app while online and start a trip to use the offline return.",
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
    $("t-empty").textContent = T.empty;
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

  function resolveTile(coords) {
    var path = TILE_DIR + "/" + SOURCE_ID + "/" + coords.z + "/" + coords.x + "/" + coords.y + ".png";
    var remote = null;
    if (navigator.onLine) {
      var s = SUBS[(coords.x + coords.y) % SUBS.length];
      remote = OUTDOOR_URL.replace("{s}", s).replace("{z}", coords.z).replace("{x}", coords.x).replace("{y}", coords.y);
    }
    if (Cap && Cap.Plugins && Cap.Plugins.Filesystem) {
      return Cap.Plugins.Filesystem.stat({ path: path, directory: "DATA" })
        .then(function () { return Cap.Plugins.Filesystem.getUri({ path: path, directory: "DATA" }); })
        .then(function (r) { return Cap.convertFileSrc ? Cap.convertFileSrc(r.uri) : r.uri; })
        .catch(function () { return remote; });
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
  var current = null;
  var course = null;
  var heading = null;
  var samples = [];
  var lastCourseAt = 0;

  function pathLatLngs() {
    var pts = [[track.anchor.lat, track.anchor.lng]];
    for (var i = 0; i < track.points.length; i++) pts.push([track.points[i].lat, track.points[i].lng]);
    if (current) pts.push([current.lat, current.lng]);
    return pts;
  }

  function onPosition(pos) {
    var now = Date.now();
    current = { lat: pos.lat, lng: pos.lng, t: now };

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
    if (!map || !current) return;

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

  function initMap() {
    map = L.map("map", { zoomControl: true, attributionControl: false }).setView(
      [track.anchor.lat, track.anchor.lng],
      15,
    );
    new OfflineLayer("", { maxNativeZoom: 17, maxZoom: 19 }).addTo(map);
    L.marker([track.anchor.lat, track.anchor.lng], { icon: anchorIcon }).addTo(map);
    // Первичный фит по имеющимся точкам.
    var pts = pathLatLngs();
    if (pts.length > 1) map.fitBounds(pts, { padding: [40, 40], maxZoom: 17 });
  }

  function start() {
    applyStrings();
    $("openApp").addEventListener("click", function () { window.location.href = APP_URL; });
    $("enableCompass").addEventListener("click", enableCompass);
    $("enableCompass").classList.remove("hidden");

    loadTrack().then(function (loaded) {
      if (!loaded || !loaded.anchor) {
        $("empty").classList.remove("hidden");
        $("active").classList.add("hidden");
        return;
      }
      track = loaded;
      if (!Array.isArray(track.points)) track.points = [];
      $("empty").classList.add("hidden");
      $("active").classList.remove("hidden");
      initMap();
      render();
      tickDuration();
      setInterval(tickDuration, 30000);
      startWatch(onPosition);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
