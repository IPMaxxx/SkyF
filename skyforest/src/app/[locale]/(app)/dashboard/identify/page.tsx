"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowLeft,
  Camera,
  ImagePlus,
  ScanSearch,
  RefreshCw,
  AlertTriangle,
  Leaf,
  MapPin,
  CloudSun,
  ExternalLink,
  ListChecks,
  ShieldAlert,
  Info,
} from "lucide-react";
import { useTokens } from "@/lib/TokenContext";
import { TOKEN_COSTS } from "@/lib/tokens";
import { TokenConfirmModal } from "@/components/app/TokenConfirmModal";
import { capturePhoto, pickPhotoFromGallery } from "@/lib/capturePhoto";
import { toast } from "sonner";
import type { IdentifyResponse } from "@/app/api/mushrooms/identify/route";

const REQUEST_TIMEOUT_MS = 35000;

function formatPct(prob: number): string {
  return `${Math.round(prob * 100)}%`;
}

export default function IdentifyPage() {
  const t = useTranslations("identify");
  const locale = useLocale();
  const { balance, refresh: refreshTokens } = useTokens();

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<IdentifyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Освобождаем object URL превью при смене/размонтировании.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const tips = t.raw("tips") as string[];
  const checklist = t.raw("checklist") as string[];
  const habitatData = t.raw("habitatData") as Record<
    string,
    { zone: string; weather: string }
  >;
  const lookalikeLabels = t.raw("lookalikeLabels") as Record<string, string>;
  const cost = TOKEN_COSTS.mushroom_identify;

  const setCaptured = (f: File | null) => {
    if (!f) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setRequestId(crypto.randomUUID());
    setResult(null);
    setError(null);
  };

  // null = пользователь отменил (молча), исключение = нет доступа к камере
  // или сбой захвата — показываем видимую ошибку вместо «ничего не произошло».
  const handleTakePhoto = async () => {
    try {
      const f = await capturePhoto();
      setCaptured(f);
    } catch {
      toast.error(t("errCapture"));
    }
  };

  const handleGallery = async () => {
    try {
      const f = await pickPhotoFromGallery();
      setCaptured(f);
    } catch {
      toast.error(t("errCapture"));
    }
  };

  const resetAll = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setRequestId(null);
    setResult(null);
    setError(null);
  };

  const mapError = (status: number, code?: string): string => {
    if (status === 402) return t("errInsufficient");
    if (status === 413) return t("errTooLarge");
    if (status === 415) return t("errUnsupported");
    if (status === 422) return code === "no_result" ? t("errNoResult") : t("errNotMushroom");
    if (status === 502) return t("errUnavailable");
    if (status === 503) return t("errUnavailable");
    return t("errGeneric");
  };

  const runIdentify = async () => {
    if (!file || !requestId) return;
    setConfirming(false);
    setAnalyzing(true);
    setError(null);
    setResult(null);

    const controller = new AbortController();
    abortRef.current = controller;
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const form = new FormData();
      form.append("image", file);
      form.append("request_id", requestId);
      form.append("locale", locale);

      const res = await fetch("/api/mushrooms/identify", {
        method: "POST",
        body: form,
        headers: { "Idempotency-Key": requestId },
        signal: controller.signal,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(mapError(res.status, data?.error));
        return;
      }

      setResult(data as IdentifyResponse);
      toast.success(t("toastCharged"));
      refreshTokens();
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError(t("errTimeout"));
      } else {
        setError(t("errGeneric"));
      }
    } finally {
      clearTimeout(timer);
      abortRef.current = null;
      setAnalyzing(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
      <Link
        href="/dashboard"
        className="mb-4 sm:mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("back")}
      </Link>

      <div className="mb-4 sm:mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[14px] border border-identify/35 bg-gradient-to-br from-[#0e2b26] to-[#0a1712] text-identify shadow-[0_0_30px_-8px_rgba(55,201,166,0.5)]">
          <ScanSearch className="h-5 w-5" strokeWidth={1.6} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-heading text-lg sm:text-xl font-extrabold tracking-tight">{t("title")}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      {/* --- Анализ --- */}
      {analyzing && (
        <div className="glass rounded-2xl p-8 text-center">
          <div className="relative mx-auto mb-5 grid h-[120px] w-[120px] place-items-center">
            <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-identify/15 border-t-identify" />
            {previewUrl ? (
              <img
                src={previewUrl}
                alt=""
                className="h-[78px] w-[78px] rounded-[22px] object-cover"
              />
            ) : (
              <div className="h-[78px] w-[78px] rounded-[22px] bg-white/5" />
            )}
          </div>
          <p className="font-heading text-lg font-extrabold">{t("analyzing")}</p>
          <p className="mx-auto mt-2 max-w-[210px] text-xs leading-relaxed text-muted-foreground">
            {t("analyzingHint")}
          </p>
        </div>
      )}

      {/* --- Результаты --- */}
      {!analyzing && result && (
        <div className="space-y-5">
          {previewUrl && (
            <img
              src={previewUrl}
              alt=""
              className="h-48 w-full rounded-2xl object-cover"
            />
          )}

          {result.low_confidence && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm text-amber-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{t("lowConfidence")}</span>
            </div>
          )}

          {/* Ранжированный список видов */}
          <div className="glass overflow-hidden rounded-2xl">
            <div className="border-b border-white/10 bg-white/5 px-4 py-3">
              <p className="text-sm font-semibold">{t("resultsTitle")}</p>
              <p className="text-xs text-muted-foreground">{t("resultsHint")}</p>
            </div>
            <div className="divide-y divide-white/10">
              {result.suggestions.map((s) => (
                <div key={s.rank} className="flex gap-3 p-4">
                  <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-white/5">
                    {s.reference_photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={s.reference_photo_url}
                        alt={s.scientific_name}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <Leaf className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold italic">{s.scientific_name}</span>
                      <span
                        className={`flex-shrink-0 text-sm font-bold ${
                          s.probability >= 0.5
                            ? "text-emerald-400"
                            : s.probability >= 0.3
                              ? "text-amber-400"
                              : "text-gray-400"
                        }`}
                      >
                        {formatPct(s.probability)}
                      </span>
                    </div>
                    {s.common_name && (
                      <p className="text-xs text-muted-foreground">{s.common_name}</p>
                    )}
                    {s.toxic != null && (
                      <p className="mt-1 text-[11px] italic text-muted-foreground">
                        (
                        {s.toxic
                          ? t("toxicYes", { source: s.toxic_source ?? "GBIF" })
                          : t("toxicNo", { source: s.toxic_source ?? "GBIF" })}
                        )
                      </p>
                    )}
                    {(s.wikipedia_url || s.gbif_url) && (
                      <a
                        href={(s.wikipedia_url || s.gbif_url) as string}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {t("moreLink")}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-white/10 px-4 py-2.5">
              <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                <Info className="mt-0.5 h-3 w-3 flex-shrink-0" />
                {t("referencePhotosNote")}
              </p>
            </div>
          </div>

          {/* Подробнее о наиболее вероятном виде */}
          {(result.details.family ||
            result.details.genus ||
            result.details.summary ||
            result.habitat) && (
            <div className="glass rounded-2xl p-4">
              <p className="mb-3 text-sm font-semibold">
                {t("detailsTitle", { name: result.details.scientific_name })}
              </p>

              {(result.details.family || result.details.genus) && (
                <p className="mb-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground/80">{t("taxonomyLabel")}:</span>{" "}
                  {[
                    result.details.family && `${t("familyLabel")} ${result.details.family}`,
                    result.details.genus && `${t("genusLabel")} ${result.details.genus}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}

              {result.details.summary && (
                <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
                  {result.details.summary}
                </p>
              )}

              {result.habitat &&
                (() => {
                  // Новые результаты несут только code → перевод на клиенте.
                  // Старые сохранённые результаты несли готовый текст в zone/weather.
                  const localized = habitatData[result.habitat.code];
                  const zone = result.habitat.zone ?? localized?.zone;
                  const weather = result.habitat.weather ?? localized?.weather;
                  if (!zone && !weather) return null;
                  return (
                    <div className="space-y-1.5 rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-3">
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                        <MapPin className="h-3.5 w-3.5" />
                        {t("habitatTitle")}
                      </p>
                      {zone && (
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground/80">{t("habitatZone")}:</span>{" "}
                          {zone}
                        </p>
                      )}
                      {weather && (
                        <p className="flex items-start gap-1 text-xs text-muted-foreground">
                          <CloudSun className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                          <span>
                            <span className="font-medium text-foreground/80">{t("habitatWeather")}:</span>{" "}
                            {weather}
                          </span>
                        </p>
                      )}
                    </div>
                  );
                })()}
            </div>
          )}

          {/* Опасные двойники */}
          {result.lookalikes.length > 0 && (
            <div className="glass rounded-2xl p-4">
              <p className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-red-400">
                <ShieldAlert className="h-4 w-4" />
                {t("lookalikesTitle")}
              </p>
              <p className="mb-3 text-xs text-muted-foreground">{t("lookalikesNote")}</p>
              <div className="space-y-3">
                {result.lookalikes.map((la) => (
                  <div key={la.scientific_name} className="flex gap-3">
                    <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-white/5">
                      {la.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={la.photo_url}
                          alt={la.scientific_name}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <Leaf className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium italic">{la.scientific_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {la.label ?? lookalikeLabels[la.scientific_name] ?? ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Чеклист */}
          <div className="glass rounded-2xl p-4">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
              <ListChecks className="h-4 w-4 text-emerald-400" />
              {t("checklistTitle")}
            </p>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              {checklist.map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-emerald-400">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Дисклеймер */}
          <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-relaxed text-muted-foreground">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
            <span>{t("disclaimer")}</span>
          </div>

          <button
            type="button"
            onClick={resetAll}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border py-3.5 text-sm font-medium transition-colors hover:bg-white/5"
          >
            <RefreshCw className="h-4 w-4" />
            {t("newPhoto")}
          </button>
        </div>
      )}

      {/* --- Захват / превью (когда нет анализа и нет результата) --- */}
      {!analyzing && !result && (
        <div className="space-y-5">
          {/* Подсказки по съёмке */}
          <div className="rounded-2xl border border-identify/20 bg-identify/[0.06] p-4">
            <p className="mb-2 flex items-center gap-1.5 font-heading text-sm font-bold text-identify">
              <Camera className="h-4 w-4" />
              {t("tipsTitle")}
            </p>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              {tips.map((tip, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-identify">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          {previewUrl ? (
            <div className="space-y-4">
              <img src={previewUrl} alt="" className="h-64 w-full rounded-2xl object-cover" />

              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="btn-identify flex min-h-[54px] w-full items-center justify-center gap-2 rounded-[16px] py-3.5 text-[15px] transition-opacity hover:opacity-90"
              >
                <ScanSearch className="h-5 w-5" />
                {t("identify")} · {t("costSuffix")}
              </button>

              <button
                type="button"
                onClick={handleTakePhoto}
                className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-medium transition-colors hover:bg-white/5"
              >
                <RefreshCw className="h-4 w-4" />
                {t("retake")}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <button
                type="button"
                onClick={handleTakePhoto}
                className="btn-identify flex min-h-[56px] w-full items-center justify-center gap-2 rounded-[16px] py-4 text-base transition-opacity hover:opacity-90"
              >
                <Camera className="h-5 w-5" />
                {t("takePhoto")}
              </button>
              <button
                type="button"
                onClick={handleGallery}
                className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[16px] border border-white/12 bg-white/[0.04] py-3.5 text-sm font-bold transition-colors hover:bg-white/[0.07]"
              >
                <ImagePlus className="h-4 w-4" />
                {t("chooseFromGallery")}
              </button>
            </div>
          )}
        </div>
      )}

      <TokenConfirmModal
        open={confirming}
        title={t("confirmTitle")}
        description={t("confirmDesc")}
        cost={cost}
        balance={balance}
        loading={analyzing}
        onConfirm={runIdentify}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
