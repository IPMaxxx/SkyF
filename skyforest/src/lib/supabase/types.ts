export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  account_type: "user" | "admin";
  created_at: string;
  updated_at: string;
}

export type LocationDifficulty = "easy" | "medium" | "hard";

export interface Location {
  id: string;
  user_id: string;
  name: string;
  lat: number;
  lng: number;
  forest_info: ForestInfo | null;
  difficulty: LocationDifficulty | null;
  description: string | null;
  created_at: string;
}

export interface ForestInfo {
  forest_type: "coniferous" | "broadleaved" | "mixed" | "unknown";
  leaf_cycle: "deciduous" | "evergreen" | "mixed" | "unknown";
  forest_name: string | null;
  dominant_species: TreeSpecies[];
  osm_tags: Record<string, string>;
  modis: {
    igbp_class: number;
    igbp_name: string;
    igbp_name_ru: string;
    is_forest: boolean;
  } | null;
  fgis_lk: {
    externalid: string;
    tree_species: string;
    age_group: string | null;
  }[] | null;
  fetched_at: string;
}

export interface TreeSpecies {
  latin_name: string;
  common_name: string | null;
  observation_count: number;
  image_url: string | null;
  source: "inaturalist" | "osm" | "fgis_lk";
}

export interface MushroomSpecies {
  id: string;
  inaturalist_id: number;
  latin_name: string;
  common_name: string | null;
  image_url: string | null;
  created_at: string;
}

export interface BestDay {
  id: string;
  user_id: string;
  location_id: string;
  mushroom_id: string;
  name: string;
  best_date: string;
  weather_data: WeatherDay[] | null;
  photos: string[];
  purchased_from_listing_id: string | null;
  created_at: string;
  // joined
  location?: Location;
  mushroom?: MushroomSpecies;
  forest_info?: ForestInfo | null;
  difficulty?: LocationDifficulty | null;
  location_description?: string | null;
}

export interface WeatherDay {
  date: string;
  temperature_mean: number;
  temperature_min: number;
  temperature_max: number;
  precipitation_sum: number;
  rain_sum: number;
  relative_humidity_mean?: number;
  wind_speed_max?: number;
}

export interface TokenBalance {
  user_id: string;
  balance: number;
  total_purchased: number;
  total_spent: number;
  updated_at: string;
}

export interface TokenTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: "purchase" | "spend" | "bonus" | "refund";
  description: string | null;
  payment_id: string | null;
  balance_after: number | null;
  created_at: string;
}

export type Season = "winter" | "spring" | "summer" | "autumn";

export interface MarketplaceListing {
  id: string;
  seller_id: string;
  best_day_id: string;
  price: number;
  season: Season;
  status: "active" | "sold" | "cancelled";
  buyer_id: string | null;
  sold_at: string | null;
  created_at: string;
  display_lat: number | null;
  display_lng: number | null;
  // joined
  best_day?: BestDay;
  seller?: Profile;
}

export function getSeason(dateStr: string): Season {
  const month = new Date(dateStr).getMonth();
  if (month >= 2 && month <= 4) return "spring";
  if (month >= 5 && month <= 7) return "summer";
  if (month >= 8 && month <= 10) return "autumn";
  return "winter";
}

export function getSeasonLabel(season: Season): string {
  switch (season) {
    case "winter": return "Зима";
    case "spring": return "Весна";
    case "summer": return "Лето";
    case "autumn": return "Осень";
  }
}
