import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const lat = parseFloat(searchParams.get("lat") || "");
  const lng = parseFloat(searchParams.get("lng") || "");
  const rangeStart = searchParams.get("start_date");
  const rangeEnd = searchParams.get("end_date");
  const dateStr = searchParams.get("date") || new Date().toISOString().split("T")[0];
  const days = parseInt(searchParams.get("days") || "14");

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  let startStr: string;
  let endStr: string;

  if (rangeStart && rangeEnd) {
    const re = /^\d{4}-\d{2}-\d{2}$/;
    if (!re.test(rangeStart) || !re.test(rangeEnd)) {
      return NextResponse.json({ error: "Invalid start_date or end_date" }, { status: 400 });
    }
    const s = new Date(`${rangeStart}T00:00:00Z`);
    const e = new Date(`${rangeEnd}T00:00:00Z`);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || s > e) {
      return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
    }
    const spanDays = Math.floor((e.getTime() - s.getTime()) / 86400000) + 1;
    if (spanDays > 31) {
      return NextResponse.json({ error: "Date range too long" }, { status: 400 });
    }
    startStr = rangeStart;
    endStr = rangeEnd;
  } else {
    const endDateCalc = new Date(dateStr);
    const startDateCalc = new Date(dateStr);
    startDateCalc.setDate(startDateCalc.getDate() - (days - 1));
    startStr = startDateCalc.toISOString().split("T")[0];
    endStr = endDateCalc.toISOString().split("T")[0];
  }

  const endDate = new Date(endStr);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isHistorical = endDate < today;

  const baseUrl = isHistorical
    ? "https://archive-api.open-meteo.com/v1/archive"
    : "https://api.open-meteo.com/v1/forecast";

  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lng.toString(),
    start_date: startStr,
    end_date: endStr,
    daily: [
      "temperature_2m_mean",
      "temperature_2m_min",
      "temperature_2m_max",
      "precipitation_sum",
      "rain_sum",
      "relative_humidity_2m_mean",
      "wind_speed_10m_max",
    ].join(","),
    timezone: "Europe/Minsk",
  });

  try {
    const res = await fetch(`${baseUrl}?${params}`, {
      next: { revalidate: 3600 },
    });
    const raw = await res.json();

    if (raw.error) {
      return NextResponse.json({ error: raw.reason || raw.error }, { status: 400 });
    }

    const daily = raw.daily;
    if (!daily || !daily.time) {
      return NextResponse.json({ error: "No data returned" }, { status: 404 });
    }

    const weatherDays = daily.time.map((date: string, i: number) => ({
      date,
      temperature_mean: daily.temperature_2m_mean?.[i] ?? null,
      temperature_min: daily.temperature_2m_min?.[i] ?? null,
      temperature_max: daily.temperature_2m_max?.[i] ?? null,
      precipitation_sum: daily.precipitation_sum?.[i] ?? 0,
      rain_sum: daily.rain_sum?.[i] ?? 0,
      relative_humidity_mean: daily.relative_humidity_2m_mean?.[i] ?? null,
      wind_speed_max: daily.wind_speed_10m_max?.[i] ?? null,
    }));

    return NextResponse.json({ days: weatherDays, location: { lat, lng } });
  } catch (err) {
    console.error("Weather API error:", err);
    return NextResponse.json({ error: "Failed to fetch weather data" }, { status: 500 });
  }
}
