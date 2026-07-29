"use client";

/**
 * Вкладка «Квесты» Mushroom Checker.
 *
 * Три уровня по пять видов: от грибов, которые попадаются под ногами в парке,
 * до тех, за которыми надо идти в лес в свой сезон. Вид засчитывается, когда
 * он оказался ПЕРВЫМ по вероятности в каком-нибудь распознавании — это то же
 * поле `top_species`, что показывает «История», поэтому отдельного хранилища
 * прогресса нет и рассинхронизироваться ему не с чем.
 *
 * Уровни не заперты друг за другом: находка редкого гриба засчитывается сразу,
 * даже если первый уровень ещё не закрыт. Замок здесь только отнимал бы
 * прогресс за то, что человеку повезло раньше времени.
 *
 * Состав уровней правится в одном файле — `src/lib/checker/quests.ts`.
 */

import { Check, ExternalLink } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { openExternal } from "@/lib/checker/externalLinks";
import {
  formatHistoryDate,
  questProgressFrom,
  useCheckerHistory,
  type QuestLevelProgress,
  type QuestSpeciesProgress,
} from "@/lib/checker/history";
import { speciesReferenceUrl } from "@/lib/checker/quests";
import { cn } from "@/lib/utils";
import { CkMono, CkScreen, CkStatusCard } from "@/components/checker/primitives";

function ProgressBar({
  value,
  total,
  complete,
}: {
  value: number;
  total: number;
  complete: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className="block h-[6px] w-full overflow-hidden rounded-full bg-ck-field"
    >
      <span
        className={cn(
          "block h-full rounded-full transition-[width] duration-500",
          complete ? "bg-ck-primary" : "bg-ck-primary-light",
        )}
        style={{ width: `${total > 0 ? (value / total) * 100 : 0}%` }}
      />
    </span>
  );
}

function SpeciesRow({
  item,
  first,
}: {
  item: QuestSpeciesProgress;
  first: boolean;
}) {
  const t = useTranslations("checker.quests");
  const locale = useLocale();
  const found = item.found;
  const name = t(`species.${item.species.key}`);
  const warning = item.species.warning
    ? t(`warnings.${item.species.key}`)
    : null;
  // Найденный вид ведёт на статью из своего же результата, ненайденный — на
  // справку iNaturalist. И то и другое — информация о виде, а не о сборе.
  const url = found?.readMoreUrl ?? speciesReferenceUrl(item.species.scientificName);
  const image = found?.photoUrl ?? found?.referencePhotoUrl ?? null;

  return (
    <button
      type="button"
      onClick={() => void openExternal(url)}
      aria-label={[
        found
          ? t("foundOn", {
              name,
              date: formatHistoryDate(found.createdAt, locale),
            })
          : t("notFoundHint", { name }),
        warning,
      ]
        .filter(Boolean)
        .join(". ")}
      className={cn(
        "flex min-h-[64px] w-full items-center gap-3 py-2.5 text-left",
        !first && "border-t border-ck-hairline",
      )}
    >
      <span
        className={cn(
          "flex h-11 w-11 flex-none items-center justify-center overflow-hidden rounded-[15px]",
          found ? "ck-photo-stripes" : "border border-dashed border-ck-border-3",
        )}
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className={cn(
              "text-[15px] font-extrabold leading-none",
              found ? "text-ck-primary-text" : "text-ck-muted-2",
            )}
          >
            ?
          </span>
        )}
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <span
          className={cn(
            "truncate text-[14px] font-extrabold",
            found ? "text-ck-ink" : "text-ck-body-soft",
          )}
        >
          {name}
        </span>
        <span className="truncate text-[11.5px] font-medium italic text-ck-muted-2">
          {item.species.scientificName}
        </span>
        {found && (
          <span className="truncate text-[11px] font-semibold text-ck-primary-text">
            {t("foundLabel", {
              date: formatHistoryDate(found.createdAt, locale),
            })}
          </span>
        )}
        {/* Опасный двойник или спорная съедобность — рядом с названием, а не
            в конце экрана: цель квеста нельзя показывать без этой строки. */}
        {warning && (
          <span className="flex gap-1.5 pt-0.5 text-[11px] font-semibold leading-[1.35] text-ck-amber-deep">
            <span aria-hidden="true" className="flex-none font-extrabold">
              !
            </span>
            {warning}
          </span>
        )}
      </span>

      {found ? (
        <i
          aria-hidden="true"
          className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-ck-primary text-ck-on-primary"
        >
          <Check className="h-3.5 w-3.5" strokeWidth={3.5} />
        </i>
      ) : (
        <ExternalLink
          className="h-4 w-4 flex-none text-ck-muted-2"
          aria-hidden="true"
        />
      )}
    </button>
  );
}

