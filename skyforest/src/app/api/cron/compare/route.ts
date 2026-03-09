import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { comparePatterns, type WeightConfig } from "@/lib/compare";
import { sendEmail } from "@/lib/email";
import { buildCompareEmail, buildInsufficientTokensEmail } from "@/lib/email-templates";
import { TOKEN_COSTS } from "@/lib/tokens";
import type { WeatherDay } from "@/lib/supabase/types";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  // #region agent log
  const _dl = (msg: string, data: Record<string, unknown> = {}, hid = "general") => { console.log(`[DEBUG:${hid}] ${msg}`, JSON.stringify(data)); return fetch('http://127.0.0.1:7883/ingest/0c42df6e-6ed3-4d9d-ac34-d78fd2413c96',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d49892'},body:JSON.stringify({sessionId:'d49892',location:'cron/compare/route.ts',message:msg,data,timestamp:Date.now(),hypothesisId:hid})}).catch(()=>{}); };
  // #endregion

  const cronSecret = process.env.CRON_SECRET;
  // #region agent log
  await _dl('cron_entry', { hasCronSecret: !!cronSecret, cronSecretLen: cronSecret?.length ?? 0, hasSmtp: !!process.env.SMTP_USER, hasSmtpPass: !!process.env.SMTP_PASS }, 'H1');
  // #endregion
  if (!cronSecret || cronSecret.length < 16) {
    console.error("CRON_SECRET is not configured or too short");
    // #region agent log
    await _dl('cron_secret_missing', { cronSecretLen: cronSecret?.length ?? 0 }, 'H1');
    // #endregion
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    // #region agent log
    await _dl('cron_auth_failed', { hasAuthHeader: !!authHeader }, 'H1');
    // #endregion
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  const { data: autoCompares, error: acError } = await supabase
    .from("auto_compares")
    .select(`
      *,
      best_day:best_days(*, mushroom:mushroom_species(*)),
      location:locations(*),
      profile:profiles(email)
    `)
    .eq("enabled", true);

  // #region agent log
  await _dl('auto_compares_loaded', { count: autoCompares?.length ?? 0, error: acError?.message ?? null }, 'H4');
  // #endregion

  if (acError || !autoCompares) {
    return NextResponse.json({ error: acError?.message || "No data", processed: 0 });
  }

  let processed = 0;
  let errors = 0;

  for (const ac of autoCompares) {
    try {
      const bestDay = ac.best_day;
      const loc = ac.location;
      const profile = ac.profile;
      // #region agent log
      await _dl('processing_compare', { id: ac.id, hasWeatherData: !!bestDay?.weather_data, hasLoc: !!loc, email: profile?.email ?? null, profileObj: JSON.stringify(profile) }, 'H3');
      // #endregion
      if (!bestDay?.weather_data || !loc || !profile?.email) continue;

      const userEmail = profile.email;

      const { data: balanceData } = await supabase.rpc("get_token_balance", {
        p_user_id: ac.user_id,
      });
      const balance = balanceData ?? 0;
      const cost = TOKEN_COSTS.compare;

      if (balance < cost) {
        try {
          await sendEmail(
            userEmail,
            `Skyforest: недостаточно токенов для автосравнения`,
            buildInsufficientTokensEmail(bestDay.name, balance)
          );
        } catch (emailErr) {
          console.error("Failed to send insufficient tokens email:", emailErr);
        }
        continue;
      }

      const today = new Date().toISOString().split("T")[0];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 13);

      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lng}&daily=temperature_2m_mean,temperature_2m_min,temperature_2m_max,precipitation_sum,rain_sum,relative_humidity_2m_mean,wind_speed_10m_max&start_date=${startDate.toISOString().split("T")[0]}&end_date=${today}&timezone=Europe/Minsk`;

      const weatherRes = await fetch(weatherUrl);
      const weatherRaw = await weatherRes.json();

      if (!weatherRaw.daily?.time) continue;

      const { data: spendResult } = await supabase.rpc("spend_tokens", {
        p_user_id: ac.user_id,
        p_amount: cost,
        p_description: `Автосравнение: ${ac.name || bestDay.name} → ${loc.name}`,
      });
      if (!spendResult?.success) continue;

      const currentWeather: WeatherDay[] = weatherRaw.daily.time.map((date: string, i: number) => ({
        date,
        temperature_mean: weatherRaw.daily.temperature_2m_mean?.[i] ?? null,
        temperature_min: weatherRaw.daily.temperature_2m_min?.[i] ?? null,
        temperature_max: weatherRaw.daily.temperature_2m_max?.[i] ?? null,
        precipitation_sum: weatherRaw.daily.precipitation_sum?.[i] ?? 0,
        rain_sum: weatherRaw.daily.rain_sum?.[i] ?? 0,
        relative_humidity_mean: weatherRaw.daily.relative_humidity_2m_mean?.[i] ?? null,
        wind_speed_max: weatherRaw.daily.wind_speed_10m_max?.[i] ?? null,
      }));

      const weights: WeightConfig = ac.weights || {
        rain_sum: 0.30,
        temperature_mean: 0.25,
        temperature_min: 0.10,
        temperature_max: 0.10,
        wind_speed_max: 0.10,
        relative_humidity_mean: 0.15,
      };

      const totalW = Object.values(weights).reduce((a: number, b: number) => a + b, 0);
      const normalizedWeights = { ...weights };
      if (totalW > 2) {
        for (const k of Object.keys(normalizedWeights) as (keyof WeightConfig)[]) {
          normalizedWeights[k] = normalizedWeights[k] / 100;
        }
      }

      const result = comparePatterns(bestDay.weather_data, currentWeather, normalizedWeights);

      const lastResult = {
        overall: result.overall,
        byParameter: result.byParameter,
        byDay: result.byDay,
        currentWeather,
      };

      // Save to history
      await supabase.from("saved_compares").insert({
        user_id: ac.user_id,
        best_day_id: ac.best_day_id,
        location_id: ac.location_id,
        auto_compare_id: ac.id,
        compare_date: today,
        current_weather: currentWeather,
        weights: ac.weights,
        overall_score: result.overall,
        by_parameter: result.byParameter,
        by_day: result.byDay,
      });

      // Update comparison with latest result
      await supabase
        .from("auto_compares")
        .update({
          last_run_at: new Date().toISOString(),
          last_score: result.overall,
          last_result: lastResult,
        })
        .eq("id", ac.id);

      const compareDate = new Date(today).toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      const bestDate = new Date(bestDay.best_date).toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      // #region agent log
      await _dl('sending_email', { to: userEmail, score: Math.round(result.overall), name: ac.name || bestDay.name }, 'H2');
      // #endregion
      try {
        await sendEmail(
          userEmail,
          `Skyforest: совпадение ${Math.round(result.overall)}% — ${ac.name || bestDay.name} → ${loc.name}`,
          buildCompareEmail({
            bestDayName: bestDay.name,
            locationName: loc.name,
            compareDate,
            bestDate,
            overallScore: result.overall,
            byParameter: result.byParameter,
          })
        );
        // #region agent log
        await _dl('email_sent_ok', { to: userEmail }, 'H2');
        // #endregion
      } catch (emailErr) {
        // #region agent log
        await _dl('email_send_failed', { to: userEmail, error: String(emailErr) }, 'H2');
        // #endregion
        console.error("Email send error:", emailErr);
      }

      processed++;
    } catch (err) {
      // #region agent log
      await _dl('compare_error', { id: ac.id, error: String(err) }, 'H5');
      // #endregion
      console.error("Auto-compare error:", err);
      errors++;
    }
  }

  // #region agent log
  await _dl('cron_complete', { processed, errors, total: autoCompares.length }, 'H5');
  // #endregion

  return NextResponse.json({
    processed,
    errors,
    total: autoCompares.length,
  });
}
