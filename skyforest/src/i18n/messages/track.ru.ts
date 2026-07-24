/** /dashboard/track — возвращение к точке входа в лес */
export default {
  title: "Вернуться к точке входа",
  subtitle:
    "Отметьте место, где вы вошли в лес, — покажем направление и расстояние обратно, чтобы не потеряться.",

  startButton: "Я вошёл в лес",
  starting: "Определяем местоположение…",
  geoError:
    "Не удалось определить местоположение. Проверьте разрешение на геолокацию в настройках и попробуйте ещё раз.",

  howTitle: "Как это работает",
  how1: "Нажмите кнопку на опушке — мы запомним точку входа.",
  how2: "Пока приложение открыто, мы непрерывно записываем ваш путь на карте. В фоне точки не пишутся — такие участки показываем пунктиром.",
  how3: "Когда пора возвращаться, стрелка покажет направление и расстояние до точки входа.",
  offlineHint:
    "Работает без интернета: карта может не загрузиться, но стрелка и расстояние работают всегда. Данные хранятся только на этом устройстве.",

  distanceLabel: "До входа",
  durationLabel: "В лесу",
  activeSince: "с {time}",
  waitingGps: "Определяем местоположение…",

  compassEnable: "Включить компас",
  compassUnavailable:
    "Компас на этом устройстве недоступен — ориентируйтесь по стороне света и пунктиру на карте.",
  courseHint:
    "Направление по GPS: стрелка вверх — идти прямо, вбок — повернуть в ту сторону.",
  compassHint: "Направление по компасу телефона — держите телефон ровно.",
  moveToDetect: "Пройдите несколько шагов — определим направление движения по GPS.",
  movementLegend:
    "Синяя линия — куда вы идёте, изумрудный пунктир — на вход. Сводите синюю к пунктиру.",
  directionText: "Вход: {dir}, {dist}",
  dir: {
    n: "север",
    ne: "северо-восток",
    e: "восток",
    se: "юго-восток",
    s: "юг",
    sw: "юго-запад",
    w: "запад",
    nw: "северо-запад",
  },

  distM: "{value} м",
  distKm: "{value} км",

  anchorTitle: "Точка входа",
  fitAll: "Показать весь путь",
  gapHint: "Пунктир — участки без записи (приложение было в фоне).",
  mapLayerOutdoor: "Тропы (офлайн)",

  offlineMapTitle: "Офлайн-карта",
  offlineMapDesc:
    "Скачайте карту этого района, пока есть связь, — она продолжит работать в лесу без интернета.",
  offlineMapUseLocation: "Определить моё местоположение",
  offlineMapGettingLocation: "Определяем местоположение…",
  offlineMapRadius: "Радиус участка",
  offlineMapKm: "км",
  offlineMapMinimalQuality: "минимальное качество (обзор)",
  offlineMapOpenOnMap: "открыть на карте",
  offlineMapClosePreview: "Закрыть",
  offlineMapEstimate: "≈ {tiles} тайлов · {size}",
  offlineMapDownload: "Скачать этот участок",
  offlineMapDownloading: "Загрузка… {done}/{total}",
  offlineMapCancel: "Отмена",
  offlineMapSavedToast: "Участок сохранён для офлайна",
  offlineMapPartialToast: "Сохранено, пропущено тайлов: {failed} (сеть)",
  offlineMapErrorToast: "Не удалось скачать участок. Попробуйте ещё раз.",
  offlineMapStoredTitle: "Скачанные участки",
  offlineMapEmpty: "Пока нет офлайн-участков.",
  offlineMapRegionMeta: "{tiles} тайлов · {size}",
  offlineMapDelete: "Удалить",
  offlineMapDeletedToast: "Офлайн-участок удалён",

  finishButton: "Я вышел из леса",
  finishConfirmTitle: "Завершить поход?",
  finishConfirmBody: "Поход будет сохранён в историю, а активный трек — очищен.",
  finishConfirmYes: "Да, завершить",
  finishCancel: "Отмена",

  autoName: "Трек {date}",
  savedToast: "Поход сохранён в историю",
  savedLocalToast: "Поход сохранён на этом устройстве",

  historyTitle: "История",
  historyLocalBadge: "на этом устройстве",
  historyDelete: "Удалить трек",
  historyDeleted: "Трек удалён",
  historyDeleteError: "Не удалось удалить трек. Попробуйте ещё раз.",
} as const;
