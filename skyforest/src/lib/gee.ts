import ee from "@google/earthengine";

let initialized = false;
let initPromise: Promise<void> | null = null;

/**
 * Initialize Earth Engine with service account credentials.
 * Requires env vars:
 *   GEE_SERVICE_ACCOUNT — service account email
 *   GEE_PRIVATE_KEY — private key (PEM format, with \n literals)
 * 
 * Returns true if GEE is available, false if credentials are not configured.
 */
export async function ensureGeeInit(): Promise<boolean> {
  if (initialized) return true;

  const serviceAccount = process.env.GEE_SERVICE_ACCOUNT;
  const privateKey = process.env.GEE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!serviceAccount || !privateKey) {
    return false;
  }

  if (!initPromise) {
    initPromise = new Promise<void>((resolve, reject) => {
      ee.data.authenticateViaPrivateKey(
        { client_email: serviceAccount, private_key: privateKey },
        () => {
          ee.initialize(null, null, () => {
            initialized = true;
            resolve();
          }, (err: Error) => reject(err));
        },
        (err: Error) => reject(err)
      );
    });
  }

  try {
    await initPromise;
    return true;
  } catch (err) {
    console.error("GEE initialization failed:", err);
    initPromise = null;
    return false;
  }
}

// IGBP land cover classes from MODIS MCD12Q1 LC_Type1
const IGBP_CLASSES: Record<number, {
  type: string;
  forest_type: "coniferous" | "broadleaved" | "mixed" | null;
  leaf_cycle: "evergreen" | "deciduous" | "mixed" | null;
  ru: string;
}> = {
  1:  { type: "Evergreen Needleleaf Forest",     forest_type: "coniferous",  leaf_cycle: "evergreen",  ru: "Вечнозелёный хвойный лес" },
  2:  { type: "Evergreen Broadleaf Forest",       forest_type: "broadleaved", leaf_cycle: "evergreen",  ru: "Вечнозелёный лиственный лес" },
  3:  { type: "Deciduous Needleleaf Forest",      forest_type: "coniferous",  leaf_cycle: "deciduous",  ru: "Листопадный хвойный лес" },
  4:  { type: "Deciduous Broadleaf Forest",       forest_type: "broadleaved", leaf_cycle: "deciduous",  ru: "Листопадный лиственный лес" },
  5:  { type: "Mixed Forest",                     forest_type: "mixed",       leaf_cycle: "mixed",      ru: "Смешанный лес" },
  6:  { type: "Closed Shrublands",                forest_type: null,          leaf_cycle: null,         ru: "Густые кустарники" },
  7:  { type: "Open Shrublands",                  forest_type: null,          leaf_cycle: null,         ru: "Редкие кустарники" },
  8:  { type: "Woody Savannas",                   forest_type: null,          leaf_cycle: null,         ru: "Лесистая саванна" },
  9:  { type: "Savannas",                         forest_type: null,          leaf_cycle: null,         ru: "Саванна" },
  10: { type: "Grasslands",                       forest_type: null,          leaf_cycle: null,         ru: "Луга" },
  11: { type: "Permanent Wetlands",               forest_type: null,          leaf_cycle: null,         ru: "Болота" },
  12: { type: "Croplands",                        forest_type: null,          leaf_cycle: null,         ru: "Пашня" },
  13: { type: "Urban and Built-Up",               forest_type: null,          leaf_cycle: null,         ru: "Городская застройка" },
  14: { type: "Cropland/Natural Vegetation Mosaic",forest_type: null,         leaf_cycle: null,         ru: "Мозаика пашни и растительности" },
  15: { type: "Snow and Ice",                     forest_type: null,          leaf_cycle: null,         ru: "Снег и лёд" },
  16: { type: "Barren",                           forest_type: null,          leaf_cycle: null,         ru: "Пустоши" },
  17: { type: "Water Bodies",                     forest_type: null,          leaf_cycle: null,         ru: "Водоёмы" },
};

export interface ModisLandCover {
  igbp_class: number;
  igbp_name: string;
  igbp_name_ru: string;
  forest_type: "coniferous" | "broadleaved" | "mixed" | null;
  leaf_cycle: "evergreen" | "deciduous" | "mixed" | null;
  is_forest: boolean;
}

/**
 * Query MODIS MCD12Q1 land cover at a point.
 * Returns the IGBP classification for the most recent available year.
 */
export async function getModisLandCover(
  lat: number,
  lng: number
): Promise<ModisLandCover | null> {
  const available = await ensureGeeInit();
  if (!available) return null;

  return new Promise((resolve) => {
    try {
      const point = ee.Geometry.Point([lng, lat]);

      const image = ee.ImageCollection("MODIS/061/MCD12Q1")
        .sort("system:time_start", false)
        .first()
        .select("LC_Type1");

      const result = image.reduceRegion({
        reducer: ee.Reducer.first(),
        geometry: point,
        scale: 500,
      });

      result.evaluate(
        (data: Record<string, number> | null, err: Error | null) => {
          if (err || !data) {
            console.error("MODIS query error:", err);
            resolve(null);
            return;
          }

          const classValue = data["LC_Type1"];
          if (classValue == null) {
            resolve(null);
            return;
          }

          const info = IGBP_CLASSES[classValue];
          if (!info) {
            resolve(null);
            return;
          }

          resolve({
            igbp_class: classValue,
            igbp_name: info.type,
            igbp_name_ru: info.ru,
            forest_type: info.forest_type,
            leaf_cycle: info.leaf_cycle,
            is_forest: classValue >= 1 && classValue <= 5,
          });
        }
      );
    } catch (err) {
      console.error("MODIS query error:", err);
      resolve(null);
    }
  });
}
