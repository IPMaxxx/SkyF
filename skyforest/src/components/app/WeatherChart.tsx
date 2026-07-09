"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area,
} from "recharts";
import type { WeatherDay } from "@/lib/supabase/types";
import { useLocale, useTranslations } from "next-intl";
import { useUnits } from "@/lib/units";

interface Props {
  data: WeatherDay[];
}

export function WeatherChart({ data }: Props) {
  const t = useTranslations("weather");
  const locale = useLocale();
  const dateLocale = locale === "en" ? "en-GB" : "ru-RU";
  const units = useUnits();

  const round1 = (v: number) => Math.round(v * 10) / 10;
  const round2 = (v: number) => Math.round(v * 100) / 100;

  const chartData = data.map((d, i) => ({
    day: i + 1,
    date: new Date(d.date).toLocaleDateString(dateLocale, {
      day: "numeric",
      month: "short",
    }),
    tMean: round1(units.temp(d.temperature_mean)),
    tMin: round1(units.temp(d.temperature_min)),
    tMax: round1(units.temp(d.temperature_max)),
    rain: units.isImperial
      ? round2(units.precip(d.rain_sum))
      : round1(d.rain_sum),
    precip: units.isImperial
      ? round2(units.precip(d.precipitation_sum))
      : round1(d.precipitation_sum),
    wind:
      d.wind_speed_max !== undefined
        ? round1(units.wind(d.wind_speed_max))
        : undefined,
  }));

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-5">
        <h3 className="mb-4 text-sm font-semibold text-foreground/80">
          {t("chartTempTitle")}
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                unit={units.tempUnit}
              />
              <Tooltip
                contentStyle={{
                  background: "rgba(15,26,18,0.95)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 12,
                  color: "#e8f0ea",
                  fontSize: 12,
                }}
                labelStyle={{ color: "#94a3b8", marginBottom: 4 }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, color: "#94a3b8" }}
              />
              <Area
                type="monotone"
                dataKey="tMax"
                name={t("chartTMax")}
                fill="rgba(239,68,68,0.1)"
                stroke="transparent"
              />
              <Area
                type="monotone"
                dataKey="tMin"
                name={t("chartTMin")}
                fill="rgba(59,130,246,0.1)"
                stroke="transparent"
              />
              <Line
                type="monotone"
                dataKey="tMax"
                name={t("chartTMaxLabel")}
                stroke="#ef4444"
                strokeWidth={1.5}
                dot={{ r: 3, fill: "#ef4444" }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="tMean"
                name={t("chartTMeanLabel")}
                stroke="#f59e0b"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#f59e0b" }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="tMin"
                name={t("chartTMinLabel")}
                stroke="#3b82f6"
                strokeWidth={1.5}
                dot={{ r: 3, fill: "#3b82f6" }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <h3 className="mb-4 text-sm font-semibold text-foreground/80">
          {t("chartRainTitle")}
        </h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                unit={` ${units.precipUnit}`}
              />
              <Tooltip
                contentStyle={{
                  background: "rgba(15,26,18,0.95)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 12,
                  color: "#e8f0ea",
                  fontSize: 12,
                }}
                labelStyle={{ color: "#94a3b8", marginBottom: 4 }}
              />
              <Bar
                dataKey="rain"
                name={t("chartRainLabel", { u: units.precipUnit })}
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
                opacity={0.8}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
