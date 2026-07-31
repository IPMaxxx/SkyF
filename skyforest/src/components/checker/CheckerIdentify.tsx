"use client";

/**
 * Mushroom Checker — весь флоу распознавания:
 * главный экран → превью → подтверждение → анализ → результат / ошибка.
 *
 * Поведение, которое нельзя терять при редизайне:
 *  - идемпотентность: `requestId` в теле и в заголовке `Idempotency-Key`;
 *  - клиентский таймаут 35 с через AbortController (Cancel его же и рвёт);
 *  - распознавание засчитывается только при успешном ответе — любая ошибка
 *    возвращает на превью и явно сообщает, что ничего не списано;
 *  - дисклеймер на экране результата (требование App Review).
 */

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, Camera, Check, Images, Share2 } from "lucide-react";
import {
  CaptureError,
  capturePhoto,
  pickPhotoFromGallery,
} from "@/lib/capturePhoto";
import {
  fetchQuestFinds,
  markQuestsUnseen,
  unlockFrom,
  type QuestUnlock,
} from "@/lib/checker/achievements";
import { findQuestSpecies } from "@/lib/checker/quests";
import { buildShareUrl, shareContent } from "@/lib/checker/share";
import {
  CHECKER_PLAN,
  formatQuotaDate,
  useCheckerSubscription,
} from "@/lib/checker/useSubscription";
import { cn } from "@/lib/utils";
import type { IdentifyResponse } from "@/app/api/mushrooms/identify/route";
import {
  CkModal,
  CkMono,
  CkPrimaryButton,
  CkQuietButton,
  CkScreen,
  CkSecondaryButton,
  CkStatusCard,
  type CkStatusVariant,
} from "@/components/checker/primitives";
import { CheckerMedal } from "@/components/checker/CheckerMedal";
import { CheckerShootingTips } from "@/components/checker/CheckerShootingTips";

const REQUEST_TIMEOUT_MS = 35000;
/** Шаг «признаки выделены» отмечаем по времени — сервер промежуточных событий не шлёт. */
const STEP2_AFTER_MS = 2200;

interface CheckerError {
  variant: CkStatusVariant;
  title: string;
  body: string;
  /** Техническая причина от плагина камеры — мелкой строкой под текстом. */
  detail?: string;
  action?: "subscription" | "retry";
}

function pct(probability: number): string {
  return `${Math.round(probability * 100)}%`;
}

function pctColor(probability: number): string {
  if (probability >= 0.5) return "text-ck-primary-text";
  if (probability >= 0.3) return "text-ck-amber";
  return "text-ck-muted-2";
}

