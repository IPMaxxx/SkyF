import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchDailyWeather, resolveWeatherSource } from "@/lib/weather/providers";

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

  const source = resolveWeatherSource(searchParams.get("source"));

  try {
    const weatherDays = await fetchDailyWeather(source, lat, lng, startStr, endStr);

    if (weatherDays.length === 0) {
      return NextResponse.json({ error: "No data returned" }, { status: 404 });
    }

    return NextResponse.json({ days: weatherDays, location: { lat, lng }, source });
  } catch (err) {
    console.error("Weather API error:", err);
    return NextResponse.json({ error: "Failed to fetch weather data" }, { status: 500 });
  }
}
