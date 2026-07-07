import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { TOKEN_COSTS, getTokenCostLabel } from "@/lib/tokens";
import {
  identifyMushroom,
  visibleSuggestions,
  LOW_CONFIDENCE_THRESHOLD,
  type SpeciesSuggestion,
} from "@/lib/mushroom/kindwise";
import { enrichMany, type SpeciesInfo } from "@/lib/mushroom/enrichment";
import { dangerousLookalikes } from "@/lib/mushroom/lookalikes";
import { habitatFor, type Habitat } from "@/lib/mushroom/habitat";
import { stripJpegExif } from "@/lib/mushroom/exif";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_BYTES = 10 * 1024 * 1024; // ~10 MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const PHOTO_BUCKET = "mushroom-photos";

/**
 * Нейтральный дисклеймер — порт `DISCLAIMER` из `bot/texts.py` (без HTML).
 * Сервис не даёт советов о съедобности.
 */
const DISCLAIMER =
  "Важно. Это автоматическое распознавание по фотографии, оно может ошибаться. " +
  "Сервис не даёт советов о съедобности и не является основанием для сбора или " +
  "употребления грибов в пищу. Многие съедобные и смертельно ядовитые грибы внешне " +
  "похожи. Никогда не употребляйте гриб, определённый только по фото. При сомнениях " +
  "обращайтесь к специалисту-микологу.";

export interface IdentifySuggestion {
  rank: number;
  scientific_name: string;
  common_name: string | null;
  probability: number;
  reference_photo_url: string | null;
  wikipedia_url: string | null;
  gbif_url: string | null;
  toxic: boolean | null;
  toxic_source: string | null;
}

export interface IdentifyDetails {
  scientific_name: string;
  common_name: string | null;
  family: string | null;
  genus: string | null;
  summary: string | null;
  wikipedia_url: string | null;
  gbif_url: string | null;
}

export interface IdentifyLookalike {
  scientific_name: string;
  /** Legacy: готовая русская подпись из старых результатов. Новые результаты
   *  переводятся на клиенте по `scientific_name` — поле не заполняется. */
  label?: string | null;
  photo_url: string | null;
}

export interface IdentifyResponse {
  id: string;
  suggestions: IdentifySuggestion[];
  details: IdentifyDetails;
  lookalikes: IdentifyLookalike[];
  habitat: Habitat | null;
  disclaimer: string;
  low_confidence: boolean;
  token_cost: number;
  balance: number;
}

