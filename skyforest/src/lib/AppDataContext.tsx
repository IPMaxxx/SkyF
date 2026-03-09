"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { Location } from "@/lib/supabase/types";

export interface BestDaySummary {
  id: string;
  name: string;
  best_date: string;
  location_id: string;
  created_at: string;
  location?: { id: string; name: string };
  mushroom?: { id: string; latin_name: string; common_name: string | null; image_url: string | null };
}

interface AppData {
  locations: Location[];
  bestDays: BestDaySummary[];
  loading: boolean;
  refreshLocations: () => Promise<void>;
  refreshBestDays: () => Promise<void>;
  addLocation: (loc: Location) => void;
  addBestDay: (bd: BestDaySummary) => void;
  removeLocation: (id: string) => void;
  removeBestDay: (id: string) => void;
}

const AppDataContext = createContext<AppData>({
  locations: [],
  bestDays: [],
  loading: true,
  refreshLocations: async () => {},
  refreshBestDays: async () => {},
  addLocation: () => {},
  addBestDay: () => {},
  removeLocation: () => {},
  removeBestDay: () => {},
});

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [bestDays, setBestDays] = useState<BestDaySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const [locRes, bdRes] = await Promise.all([
      supabase
        .from("locations")
        .select("id, name, lat, lng, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("best_days")
        .select(
          "id, name, best_date, location_id, created_at, location:locations(id, name), mushroom:mushroom_species(id, latin_name, common_name, image_url)"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

    if (locRes.data) setLocations(locRes.data as Location[]);
    if (bdRes.data) setBestDays(bdRes.data as unknown as BestDaySummary[]);
    setLoading(false);
  };

  const refreshLocations = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("locations")
      .select("id, name, lat, lng, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setLocations(data as Location[]);
  }, []);

  const refreshBestDays = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("best_days")
      .select(
        "id, name, best_date, location_id, created_at, location:locations(id, name), mushroom:mushroom_species(id, latin_name, common_name, image_url)"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setBestDays(data as unknown as BestDaySummary[]);
  }, []);

  const addLocation = useCallback((loc: Location) => {
    setLocations((prev) => [loc, ...prev]);
  }, []);

  const addBestDay = useCallback((bd: BestDaySummary) => {
    setBestDays((prev) => [bd, ...prev]);
  }, []);

  const removeLocation = useCallback((id: string) => {
    setLocations((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const removeBestDay = useCallback((id: string) => {
    setBestDays((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const value = useMemo(
    () => ({
      locations,
      bestDays,
      loading,
      refreshLocations,
      refreshBestDays,
      addLocation,
      addBestDay,
      removeLocation,
      removeBestDay,
    }),
    [
      locations,
      bestDays,
      loading,
      refreshLocations,
      refreshBestDays,
      addLocation,
      addBestDay,
      removeLocation,
      removeBestDay,
    ]
  );

  return (
    <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
  );
}

export function useAppData() {
  return useContext(AppDataContext);
}
