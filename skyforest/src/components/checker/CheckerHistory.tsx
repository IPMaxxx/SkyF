"use client";

/**
 * Вкладка «История» Mushroom Checker.
 *
 * Показывает топ-1 результат каждого распознавания: фото пользователя (или
 * снимок вида из справочника, если своё не сохранилось), название, дату,
 * уверенность и ссылку «почитать». Данные лежат в `mushroom_identifications`
 * с самого запуска распознавания — экран только читает их (см.
 * `src/lib/checker/history.ts`), новых таблиц под это не заводилось.
 *
 * Ссылка открывается системным браузером поверх приложения: страницы
 * Википедии и GBIF внутри WebView оставили бы пользователя без навигации.
 */

import { ExternalLink } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CHECKER_HOME } from "@/lib/checker/backNavigation";
import { openExternal } from "@/lib/checker/externalLinks";
import {
  formatHistoryDate,
  useCheckerHistory,
  type CheckerHistoryEntry,
} from "@/lib/checker/history";
import { cn } from "@/lib/utils";
import { CkScreen, CkStatusCard } from "@/components/checker/primitives";

function pct(probability: number): string {
  return `${Math.round(probability * 100)}%`;
}

function pctColor(probability: number): string {
  if (probability >= 0.5) return "text-ck-primary-text";
  if (probability >= 0.3) return "text-ck-amber";
  return "text-ck-muted-2";
}

function HistoryRow({
  entry,
  first,
}: {
  entry: CheckerHistoryEntry;
  first: boolean;
}) {
  const t = useTranslations("checker.history");
  const locale = useLocale();
  const title = entry.commonName || entry.scientificName;
  const image = entry.photoUrl ?? entry.referencePhotoUrl;

  return (
    <button
      type="button"
      onClick={() => void openExternal(entry.readMoreUrl)}
      aria-label={t("readMoreOf", { name: title })}
      className={cn(
        "flex min-h-[76px] w-full items-center gap-3 py-3 text-left",
        !first && "border-t border-ck-hairline",
      )}
    >
      <span className="ck-photo-stripes h-[58px] w-[58px] flex-none overflow-hidden rounded-[18px]">
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
        )}
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <span className="truncate text-[14.5px] font-extrabold text-ck-ink">
          {title}
        </span>
        {entry.commonName && (
          <span className="truncate text-[11.5px] font-medium italic text-ck-muted">
            {entry.scientificName}
          </span>
        )}
        <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-ck-muted-2">
          {formatHistoryDate(entry.createdAt, locale)}
          <span aria-hidden="true">·</span>
          <span className={pctColor(entry.probability)}>
            {pct(entry.probability)}
          </span>
        </span>
      </span>

      <ExternalLink
        className="h-4 w-4 flex-none text-ck-muted-2"
        aria-hidden="true"
      />
    </button>
  );
}

export function CheckerHistory() {
  const t = useTranslations("checker.history");
  const { entries, loading, failed, reload } = useCheckerHistory();

  return (
    <CkScreen>
      <div className="flex flex-col gap-4 pb-4 pt-4">
        <header className="flex flex-col gap-1">
          <h1 className="text-[28px] font-extrabold leading-[1.05] tracking-[-0.03em] text-ck-ink">
            {t("title")}
          </h1>
          <p className="text-[12.5px] font-medium leading-[1.4] text-ck-body-soft">
            {loading
              ? t("subtitleLoading")
              : t("subtitle", { count: entries.length })}
          </p>
        </header>

        {loading && (
          <div className="flex flex-col rounded-[26px] border border-ck-border bg-ck-surface px-[18px]">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={cn(
                  "flex min-h-[76px] items-center gap-3 py-3",
                  i > 0 && "border-t border-ck-hairline",
                )}
              >
                <span className="ck-photo-stripes h-[58px] w-[58px] flex-none rounded-[18px]" />
                {/* Цвет заглушек — `ck-border-3`, а не `ck-field`: в светлой
                    схеме поле и поверхность карточки оба белые, и полоски на
                    ней пропадали — виднелись только штрихованные квадраты. */}
                <span className="flex flex-1 flex-col gap-2">
                  <span className="h-3 w-2/3 rounded-full bg-ck-border-3" />
                  <span className="h-2.5 w-1/3 rounded-full bg-ck-border-3" />
                </span>
              </div>
            ))}
          </div>
        )}

        {!loading && failed && (
          <CkStatusCard
            variant="neutral"
            icon="!"
            title={t("failedTitle")}
            body={t("failedBody")}
            action={
              <button
                type="button"
                onClick={() => void reload()}
                className="flex h-12 w-full items-center justify-center rounded-3xl border border-ck-border bg-ck-canvas text-[14.5px] font-extrabold text-ck-ink-3"
              >
                {t("retry")}
              </button>
            }
          />
        )}

        {!loading && !failed && entries.length === 0 && (
          <div className="flex flex-col items-center gap-4 rounded-[26px] border border-ck-border bg-ck-surface px-5 py-8 text-center">
            <span
              aria-hidden="true"
              className="flex h-[58px] w-[58px] items-center justify-center rounded-full bg-ck-primary-tint text-[24px] leading-none text-ck-primary-text"
            >
              ◠
            </span>
            <div className="flex flex-col gap-1.5">
              <span className="text-[16px] font-extrabold text-ck-ink">
                {t("emptyTitle")}
              </span>
              <span className="text-[12.5px] font-medium leading-[1.45] text-ck-body-soft">
                {t("emptyBody")}
              </span>
            </div>
            <Link
              href={CHECKER_HOME}
              className="ck-btn ck-btn-primary h-[52px] text-[15.5px]"
            >
              {t("emptyCta")}
            </Link>
          </div>
        )}

        {!loading && entries.length > 0 && (
          <>
            <div className="flex flex-col rounded-[26px] border border-ck-border bg-ck-surface px-[18px]">
              {entries.map((entry, i) => (
                <HistoryRow key={entry.id} entry={entry} first={i === 0} />
              ))}
            </div>
            <p className="px-1 text-[10.5px] font-medium leading-[1.45] text-ck-muted-2">
              {t("note")}
            </p>
          </>
        )}
      </div>
    </CkScreen>
  );
}