export function CheckerIdentify() {
  const t = useTranslations("checker");
  const tSub = useTranslations("checker.subscription");
  const tIdentify = useTranslations("identify");
  const locale = useLocale();
  const router = useRouter();
  const {
    subscription,
    left,
    limit,
    isTrial,
    unlimited,
    loading: subLoading,
    refresh: refreshSub,
  } = useCheckerSubscription();

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [step2Done, setStep2Done] = useState(false);
  const [result, setResult] = useState<IdentifyResponse | null>(null);
  const [error, setError] = useState<CheckerError | null>(null);
  const [checked, setChecked] = useState<number[]>([]);
  const [unlock, setUnlock] = useState<QuestUnlock | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const habitatData = tIdentify.raw("habitatData") as Record<
    string,
    { zone: string; weather: string }
  >;
  const lookalikeLabels = tIdentify.raw("lookalikeLabels") as Record<
    string,
    string
  >;
  const checklist = tIdentify.raw("checklist") as string[];

  // Дата окончания пробного периода: в оплаченной подписке лимита нет,
  // поэтому и обнулять нечего.
  const trialEndsDate =
    subscription && isTrial
      ? formatQuotaDate(subscription.current_period_end, locale)
      : null;

  const setCaptured = (f: File | null) => {
    if (!f) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setRequestId(crypto.randomUUID());
    setResult(null);
    setError(null);
    setUnlock(null);
  };

  /**
   * Закрыла ли эта находка квест. Считается по облегчённой выборке (без
   * фотографий) и только после успешного результата: распознавание уже
   * записано в историю, поэтому «нашёл впервые» видно по id самой ранней
   * находки вида. Молчаливая неудача здесь допустима — праздник не критичен.
   */
  const checkUnlock = async (data: IdentifyResponse) => {
    const species = data.suggestions[0]?.scientific_name;
    if (!species) return;
    const finds = await fetchQuestFinds();
    if (!finds) return;
    const opened = unlockFrom(finds, data.id, species);
    if (!opened) return;
    setUnlock(opened);
    // Точка на вкладке «Квесты»: пользователь может не открыть её сразу.
    markQuestsUnseen();
  };

  /**
   * Три разные причины неудачи различаются явно: закрытый доступ к камере,
   * закрытый доступ к галерее и сбой плагина (его сообщение показываем
   * мелкой строкой — без него ошибку невозможно диагностировать в нативе).
   */
  const captureError = (err: unknown): CheckerError => {
    if (err instanceof CaptureError && err.reason === "camera_denied") {
      return {
        variant: "warn",
        title: t("errors.cameraDeniedTitle"),
        body: t("errors.cameraDeniedBody"),
      };
    }
    if (err instanceof CaptureError && err.reason === "photos_denied") {
      return {
        variant: "warn",
        title: t("errors.photosDeniedTitle"),
        body: t("errors.photosDeniedBody"),
      };
    }
    return {
      variant: "error",
      title: t("errors.captureTitle"),
      body: t("errors.captureBody"),
      detail: t("errors.captureDetail", {
        reason:
          err instanceof CaptureError
            ? err.detail
            : err instanceof Error
              ? err.message
              : String(err),
      }),
    };
  };

  const handleTakePhoto = async () => {
    try {
      setCaptured(await capturePhoto());
    } catch (err) {
      setError(captureError(err));
    }
  };

  const handleGallery = async () => {
    try {
      setCaptured(await pickPhotoFromGallery());
    } catch (err) {
      setError(captureError(err));
    }
  };

  const resetAll = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setRequestId(null);
    setResult(null);
    setError(null);
    setChecked([]);
    setUnlock(null);
  };

  const mapError = useCallback(
    (status: number, code?: string): CheckerError => {
      // 402 приходит и когда исчерпан лимит триала, и когда подписки нет
      // вовсе (в Checker распознавание без подписки не оплачивается ничем).
      if (status === 402) {
        return isTrial
          ? {
              variant: "warn",
              title: t("errors.limitTitle"),
              body: t("errors.limitBody", {
                limit: limit ?? CHECKER_PLAN.trialIdentifyLimit ?? 0,
              }),
              action: "subscription",
            }
          : {
              variant: "warn",
              title: t("errors.noSubTitle"),
              body: t("errors.noSubBody", {
                days: CHECKER_PLAN.trialDays,
                limit: CHECKER_PLAN.trialIdentifyLimit ?? 0,
              }),
              action: "subscription",
            };
      }
      if (status === 413) {
        return {
          variant: "neutral",
          title: t("errors.tooLargeTitle"),
          body: t("errors.tooLargeBody"),
        };
      }
      if (status === 415) {
        return {
          variant: "neutral",
          title: t("errors.unsupportedTitle"),
          body: t("errors.unsupportedBody"),
        };
      }
      if (status === 422) {
        return code === "no_result"
          ? {
              variant: "error",
              title: t("errors.noResultTitle"),
              body: t("errors.noResultBody"),
            }
          : {
              variant: "error",
              title: t("errors.notMushroomTitle"),
              body: t("errors.notMushroomBody"),
            };
      }
      if (status === 502 || status === 503) {
        return {
          variant: "neutral",
          title: t("errors.unavailableTitle"),
          body: t("errors.unavailableBody"),
          action: "retry",
        };
      }
      return {
        variant: "neutral",
        title: t("errors.genericTitle"),
        body: t("errors.genericBody"),
        action: "retry",
      };
    },
    [isTrial, limit, t],
  );

  const runIdentify = async () => {
    if (!file || !requestId) return;
    setConfirming(false);
    setAnalyzing(true);
    setStep2Done(false);
    setError(null);
    setResult(null);

    const controller = new AbortController();
    abortRef.current = controller;
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const stepTimer = setTimeout(() => setStep2Done(true), STEP2_AFTER_MS);

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
      void refreshSub();
      void checkUnlock(data as IdentifyResponse);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError({
          variant: "neutral",
          title: t("errors.timeoutTitle"),
          body: t("errors.timeoutBody"),
          action: "retry",
        });
      } else {
        setError({
          variant: "neutral",
          title: t("errors.genericTitle"),
          body: t("errors.genericBody"),
          action: "retry",
        });
      }
    } finally {
      clearTimeout(timer);
      clearTimeout(stepTimer);
      abortRef.current = null;
      setAnalyzing(false);
    }
  };

  const cancelAnalyzing = () => abortRef.current?.abort();

  const errorAction = error?.action && (
    <button
      type="button"
      onClick={() =>
        error.action === "subscription" ? router.push("/payment") : runIdentify()
      }
      className={cn(
        "flex h-12 w-full items-center justify-center rounded-3xl text-[14.5px] font-extrabold",
        error.action === "subscription"
          ? "bg-ck-amber text-ck-on-amber"
          : "border border-ck-border bg-ck-canvas text-ck-ink-3",
      )}
    >
      {error.action === "subscription" ? t("errors.limitCta") : t("errors.retry")}
    </button>
  );

  const errorCard = error && (
    <div className="ck-step-in flex flex-col gap-1.5">
      <CkStatusCard
        variant={error.variant}
        icon={error.action === "subscription" ? "◑" : "!"}
        title={error.title}
        body={error.body}
        action={errorAction || undefined}
      />
      {error.detail && (
        <span className="px-1 text-[10.5px] font-medium leading-[1.35] text-ck-muted-2">
          {error.detail}
        </span>
      )}
    </div>
  );

  /* ---------------- Анализ ---------------- */

  if (analyzing) {
    return (
      <CkScreen
        className="ck-grad-primary"
        bottom={
          <CkSecondaryButton onClick={cancelAnalyzing}>
            {t("analyzing.cancel")}
          </CkSecondaryButton>
        }
      >
        <div className="flex min-h-[70vh] flex-col items-center justify-center gap-[26px]">
          <div className="flex h-[150px] w-[150px] animate-spin items-center justify-center rounded-full border-[3px] border-ck-primary-border border-t-ck-primary [animation-duration:1.4s]">
            <div className="ck-photo-stripes h-24 w-24 overflow-hidden rounded-full">
              {previewUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              )}
            </div>
          </div>

          <div className="flex flex-col items-center gap-2.5">
            <h1 className="text-2xl font-extrabold tracking-[-0.025em] text-ck-ink">
              {t("analyzing.title")}
            </h1>
            <p className="max-w-[250px] text-center text-[13.5px] font-medium leading-[1.5] text-ck-body-soft">
              {t("analyzing.body")}
            </p>
          </div>

          <div className="flex w-full flex-col gap-2.5">
            {[
              { label: t("analyzing.step1"), done: true },
              { label: t("analyzing.step2"), done: step2Done },
              { label: t("analyzing.step3"), done: false },
            ].map((step) => (
              <div
                key={step.label}
                className={cn(
                  "flex items-center gap-2.5 text-[12.5px] font-semibold",
                  step.done ? "text-ck-primary-text" : "text-ck-muted-2",
                )}
              >
                {step.done ? (
                  <i className="flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full bg-ck-primary text-ck-on-primary">
                    <Check className="h-2.5 w-2.5" strokeWidth={4} />
                  </i>
                ) : (
                  <i className="block h-[18px] w-[18px] flex-none rounded-full border-2 border-ck-primary-border" />
                )}
                {step.label}
              </div>
            ))}
          </div>
        </div>
      </CkScreen>
    );
  }

  /* ---------------- Результат ---------------- */

  if (result) {
    const top = result.suggestions[0];
    const details = result.details;
    const habitat = result.habitat
      ? (habitatData[result.habitat.code] ?? null)
      : null;
    const habitatZone = result.habitat?.zone ?? habitat?.zone ?? null;

    /**
     * Находкой из квестов делимся своей карточкой: у неё есть страница с
     * названием вида и ссылками на приложение. Для вида вне квестов такой
     * страницы нет (название взять негде), поэтому там остаётся прежнее
     * поведение — ссылка на справочник.
     */
    const share = async () => {
      const title = top?.common_name || details.scientific_name;
      const quest = top ? findQuestSpecies(top.scientific_name) : null;

      if (quest) {
        const url = await buildShareUrl(
          {
            kind: "find",
            speciesKey: quest.species.key,
            date: new Date().toISOString().slice(0, 10),
          },
          locale,
        );
        const shared = await shareContent({
          title,
          text: t("quests.shareTextFind", { name: title }),
          url,
        });
        if (shared) return;
      }

      const url = details.wikipedia_url || details.gbif_url || undefined;
      try {
        if (navigator.share) {
          await navigator.share({ title, text: details.scientific_name, url });
        } else if (url) {
          window.open(url, "_blank", "noopener,noreferrer");
        }
      } catch {
        /* пользователь закрыл системный лист — это не ошибка */
      }
    };

    return (
      <CkScreen
        padding="px-0"
        bottom={
          /* Следующая находка начинается прямо отсюда — и камерой, и файлом
             из галереи. Возврат на главный экран остался на стрелке над
             фотографией: она и подписана «назад», а кнопки внизу — про
             следующее распознавание. */
          <div className="flex flex-col gap-2.5 px-5">
            {errorCard}
            <div className="flex gap-2.5">
              <CkPrimaryButton
                onClick={handleTakePhoto}
                className="h-14 flex-1"
              >
                <Camera
                  className="h-[19px] w-[19px]"
                  strokeWidth={2.2}
                  aria-hidden="true"
                />
                {t("result.newPhoto")}
              </CkPrimaryButton>
              <button
                type="button"
                onClick={share}
                aria-label={t("result.share")}
                className="flex h-14 w-14 flex-none items-center justify-center rounded-full border border-ck-border-3 bg-ck-surface text-ck-ink-3"
              >
                <Share2 className="h-[18px] w-[18px]" />
              </button>
            </div>
            <CkSecondaryButton onClick={handleGallery}>
              <Images
                className="h-[17px] w-[17px]"
                strokeWidth={2.1}
                aria-hidden="true"
              />
              {t("result.fromGallery")}
            </CkSecondaryButton>
          </div>
        }
      >
        {/* Фото пользователя во всю ширину + кнопка возврата */}
        <div className="ck-photo-stripes relative h-[206px] w-full overflow-hidden">
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          )}
          <button
            type="button"
            onClick={resetAll}
            aria-label={t("result.back")}
            className="absolute left-4 top-3.5 flex h-[38px] w-[38px] items-center justify-center rounded-full bg-ck-surface/90 text-ck-ink-3"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2.4} />
          </button>
        </div>

        <div className="flex flex-col gap-3.5 px-5 pt-[18px]">
          {/* Квест закрыт — первое, что видно после фотографии: иначе связь
              между распознаванием и коллекцией остаётся невидимой, и за
              прогрессом приходится ходить во вкладку самому. */}
          {unlock && <UnlockCard unlock={unlock} />}

          {top && (
            <div className="flex flex-col gap-1.5">
              <CkMono>{t("result.topMatch", { pct: pct(top.probability) })}</CkMono>
              <h1 className="text-[26px] font-extrabold leading-[1.05] tracking-[-0.03em] text-ck-ink">
                {top.common_name || top.scientific_name}
              </h1>
              {top.common_name && (
                <span className="text-sm font-medium italic text-ck-body-soft">
                  {top.scientific_name}
                </span>
              )}
            </div>
          )}

          {/* Чипы: токсичность формулируется как пометка базы, а не как
              совет о съедобности — приложение его не даёт. */}
          <div className="flex flex-wrap gap-2">
            {top?.toxic != null && (
              <span
                className={cn(
                  "rounded-full border px-3 py-[7px] text-xs font-extrabold",
                  top.toxic
                    ? "border-ck-danger-border bg-ck-danger-tint text-ck-danger-deep"
                    : "border-ck-primary-border bg-ck-primary-tint text-ck-primary-deep",
                )}
              >
                {top.toxic ? t("result.toxicChip") : t("result.edibleChip")}
              </span>
            )}
            {details.family && (
              <span className="rounded-full border border-ck-border bg-ck-surface px-3 py-[7px] text-xs font-bold text-ck-body">
                {details.family}
              </span>
            )}
            {top?.toxic_source && (
              <span className="rounded-full border border-ck-border bg-ck-surface px-3 py-[7px] text-xs font-bold text-ck-body">
                {t("result.sourceChip", { source: top.toxic_source })}
              </span>
            )}
          </div>

          {result.low_confidence && (
            <CkStatusCard
              variant="warn"
              icon="!"
              title={t("result.lowConfidence")}
            />
          )}

          {/* Возможные совпадения */}
          <div className="flex flex-col rounded-[24px] border border-ck-border bg-ck-surface px-4">
            <span className="pb-2 pt-3 text-[13px] font-extrabold text-ck-ink-2">
              {t("result.possibleMatches")}
            </span>
            {result.suggestions.map((s) => (
              <a
                key={s.rank}
                href={(s.wikipedia_url || s.gbif_url) ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 border-t border-ck-hairline py-[11px]"
              >
                <span className="ck-photo-stripes h-[52px] w-[52px] flex-none overflow-hidden rounded-[14px]">
                  {s.reference_photo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.reference_photo_url}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  )}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-sm font-extrabold text-ck-ink">
                    {s.common_name || s.scientific_name}
                  </span>
                  <span className="truncate text-xs font-medium italic text-ck-muted">
                    {s.scientific_name}
                  </span>
                </span>
                <span
                  className={cn(
                    "flex-none text-[15px] font-extrabold",
                    pctColor(s.probability),
                  )}
                >
                  {pct(s.probability)}
                </span>
              </a>
            ))}
            <span className="border-t border-ck-hairline py-3 text-[10.5px] font-medium leading-[1.4] text-ck-muted-2">
              {t("result.referenceNote")}
            </span>
          </div>

          {/* О виде */}
          {(details.family || details.genus || details.summary || habitatZone) && (
            <div className="flex flex-col gap-2.5 rounded-[24px] border border-ck-border bg-ck-surface p-4">
              <span className="text-[15px] font-extrabold text-ck-ink-2">
                {t("result.aboutTitle")}
              </span>
              <div className="grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-1.5 text-[12.5px]">
                {details.family && (
                  <>
                    <span className="text-ck-muted-2">{t("result.family")}</span>
                    <b className="font-bold text-ck-ink">{details.family}</b>
                  </>
                )}
                {details.genus && (
                  <>
                    <span className="text-ck-muted-2">{t("result.genus")}</span>
                    <b className="font-bold text-ck-ink">{details.genus}</b>
                  </>
                )}
                {habitatZone && (
                  <>
                    <span className="text-ck-muted-2">{t("result.habitat")}</span>
                    <b className="font-bold text-ck-ink">{habitatZone}</b>
                  </>
                )}
              </div>
              {details.summary && (
                <p className="text-[12.5px] font-medium leading-[1.5] text-ck-body-soft">
                  {details.summary}
                </p>
              )}
            </div>
          )}

          {/* Опасные двойники */}
          {result.lookalikes.length > 0 && (
            <div className="flex flex-col gap-3 rounded-[24px] border border-ck-danger-border bg-ck-danger-tint p-4">
              <div className="flex items-center gap-2.5">
                <i className="flex h-[26px] w-[26px] items-center justify-center rounded-[9px] bg-ck-danger text-sm font-extrabold text-ck-on-danger">
                  !
                </i>
                <span className="text-[15px] font-extrabold text-ck-danger-deep">
                  {t("result.lookalikesTitle")}
                </span>
              </div>
              {result.lookalikes.map((la) => (
                <div key={la.scientific_name} className="flex items-center gap-3">
                  <span className="ck-photo-stripes-danger h-14 w-14 flex-none overflow-hidden rounded-2xl">
                    {la.photo_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={la.photo_url}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    )}
                  </span>
                  <div className="flex min-w-0 flex-col gap-[3px]">
                    <span className="text-[13.5px] font-extrabold text-ck-danger-deep">
                      {la.scientific_name}
                    </span>
                    <span className="text-[11.5px] font-medium leading-[1.35] text-ck-danger-mid">
                      {la.label ?? lookalikeLabels[la.scientific_name] ?? ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Чеклист самопроверки */}
          <div className="flex flex-col gap-2.5 rounded-[24px] border border-ck-border bg-ck-surface p-4">
            <span className="text-[15px] font-extrabold text-ck-ink-2">
              {t("result.checkTitle")}
            </span>
            <div className="flex flex-col gap-2.5">
              {checklist.map((item, i) => {
                const on = checked.includes(i);
                return (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      setChecked((prev) =>
                        prev.includes(i)
                          ? prev.filter((n) => n !== i)
                          : [...prev, i],
                      )
                    }
                    className="flex items-start gap-2.5 text-left text-[12.5px] font-semibold text-ck-body"
                  >
                    <i
                      className={cn(
                        "mt-px flex h-5 w-5 flex-none items-center justify-center rounded-[7px] border-[1.5px]",
                        on
                          ? "border-ck-primary bg-ck-primary text-ck-on-primary"
                          : "border-ck-primary-border",
                      )}
                    >
                      {on && <Check className="h-3 w-3" strokeWidth={3.5} />}
                    </i>
                    {item}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Дисклеймер — обязателен для App Review */}
          <p className="text-[10.5px] font-medium leading-[1.45] text-ck-muted">
            {t("result.disclaimer")}
          </p>
        </div>
      </CkScreen>
    );
  }

  /* ---------------- Превью выбранного фото ---------------- */

  if (previewUrl) {
    // Счётчик есть только в пробном периоде: в подписке лимита нет.
    // При исчерпанном лимите кнопка блокируется, ведём на подписку.
    const exhausted = left != null && left <= 0;
    const used =
      limit != null && left != null && !exhausted ? limit - left + 1 : null;
    return (
      <>
        <CkScreen
          bottom={
            <div className="flex flex-col gap-2.5">
              <CkPrimaryButton
                onClick={() => setConfirming(true)}
                disabled={exhausted}
              >
                {t("preview.identify")}
                {used != null && limit != null && (
                  <span className="text-[13px] font-semibold opacity-85">
                    {t("preview.counter", { used, limit })}
                  </span>
                )}
              </CkPrimaryButton>
              {/* Заменить кадр можно обоими способами: ошибиться легко и в
                  съёмке, и в выборе файла, а одной «переснять» из превью
                  выхода к галерее не было — только сброс всего экрана. */}
              <div className="flex gap-2.5">
                <CkSecondaryButton onClick={handleTakePhoto} className="flex-1">
                  <Camera
                    className="h-[17px] w-[17px]"
                    strokeWidth={2.1}
                    aria-hidden="true"
                  />
                  {t("preview.retake")}
                </CkSecondaryButton>
                <CkSecondaryButton onClick={handleGallery} className="flex-1">
                  <Images
                    className="h-[17px] w-[17px]"
                    strokeWidth={2.1}
                    aria-hidden="true"
                  />
                  {t("preview.gallery")}
                </CkSecondaryButton>
              </div>
            </div>
          }
        >
          <div className="flex flex-col gap-4 pt-[18px]">
            <h1 className="text-[22px] font-extrabold tracking-[-0.025em] text-ck-ink">
              {t("preview.title")}
            </h1>

            <div className="relative h-[330px] overflow-hidden rounded-[28px] border border-ck-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>

            {errorCard}

            {/* Лимит исчерпан ещё до отправки: объясняем заблокированную
                кнопку и сразу даём дорогу на пейволл. */}
            {!error && exhausted && (
              <CkStatusCard
                variant="warn"
                icon="◑"
                title={t("errors.limitTitle")}
                body={t("errors.limitBody", {
                  limit: limit ?? CHECKER_PLAN.trialIdentifyLimit ?? 0,
                })}
                action={
                  <button
                    type="button"
                    onClick={() => router.push("/payment")}
                    className="flex h-12 w-full items-center justify-center rounded-3xl bg-ck-amber text-[14.5px] font-extrabold text-ck-on-amber"
                  >
                    {t("errors.limitCta")}
                  </button>
                }
              />
            )}

            {!error && !exhausted && (
              <div className="flex flex-col gap-2 rounded-[22px] border border-ck-border-2 bg-ck-surface p-4">
                <span className="text-[13px] font-extrabold text-ck-ink-2">
                  {t("preview.beforeTitle")}
                </span>
                <span className="text-[12.5px] font-medium leading-[1.45] text-ck-body-soft">
                  {unlimited
                    ? t("preview.beforeBodyUnlimited")
                    : t("preview.beforeBody")}
                </span>
              </div>
            )}
          </div>
        </CkScreen>

        <CkModal
          open={confirming}
          onClose={() => setConfirming(false)}
          label={t("confirm.cancel")}
        >
          <div className="flex flex-col gap-4">
            <div className="flex h-[52px] w-[52px] items-center justify-center rounded-[18px] bg-ck-primary-tint text-ck-primary-text">
              <Camera className="h-[22px] w-[22px]" strokeWidth={1.8} />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-[21px] font-extrabold tracking-[-0.02em] text-ck-ink">
                {t("confirm.title")}
              </span>
              <span className="text-[13.5px] font-medium leading-[1.5] text-ck-body-soft">
                {t("confirm.body")}
              </span>
            </div>

            {left != null && (
              <div className="flex flex-col rounded-[20px] border border-ck-border-2 bg-ck-canvas-2 px-4 py-1.5">
                {[
                  { label: t("confirm.thisScan"), value: "1", accent: false },
                  {
                    label: t("confirm.leftInTrial"),
                    value: String(left),
                    accent: false,
                  },
                  {
                    label: t("confirm.afterScan"),
                    value: String(Math.max(0, left - 1)),
                    accent: true,
                  },
                ].map((row, i) => (
                  <div
                    key={row.label}
                    className={cn(
                      "flex justify-between py-[11px] text-[13.5px] font-semibold text-ck-body",
                      i > 0 && "border-t border-ck-hairline",
                    )}
                  >
                    <span>{row.label}</span>
                    <span
                      className={cn(
                        "font-extrabold",
                        row.accent ? "text-ck-primary-text" : "text-ck-ink",
                      )}
                    >
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-2.5">
              <CkPrimaryButton
                onClick={runIdentify}
                className="h-14 text-[16.5px] shadow-none"
              >
                {t("confirm.cta")}
              </CkPrimaryButton>
              <CkQuietButton onClick={() => setConfirming(false)}>
                {t("confirm.cancel")}
              </CkQuietButton>
            </div>
          </div>
        </CkModal>
      </>
    );
  }

  /* ---------------- Главный экран ---------------- */

  /**
   * Порядок блоков задан требованиями к первому экрану, а не вкусом:
   *
   *  - пустой рамки «здесь будет фото» больше нет — в начале сеанса фото нет,
   *    и 206px под заглушку отбирали место у того, ради чего экран открыли;
   *  - две кнопки съёмки — самый крупный и самый контрастный элемент;
   *  - предупреждение «не ешьте гриб по результату» стоит прямо над ними и
   *    видно без прокрутки: это требование безопасности, а не сноска;
   *  - подсказки по съёмке сжаты в одну полосу, подробности — в листе
   *    (CheckerShootingTips);
   *  - про безлимит в подписке главный экран больше не говорит: об этом
   *    рассказывает экран подписки, здесь остаётся только то, что влияет на
   *    следующее действие (сколько распознаваний осталось в триале).
   *
   * Высоты подобраны так, чтобы экран целиком помещался без прокрутки на
   * 568px (iPhone SE 1-го поколения) с учётом шапки и нижнего меню.
   *
   * Заголовок с карточкой триала центрированы по вертикали в свободной части
   * экрана (`centerContent`), а блок действий остаётся прижатым к низу.
   * На iPhone SE свободной части нет, и центрирование ничего не двигает; на
   * 6.7" без него между карточкой и предупреждением зияло около 380pt пустоты
   * — она осталась от убранной рамки под фото. Прижимать действия вверх вместе
   * с заголовком нельзя: предупреждение должно стоять вплотную над кнопками,
   * а кнопки — в зоне большого пальца.
   */
  return (
    <CkScreen
      centerContent
      bottom={
        <div className="ck-home-actions flex flex-col gap-2.5">
          <div className="ck-home-safety flex items-start gap-2.5 rounded-[20px] border border-ck-amber-border bg-ck-amber-tint px-3.5 py-3">
            <i
              aria-hidden="true"
              className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-[9px] bg-ck-surface text-[14px] font-extrabold text-ck-amber"
            >
              !
            </i>
            <p className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[13px] font-extrabold leading-[1.3] text-ck-amber-deep">
                {t("home.safetyTitle")}
              </span>
              <span className="text-[11.5px] font-medium leading-[1.35] text-ck-amber-mid">
                {t("home.safetyBody")}
              </span>
            </p>
          </div>

          <CkPrimaryButton onClick={handleTakePhoto}>
            <Camera className="h-[19px] w-[19px]" strokeWidth={2.2} aria-hidden="true" />
            {t("home.takePhoto")}
          </CkPrimaryButton>
          <CkSecondaryButton onClick={handleGallery}>
            <Images className="h-[17px] w-[17px]" strokeWidth={2.1} aria-hidden="true" />
            {t("home.fromGallery")}
          </CkSecondaryButton>

          <CheckerShootingTips />
        </div>
      }
    >
      <div className="ck-home-top flex flex-col gap-3.5 pt-4">
        <h1 className="ck-home-title text-[34px] font-extrabold leading-[1.0] tracking-[-0.035em] text-ck-ink">
          {t("home.titleLine1")}
          <br />
          <span className="text-ck-primary-text">{t("home.titleLine2")}</span>
        </h1>

        {/* Фотография находки между заголовком и кнопками съёмки. Кадр —
            обрывок бумаги с прозрачными рваными краями: холст под ним разный
            в тёмной и светлой схеме, залитые края выдали бы прямоугольник.
            Высоту ограничивает `.ck-home-photo` (src/styles/flavors/checker.css):
            предупреждение над кнопками обязано оставаться видимым без
            прокрутки, поэтому на низких экранах снимок уступает место ему. */}
        <Image
          src="/checker/home-mushroom.webp"
          alt=""
          width={1080}
          height={810}
          priority
          sizes="(max-width: 520px) 100vw, 480px"
          className="ck-home-photo"
        />

        {/* Состояние подписки. В оплаченной подписке карточки нет вовсе:
            лимита нет, решать нечего, а место на первом экране дорого. */}
        {!subLoading &&
          !unlimited &&
          (subscription ? (
            <Link
              href="/payment"
              className="ck-home-quota flex items-center gap-3 rounded-[22px] border border-ck-amber-border bg-ck-amber-tint px-4 py-3"
            >
              <span className="text-[24px] font-extrabold leading-none text-ck-amber">
                {left ?? 0}
              </span>
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[12.5px] font-medium leading-[1.35] text-ck-amber-mid">
                  {left === 0
                    ? t("home.quotaTrialEnded")
                    : t("home.quotaTrialLeft", {
                        limit: limit ?? CHECKER_PLAN.trialIdentifyLimit ?? 0,
                      })}
                </span>
                {trialEndsDate && (
                  <CkMono className="text-ck-amber-mid">
                    {tSub("quotaReset", { date: trialEndsDate })}
                  </CkMono>
                )}
              </div>
            </Link>
          ) : (
            <Link
              href="/payment"
              className="ck-home-quota flex items-center gap-3 rounded-[22px] border border-ck-primary-border bg-ck-primary-tint px-4 py-3"
            >
              <span className="text-[24px] font-extrabold leading-none text-ck-primary-text">
                {CHECKER_PLAN.trialDays}
              </span>
              <span className="text-[12.5px] font-medium leading-[1.35] text-ck-primary-mid">
                {t("home.quotaNoSub", { days: CHECKER_PLAN.trialDays })}
              </span>
            </Link>
          ))}

        {errorCard}
      </div>
    </CkScreen>
  );
}

/* ------------------------------------------------------------------ */
/* Закрытый квест                                                      */
/* ------------------------------------------------------------------ */

/**
 * Карточка «квест закрыт» в результате распознавания.
 *
 * Показывается только на новой находке (см. `unlockFrom`): повторный снимок
 * того же гриба ничего не празднует. Заголовок выбирается по самому крупному
 * событию — все виды, потом уровень, потом отдельный квест.
 */
function UnlockCard({ unlock }: { unlock: QuestUnlock }) {
  const t = useTranslations("checker");
  const tq = useTranslations("checker.quests");
  const locale = useLocale();
  const level = unlock.counts.levels.find((item) => item.id === unlock.levelId);

  const title = unlock.allDone
    ? tq("allDoneTitle")
    : unlock.levelComplete
      ? t("result.levelDone", { level: unlock.levelId })
      : t("result.questDone");

  // Закрытым уровнем делимся карточкой уровня, отдельным квестом — карточкой
  // вида: получатель должен увидеть именно то, что произошло.
  const share = async () => {
    const url = await buildShareUrl(
      unlock.levelComplete
        ? {
            kind: "level",
            levelId: unlock.levelId,
            found: level?.found ?? 0,
            total: level?.total ?? 0,
          }
        : {
            kind: "find",
            speciesKey: unlock.speciesKey,
            date: new Date().toISOString().slice(0, 10),
          },
      locale,
    );
    await shareContent({
      title,
      text: unlock.levelComplete
        ? tq("shareTextLevel", {
            level: unlock.levelId,
            found: unlock.counts.found,
            total: unlock.counts.total,
          })
        : tq("shareTextFind", { name: tq(`species.${unlock.speciesKey}`) }),
      url,
    });
  };

  return (
    <div className="ck-step-in flex flex-col gap-3 rounded-[24px] border border-ck-primary-border bg-ck-primary-tint p-4">
      <div className="flex items-center gap-3">
        <CheckerMedal
          level={unlock.levelId}
          found={level?.found ?? 0}
          total={level?.total ?? 0}
          size={44}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[14.5px] font-extrabold leading-[1.25] text-ck-primary-deep">
            {title}
          </span>
          <span className="text-[11.5px] font-medium leading-[1.35] text-ck-primary-mid">
            {t("result.questProgress", {
              found: unlock.counts.found,
              total: unlock.counts.total,
            })}
            {unlock.rankUp
              ? ` · ${t("result.rankUp", { rank: tq(`ranks.${unlock.rankUp}`) })}`
              : ""}
          </span>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void share()}
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-ck-primary text-[14px] font-extrabold text-ck-on-primary"
        >
          <Share2 className="h-4 w-4" strokeWidth={2.4} />
          {t("result.share")}
        </button>
        <Link
          href="/dashboard/quests"
          className="flex h-11 flex-1 items-center justify-center rounded-full border border-ck-primary-border bg-ck-surface text-[14px] font-extrabold text-ck-primary-text"
        >
          {t("result.openQuests")}
        </Link>
      </div>
    </div>
  );
}