function LevelCard({ progress }: { progress: QuestLevelProgress }) {
  const t = useTranslations("checker.quests");
  const locale = useLocale();
  const { level, complete, foundCount, total } = progress;

  // Уровень закрыт последней по времени находкой из его пяти видов.
  const completedAt = complete
    ? progress.species
        .map((item) => item.found!.createdAt)
        .sort()
        .at(-1)!
    : null;

  return (
    <section
      className={cn(
        "flex flex-col gap-3 rounded-[26px] border p-4",
        complete
          ? "border-ck-primary-border bg-ck-primary-tint"
          : "border-ck-border bg-ck-surface",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <CkMono className={complete ? "text-ck-primary-mid" : undefined}>
            {t("levelBadge", { n: level.id })}
          </CkMono>
          <h2
            className={cn(
              "text-[17px] font-extrabold tracking-[-0.02em]",
              complete ? "text-ck-primary-deep" : "text-ck-ink",
            )}
          >
            {t(`levels.${level.key}.title`)}
          </h2>
          <p
            className={cn(
              "text-[12px] font-medium leading-[1.4]",
              complete ? "text-ck-primary-mid" : "text-ck-body-soft",
            )}
          >
            {t(`levels.${level.key}.hint`)}
          </p>
        </div>
        <span
          className={cn(
            "flex-none rounded-full border px-2.5 py-1 text-[12px] font-extrabold",
            complete
              ? "border-ck-primary-border bg-ck-surface text-ck-primary-text"
              : "border-ck-border-3 bg-ck-canvas text-ck-ink-3",
          )}
        >
          {foundCount}/{total}
        </span>
      </div>

      <ProgressBar value={foundCount} total={total} complete={complete} />

      {complete && completedAt && (
        <span className="text-[12px] font-extrabold text-ck-primary-deep">
          {t("levelDone", { date: formatHistoryDate(completedAt, locale) })}
        </span>
      )}

      <div
        className={cn(
          "flex flex-col rounded-[20px] border px-3.5",
          complete ? "border-ck-primary-border bg-ck-surface" : "border-ck-border-2 bg-ck-canvas-2",
        )}
      >
        {progress.species.map((item, i) => (
          <SpeciesRow key={item.species.key} item={item} first={i === 0} />
        ))}
      </div>
    </section>
  );
}

export function CheckerQuests() {
  const t = useTranslations("checker.quests");
  const { entries, loading, failed, reload } = useCheckerHistory();
  const progress = questProgressFrom(entries);
  const allDone = progress.foundCount === progress.total;

  return (
    <CkScreen>
      <div className="flex flex-col gap-4 pb-4 pt-4">
        <header className="flex flex-col gap-2">
          <h1 className="text-[28px] font-extrabold leading-[1.05] tracking-[-0.03em] text-ck-ink">
            {t("title")}
          </h1>
          <p className="text-[12.5px] font-medium leading-[1.4] text-ck-body-soft">
            {t("subtitle")}
          </p>
          {!loading && (
            <div className="flex flex-col gap-1.5 pt-1">
              <div className="flex items-baseline justify-between">
                <CkMono>{t("overall")}</CkMono>
                <span className="text-[13px] font-extrabold text-ck-ink">
                  {t("overallCount", {
                    found: progress.foundCount,
                    total: progress.total,
                  })}
                </span>
              </div>
              <ProgressBar
                value={progress.foundCount}
                total={progress.total}
                complete={allDone}
              />
            </div>
          )}
        </header>

        {/* Дисклеймер безопасности виден в разделе всегда, а не после
            прокрутки: квест — это «сфотографируй и определи», и раздел не
            должен читаться как список того, что можно набрать в корзину. */}
        <div className="flex items-start gap-2.5 rounded-[20px] border border-ck-amber-border bg-ck-amber-tint px-3.5 py-3">
          <i
            aria-hidden="true"
            className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-[9px] bg-ck-surface text-[14px] font-extrabold text-ck-amber"
          >
            !
          </i>
          <p className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[13px] font-extrabold leading-[1.3] text-ck-amber-deep">
              {t("safetyTitle")}
            </span>
            <span className="text-[11.5px] font-medium leading-[1.35] text-ck-amber-mid">
              {t("safetyBody")}
            </span>
          </p>
        </div>

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

        {!loading && !failed && allDone && (
          <CkStatusCard
            variant="success"
            icon="★"
            title={t("allDoneTitle")}
            body={t("allDoneBody")}
          />
        )}

        {progress.levels.map((level) => (
          <LevelCard key={level.level.key} progress={level} />
        ))}

        <p className="px-1 text-[10.5px] font-medium leading-[1.45] text-ck-muted-2">
          {t("note")}
        </p>
      </div>
    </CkScreen>
  );
}
