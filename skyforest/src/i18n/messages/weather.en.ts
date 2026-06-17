/** /dashboard/weather page */
export default {
  mapLoading: "Loading map...",
  spendReasonWeather: "Weather check",
  spendReasonRainMap: "Rain map ({count} points)",
  insufficientTokens: "Not enough tokens",
  toastWeatherCharged: "Deducted {amount} tokens",
  toastRainCharged: "Deducted {amount} tokens",
  errorWeatherLoad: "Failed to load weather data",
  rainClickCenterSet: "Click the map to set the center point",
  rainTooManyPoints:
    "Too many points ({count}). Increase step or reduce radius. Maximum: 200.",
  rainNoPoints: "No points to request. Check your parameters.",
  rainLoadError: "Failed to load data",
  back: "Back",
  title: "Weather",
  subtitle: "Check weather for your mushroom spots",
  intro:
    "View a 14-day weather archive and a precipitation map. See whether it rained and if the forest had enough moisture for mushrooms.",
  priceWeather: "Weather check — 4 tokens",
  priceRainMap: "Rain map — 10 tokens per 50 points",
  guideToggle: "Details: how the rain map works and how tokens are calculated",
  guideRainTitle: "Rain map: how it works",
  guideRainP1:
    "Click the map to set the center, then set the radius and step. The service builds a grid of points — nodes of a square lattice spaced «Step» km apart that fall inside the circle of the given radius. Each point is a separate weather measurement.",
  guideRainP2:
    "For every point we load daily precipitation totals for the chosen period (14 days by default, ending today) and sum them into a total rainfall for that point. Temperatures are stored alongside and shown in the point popup on click.",
  guideRainP3:
    "Each circle is colored by how much rain fell. The circle radius equals half the step, so neighboring cells meet and form a continuous heat map.",
  guideColorTitle: "What the colors mean",
  guideColorDesc:
    "Color shows the share of the maximum on this map, not absolute millimeters. The wettest points are red (≥80% of the max), the driest are pale blue. So even after light rain, the most humid spots still turn red. See the actual millimeters in the legend (scale from 0 to the max) and in the point popup.",
  guidePrincipleTitle: "The “rain points” principle for foragers",
  guidePrincipleDesc:
    "Mushrooms flush about 7–14 days after rain. Red zones are where the most moisture recently arrived — prime spots for a trip. The point popup shows how many days ago the rain peaked: if it falls in the 7–14 day window, it’s a great candidate.",
  guideTokensTitle: "How tokens are calculated",
  guideTokensWeather:
    "Weather check — a fixed {weather} tokens for 14 days at a single location.",
  guideTokensRain:
    "Rain map — {perBatch} tokens per 50 points. Points are grouped into batches of 50 (one request to the weather service).",
  guideTokensFormula:
    "Map cost = ⌈points ÷ 50⌉ × {perBatch} tokens (minimum one batch).",
  guideTokensExample:
    "Example: 120 points → 3 batches (50 + 50 + 20) → 3 × {perBatch} = {example} tokens.",
  guideTokensControl:
    "The number of points depends on radius and step: a bigger radius or smaller step means more points and a higher price. Limit — 200 points per map.",
  guideTokensTip:
    "Tip: to pay less, increase the step or reduce the radius. The point count and total cost update instantly under the parameters — tokens are only charged after you confirm.",
  tabWeather: "Weather",
  tabWeatherCost: "{n} tokens",
  tabRainMap: "Rain map",
  tabRainMapSub: "Heat map",
  labelLocation: "Location",
  loading: "Loading...",
  noLocations: "No saved locations.",
  addLocation: "Add",
  endDateLabel: "End date (day 14 of 14)",
  endDateHint: "Data loads for the 14 days up to and including this date",
  sourceLabel: "Data source",
  sourceOpenMeteo: "Open-Meteo (default)",
  sourceVisualCrossing: "Visual Crossing",
  sourceHint: "If precipitation looks off, try a different source",
  loadWeatherCta: "Load weather · {n} tokens",
  confirmWeatherTitle: "Load weather",
  confirmWeatherDesc:
    "The system will load 14 days of weather for the selected location.",
  tableDay: "Day",
  tableDate: "Date",
  tooltipTempMean:
    "Mean air temperature at 2 m (°C). Key for mushroom growth. Optimal: 10–20°C.",
  tempMeanShort: "t avg °C",
  tooltipTempMin:
    "Minimum air temperature (°C). Important for night frosts that can stop mycelium growth.",
  tempMin: "t min °C",
  tooltipTempMax:
    "Maximum air temperature (°C). Very high (>30°C) slows mushroom growth.",
  tempMax: "t max °C",
  tooltipRain:
    "Liquid precipitation (rain) in mm per day. Rain in the 7–14 days before picking is the main factor for flushes.",
  rain: "Rain",
  tooltipWind:
    "Maximum wind speed at 10 m (km/h). Strong wind (>40 km/h) dries soil and worsens conditions.",
  wind: "Wind",
  savedChecks: "Saved checks",
  defaultLocationName: "Location",
  delete: "Delete",
  radius: "Radius",
  step: "Step",
  pointsField: "Points",
  pointsAuto: "auto",
  days: "Days",
  pointsCount: "{count} points",
  pointsTooMany: " (max 200)",
  tokensAbbr: "{n} tok.",
  clickMapPickCenter: "Click the map to choose the center",
  newMeasurement: "New measurement",
  resetShort: "Reset",
  load: "Load",
  confirmSpendLine: "{points} pts · {cost} tok. · Balance: {balance}",
  yesCharge: "Confirm charge",
  cancel: "Cancel",
  rainSumForDays: "Rain sum for {days} days",
  legendStats:
    "{pts} pts · {min}–{max} mm · avg {avg} mm",
  savedMaps: "Saved maps",
  savedMapParams: "R:{radius} · S:{step} · {days}d",
  unitMm: "mm",
  unitKmH: "km/h",
  chartTempTitle: "Temperature over 14 days",
  chartRainTitle: "Rain over 14 days",
  chartTMax: "Max",
  chartTMin: "Min",
  chartTMaxLabel: "t° max",
  chartTMeanLabel: "t° mean",
  chartTMinLabel: "t° min",
  chartRainLabel: "Rain (mm)",
  chartRainUnit: " mm",
} as const;