function referencePhotoUrl(
  suggestion: SpeciesSuggestion,
  info: SpeciesInfo | undefined,
): string | null {
  if (info?.photo_url) return info.photo_url;
  if (suggestion.similar_image_urls.length > 0) return suggestion.similar_image_urls[0];
  return null;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.KINDWISE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "recognition_unavailable" },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  }

  const file = form.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing_image" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "unsupported_type" }, { status: 415 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "file_too_large" }, { status: 413 });
  }

  const requestId =
    (form.get("request_id") as string | null) ||
    request.headers.get("idempotency-key") ||
    null;

  // Локаль UI — определяет язык внешних справочных данных (Kindwise / GBIF / iNat).
  const locale = (form.get("locale") as string | null) === "en" ? "en" : "ru";

  // Идемпотентность: если по этому request_id уже есть результат — вернём его
  // без повторного списания токенов.
  if (requestId) {
    const { data: existing } = await supabase
      .from("mushroom_identifications")
      .select("result_json")
      .eq("user_id", user.id)
      .eq("request_id", requestId)
      .maybeSingle();
    if (existing?.result_json) {
      const { data: bal } = await supabase.rpc("get_token_balance", {
        p_user_id: user.id,
      });
      const cached = existing.result_json as IdentifyResponse;
      return NextResponse.json({ ...cached, balance: bal ?? cached.balance });
    }
  }

  const rawBytes = Buffer.from(await file.arrayBuffer());
  const cleanBytes = file.type === "image/jpeg" ? stripJpegExif(rawBytes) : rawBytes;

  // Распознавание в Kindwise.
  let result;
  try {
    result = await identifyMushroom(cleanBytes, {
      apiKey,
      baseUrl: process.env.KINDWISE_BASE_URL,
      language: locale,
    });
  } catch (err) {
    console.error("Kindwise identify failed:", err);
    return NextResponse.json({ error: "recognition_failed" }, { status: 502 });
  }

  // Не гриб или пустой результат — токены НЕ списываем.
  if (!result.is_organism || result.suggestions.length === 0) {
    return NextResponse.json({ error: "not_a_mushroom" }, { status: 422 });
  }
  const visible = visibleSuggestions(result);
  if (visible.length === 0) {
    return NextResponse.json({ error: "no_result" }, { status: 422 });
  }

  const best = visible[0];
  const rawLookalikes = dangerousLookalikes(best.scientific_name);
  const names = [
    ...visible.map((s) => s.scientific_name),
    ...rawLookalikes.map((l) => l.scientific_name),
  ];
  const infoByName = await enrichMany(names, locale);
  const bestInfo = infoByName[best.scientific_name];

  // Списание токенов ТОЛЬКО при успехе (после получения результата).
  const tokenCost = TOKEN_COSTS.mushroom_identify;
  const { data: spent, error: spendErr } = await supabase.rpc("spend_tokens", {
    p_user_id: user.id,
    p_amount: tokenCost,
    p_description: getTokenCostLabel("mushroom_identify"),
    p_use_bonus: true,
  });
  if (spendErr || !spent?.success) {
    return NextResponse.json(
      { error: "insufficient_tokens", balance: spent?.balance ?? 0 },
      { status: 402 },
    );
  }
  const balance: number = spent.balance;

  const suggestions: IdentifySuggestion[] = visible.map((s, i) => {
    const info = infoByName[s.scientific_name];
    return {
      rank: i + 1,
      scientific_name: s.scientific_name,
      common_name: info?.common_names[0] ?? s.common_names[0] ?? null,
      probability: s.probability,
      reference_photo_url: referencePhotoUrl(s, info),
      wikipedia_url: info?.wikipedia_url ?? s.url ?? null,
      gbif_url: info?.gbif_url ?? null,
      toxic: info?.toxic ?? null,
      toxic_source: info?.toxic_source ?? null,
    };
  });

  const details: IdentifyDetails = {
    scientific_name: best.scientific_name,
    common_name: bestInfo?.common_names[0] ?? best.common_names[0] ?? null,
    family: bestInfo?.family ?? null,
    genus: bestInfo?.genus ?? null,
    summary: bestInfo?.summary ?? null,
    wikipedia_url: bestInfo?.wikipedia_url ?? null,
    gbif_url: bestInfo?.gbif_url ?? null,
  };

  const lookalikes: IdentifyLookalike[] = rawLookalikes.map((l) => ({
    scientific_name: l.scientific_name,
    photo_url: infoByName[l.scientific_name]?.photo_url ?? null,
  }));

  const habitat = habitatFor(best.scientific_name, bestInfo?.genus);
  const lowConfidence = best.probability < LOW_CONFIDENCE_THRESHOLD;

  const id = crypto.randomUUID();
  const response: IdentifyResponse = {
    id,
    suggestions,
    details,
    lookalikes,
    habitat,
    disclaimer: DISCLAIMER,
    low_confidence: lowConfidence,
    token_cost: tokenCost,
    balance,
  };

  // Опционально сохраняем очищенное фото в приватный bucket (best-effort).
  let photoPath: string | null = null;
  try {
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${user.id}/${id}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(path, cleanBytes, { contentType: file.type, upsert: false });
    if (!upErr) photoPath = path;
  } catch {
    // фото — не критично
  }

  // История (RLS «только свои»). Уникальность request_id защищает от дублей.
  const { error: insErr } = await supabase.from("mushroom_identifications").insert({
    id,
    user_id: user.id,
    photo_path: photoPath,
    top_species: best.scientific_name,
    top_probability: best.probability,
    result_json: response as unknown as Record<string, unknown>,
    token_cost: tokenCost,
    request_id: requestId,
  });

  if (insErr) {
    // Вероятно, конкурентный дубль по request_id: возвращаем токены и отдаём
    // ранее сохранённый результат, чтобы не списать дважды.
    await supabase.rpc("add_tokens", {
      p_user_id: user.id,
      p_amount: tokenCost,
      p_type: "refund",
      p_description: "Возврат: повторное определение гриба",
    });
    if (requestId) {
      const { data: existing } = await supabase
        .from("mushroom_identifications")
        .select("result_json")
        .eq("user_id", user.id)
        .eq("request_id", requestId)
        .maybeSingle();
      if (existing?.result_json) {
        const { data: bal } = await supabase.rpc("get_token_balance", {
          p_user_id: user.id,
        });
        const cached = existing.result_json as IdentifyResponse;
        return NextResponse.json({ ...cached, balance: bal ?? cached.balance });
      }
    }
    console.error("Failed to save mushroom identification:", insErr);
  }

  return NextResponse.json(response);
}
