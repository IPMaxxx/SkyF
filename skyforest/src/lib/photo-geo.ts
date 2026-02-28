import ExifReader from "exifreader";

interface GeoResult {
  lat: number;
  lng: number;
}

export async function extractPhotoGps(file: File): Promise<GeoResult | null> {
  try {
    const buffer = await file.arrayBuffer();
    const tags = ExifReader.load(buffer, { expanded: true });

    const gps = tags.gps;
    if (!gps || gps.Latitude === undefined || gps.Longitude === undefined) {
      return null;
    }

    return { lat: gps.Latitude, lng: gps.Longitude };
  } catch {
    return null;
  }
}

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const MAX_DISTANCE_KM = 5;

export async function checkPhotoLocation(
  file: File,
  locationLat: number,
  locationLng: number
): Promise<{ ok: boolean; distance?: number; noGps?: boolean }> {
  const gps = await extractPhotoGps(file);

  if (!gps) {
    return { ok: true, noGps: true };
  }

  const distance = haversineKm(gps.lat, gps.lng, locationLat, locationLng);

  return {
    ok: distance <= MAX_DISTANCE_KM,
    distance: Math.round(distance * 10) / 10,
  };
}
