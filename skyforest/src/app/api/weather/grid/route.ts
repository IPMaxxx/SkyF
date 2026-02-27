import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { points, days } = body as {
    points: { lat: number; lng: number }[];
    days: number;
  };

  if (!points || points.length === 0 || points.length > 200) {
    return NextResponse.json(
      { error: "Provide 1-200 points" },
      { status: 400 }
    );
  }

  const numDays = days || 14;
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (numDays - 1));
  const startStr = start.toISOString().split("T")[0];
  const endStr = end.toISOString().split("T")[0];

  const results: {
    lat: number;
    lng: number;
    rain_total: number;
    rain_daily: number[];
    temp_mean: number;
    temp_daily_max: number[];
    temp_daily_min: number[];
    dates: string[];
  }[] = [];

  const BATCH = 50;
  for (let i = 0; i < points.length; i += BATCH) {
    const batch = points.slice(i, i + BATCH);
    const lats = batch.map((p) => p.lat.toFixed(4)).join(",");
    const lngs = batch.map((p) => p.lng.toFixed(4)).join(",");

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lngs}&daily=rain_sum,temperature_2m_mean,temperature_2m_max,temperature_2m_min&start_date=${startStr}&end_date=${endStr}&timezone=Europe/Minsk`;

    try {
      const res = await fetch(url);
      const data = await res.json();
      const items = Array.isArray(data) ? data : [data];

      items.forEach((item: {
        latitude?: number;
        longitude?: number;
        daily?: {
          time?: string[];
          rain_sum?: number[];
          temperature_2m_mean?: number[];
          temperature_2m_max?: number[];
          temperature_2m_min?: number[];
        };
      }, idx: number) => {
        const rainDaily = item.daily?.rain_sum ?? [];
        const rainTotal = rainDaily.reduce((a: number, b: number) => a + b, 0);
        const temps = item.daily?.temperature_2m_mean ?? [];
        const tempMean = temps.length > 0
          ? temps.reduce((a: number, b: number) => a + b, 0) / temps.length
          : 0;

        results.push({
          lat: item.latitude ?? batch[idx].lat,
          lng: item.longitude ?? batch[idx].lng,
          rain_total: rainTotal,
          rain_daily: rainDaily,
          temp_mean: tempMean,
          temp_daily_max: item.daily?.temperature_2m_max ?? [],
          temp_daily_min: item.daily?.temperature_2m_min ?? [],
          dates: item.daily?.time ?? [],
        });
      });
    } catch (err) {
      console.error("Grid weather batch error:", err);
    }
  }

  return NextResponse.json({ results });
}
