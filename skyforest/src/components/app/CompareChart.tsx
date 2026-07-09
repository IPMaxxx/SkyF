"use client";

import { useLocale, useTranslations } from "next-intl";
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
} from "recharts";
import type { WeatherDay } from "@/lib/supabase/types";
import { useUnits } from "@/lib/units";

interface Props {
  reference: WeatherDay[];
  current: WeatherDay[];
  dayScores: number[];
}

export function CompareChart({ reference, current, dayScores }: Props) {
  const t = useTranslations("compare");
  const locale = useLocale();
  const units = useUnits();
  const len = Math.min(reference.length, current.length);

  const round1 = (v: number) => Math.round(v * 10) / 10;
  const round2 = (v: number) => Math.round(v * 100) / 100;
  const rain = (mm: number) =>
    units.isImperial ? round2(units.precip(mm)) : round1(mm);

  const tempData = Array.from({ length: len }, (_, i) => ({
    day: i + 1,
    date: new Date(current[i].date).toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
    }),
    refTemp: round1(units.temp(reference[i].temperature_mean)),
    curTemp: round1(units.temp(current[i].temperature_mean)),
  }));

  const rainData = Array.from({ length: len }, (_, i) => ({
    day: i + 1,
    date: new Date(current[i].date).toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
    }),
    refRain: rain(reference[i].rain_sum),
    curRain: rain(current[i].rain_sum),
  }));

  const scoreData = Array.from({ length: len }, (_, i) => ({
    day: i + 1,
    date: new Date(current[i].date).toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
    }),
    score: Math.round(dayScores[i] ?? 0),
  }));

  const tooltipStyle = {
    contentStyle: {
      background: "rgba(15,26,18,0.95)",
      border: "1px solid rgba(255,255,255,0.15)",
      borderRadius: 12,
      color: "#e8f0ea",
      fontSize: 12,
    },
    labelStyle: { color: "#94a3b8", marginBottom: 4 },
  };

  return (
    <div className="space-y-6">
      {/* Temperature comparison */}
      <div className="glass rounded-2xl p-5">
        <h3 className="mb-4 text-sm font-semibold text-foreground/80">
          {t("chartTempTitle")}
        </h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={tempData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={{ stroke: "rgba(255,255,255,0.1)" }} tickLine={false} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} unit={units.tempUnit} />
              <Tooltip {...tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
              <Line type="monotone" dataKey="refTemp" name={t("chartLegendRefTemp")} stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3, fill: "#f59e0b" }} strokeDasharray="6 3" />
              <Line type="monotone" dataKey="curTemp" name={t("chartLegendCurTemp")} stroke="#22d3ee" strokeWidth={2.5} dot={{ r: 3, fill: "#22d3ee" }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Rain comparison */}
      <div className="glass rounded-2xl p-5">
        <h3 className="mb-4 text-sm font-semibold text-foreground/80">
          {t("chartRainTitle")}
        </h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rainData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={{ stroke: "rgba(255,255,255,0.1)" }} tickLine={false} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} unit={` ${units.precipUnit}`} />
              <Tooltip {...tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} />
              <Bar dataKey="refRain" name={t("chartLegendRefRain", { u: units.precipUnit })} fill="#f59e0b" opacity={0.6} radius={[3, 3, 0, 0]} />
              <Bar dataKey="curRain" name={t("chartLegendCurRain", { u: units.precipUnit })} fill="#22d3ee" opacity={0.8} radius={[3, 3, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Match score by day */}
      <div className="glass rounded-2xl p-5">
        <h3 className="mb-4 text-sm font-semibold text-foreground/80">
          {t("chartScoreTitle")}
        </h3>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={scoreData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={{ stroke: "rgba(255,255,255,0.1)" }} tickLine={false} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
              <Tooltip {...tooltipStyle} />
              <Bar
                dataKey="score"
                name={t("chartLegendScore")}
                radius={[4, 4, 0, 0]}
                opacity={0.85}
                fill="#62a863"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
