"use client";

/**
 * Вкладка «Квесты» Mushroom Checker — коллекция из пятнадцати видов.
 *
 * Три уровня по пять видов: от грибов, которые попадаются под ногами в парке,
 * до тех, за которыми надо идти в лес в свой сезон. Вид засчитывается, когда
 * он оказался ПЕРВЫМ по вероятности в каком-нибудь распознавании — это то же
 * поле `top_species`, что показывает «История», поэтому отдельного хранилища
 * прогресса нет и рассинхронизироваться ему не с чем.
 *
 * ПОЧЕМУ ПЛИТКИ, А НЕ СПИСОК. Наградой за находку должна быть фотография, а не
 * галочка в строке: собственный снимок в плитке — это то, ради чего в квест
 * возвращаются. Заодно пятнадцать плиток занимают полтора экрана вместо
 * четырёх, поэтому второй и третий уровни существуют для пользователя, а не
 * лежат за пределами прокрутки.
 *
 * ЧТО УШЛО В ШИТ. Латынь, дата, уверенность, подсказка «где и когда» и
 * предупреждение о двойниках открываются по тапу на плитку. Предупреждение
 * при этом не спрятано: у такой плитки стоит амбровый значок, а полный текст
 * показывается там, где на вид смотрят, — и в результате распознавания.
 *
 * Уровни не заперты друг за другом: находка редкого гриба засчитывается сразу,
 * даже если первый уровень ещё не закрыт. Закрытый уровень сворачивается в
 * полоску миниатюр, чтобы место на экране доставалось тому, что осталось.
 *
 * Состав уровней правится в одном файле — `src/lib/checker/quests.ts`.
 */

import { useEffect, useState } from "react";
import { Camera, Check, ChevronDown, ExternalLink, Share2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { clearQuestsUnseen, rankFor } from "@/lib/checker/achievements";
import { CHECKER_HOME } from "@/lib/checker/backNavigation";
import { openExternal } from "@/lib/checker/externalLinks";
import { buildShareUrl, shareContent } from "@/lib/checker/share";
import {
  formatHistoryDate,
  questProgressFrom,
  useCheckerHistory,
  type QuestLevelProgress,
  type QuestSpeciesProgress,
} from "@/lib/checker/history";
import { speciesReferenceUrl } from "@/lib/checker/quests";
import { cn } from "@/lib/utils";
import { CheckerMedal } from "@/components/checker/CheckerMedal";
import { CheckerProgressPips } from "@/components/checker/CheckerProgressPips";
import { MushroomShapeIcon } from "@/components/checker/MushroomShapeIcon";
import {
  CkMono,
  CkScreen,
  CkSheet,
  CkStatusCard,
} from "@/components/checker/primitives";

/** Найденный вид ведёт на статью из своего же результата, ненайденный — на справку. */
function speciesUrl(item: QuestSpeciesProgress): string {
  return (
    item.found?.readMoreUrl ?? speciesReferenceUrl(item.species.scientificName)
  );
}

function speciesImage(item: QuestSpeciesProgress): string | null {
  return item.found?.photoUrl ?? item.found?.referencePhotoUrl ?? null;
}

/* ------------------------------------------------------------------ */
/* Плитка вида                                                         */
/* ------------------------------------------------------------------ */

function SpeciesTile({
  item,
  onOpen,
}: {
  item: QuestSpeciesProgress;
  onOpen: () => void;
}) {
  const t = useTranslations("checker.quests");
  const name = t(`species.${item.species.key}`);
  const found = item.found;
  const image = speciesImage(item);

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={found ? t("openFound", { name }) : t("openTarget", { name })}
      className={cn(
        "relative flex aspect-square overflow-hidden rounded-[20px] border text-left",
        found
          ? "border-ck-primary-border"
          : "border-dashed border-ck-border-3 bg-ck-canvas-2",
      )}
    >
      {found ? (
        <>
          <span className="ck-photo-stripes absolute inset-0">
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
          <span className="ck-photo-veil absolute inset-x-0 bottom-0 px-2 pb-1.5 pt-6">
            <span className="line-clamp-2 text-[10.5px] font-extrabold leading-[1.2] text-white">
              {name}
            </span>
          </span>
          <i
            aria-hidden="true"
            className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ck-primary text-ck-on-primary"
          >
            <Check className="h-3 w-3" strokeWidth={3.5} />
          </i>
        </>
      ) : (
        <span className="flex flex-1 flex-col items-center justify-center gap-1.5 px-1.5 py-2 text-center">
          <MushroomShapeIcon
            shape={item.species.shape}
            className="h-9 w-9 text-ck-border-3"
          />
          <span className="line-clamp-2 text-[10.5px] font-bold leading-[1.2] text-ck-muted-2">
            {name}
          </span>
        </span>
      )}

      {/* Опасный двойник виден и на плитке: полный текст в шите, но сам факт
          нельзя оставлять только за тапом. */}
      {item.species.warning && (
        <i
          aria-hidden="true"
          className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ck-amber text-[12px] font-extrabold text-ck-on-amber"
        >
          !
        </i>
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Глава-уровень                                                       */
/* ------------------------------------------------------------------ */

function LevelSection({
  progress,
  onOpen,
}: {
  progress: QuestLevelProgress;
  onOpen: (key: string) => void;
}) {
  const t = useTranslations("checker.quests");
  const locale = useLocale();
  const { level, complete, foundCount, total } = progress;

  // Закрытый уровень свёрнут, открытый развёрнут; override — выбор пользователя.
  // Состояние держим отдельным полем, чтобы прилетевшие данные не сбрасывали
  // уже сделанный выбор и не пришлось синхронизировать это эффектом.
  const [override, setOverride] = useState<boolean | null>(null);
  const expanded = override ?? !complete;

  // Уровень закрыт последней по времени находкой из его пяти видов.
  const completedAt = complete
    ? progress.species
        .map((item) => item.found!.createdAt)
        .sort()
        .at(-1)!
    : null;

  return (
    <section className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setOverride(!expanded)}
        aria-expanded={expanded}
        className="flex items-center gap-3 text-left"
      >
        <CheckerMedal level={level.id} found={foundCount} total={total} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span
            className={cn(
              "text-[16px] font-extrabold tracking-[-0.02em]",
              complete ? "text-ck-primary-deep" : "text-ck-ink",
            )}
          >
            {t(`levels.${level.key}.title`)}
          </span>
          <span
            className={cn(
              "line-clamp-2 text-[11.5px] font-medium leading-[1.35]",
              complete ? "text-ck-primary-mid" : "text-ck-body-soft",
            )}
          >
            {complete && completedAt
              ? t("levelDone", {
                  date: formatHistoryDate(completedAt, locale),
                })
              : t(`levels.${level.key}.hint`)}
          </span>
        </span>
        <span
          className={cn(
            "flex-none rounded-full border px-2.5 py-1 text-[12px] font-extrabold",
            complete
              ? "border-ck-primary-border bg-ck-primary-tint text-ck-primary-text"
              : "border-ck-border-3 text-ck-ink-3",
          )}
        >
          {foundCount}/{total}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "h-4 w-4 flex-none text-ck-muted-2 transition-transform",
            expanded && "rotate-180",
          )}
        />
      </button>

      {expanded ? (
        <div className="grid grid-cols-3 gap-2.5">
          {progress.species.map((item) => (
            <SpeciesTile
              key={item.species.key}
              item={item}
              onOpen={() => onOpen(item.species.key)}
            />
          ))}
        </div>
      ) : (
        // Свёрнутый уровень: полоска миниатюр вместо пяти плиток.
        <div className="flex items-center gap-1.5">
          {progress.species.map((item) => {
            const image = speciesImage(item);
            return (
              <button
                key={item.species.key}
                type="button"
                onClick={() => onOpen(item.species.key)}
                aria-label={t("openFound", {
                  name: t(`species.${item.species.key}`),
                })}
                className="ck-photo-stripes h-10 w-10 flex-none overflow-hidden rounded-[13px] border border-ck-primary-border"
              >
                {image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={image}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Шит вида                                                            */
/* ------------------------------------------------------------------ */

function SpeciesSheet({
  item,
  onClose,
}: {
  item: QuestSpeciesProgress;
  onClose: () => void;
}) {
  const t = useTranslations("checker.quests");
  const locale = useLocale();
  const name = t(`species.${item.species.key}`);
  const found = item.found;
  const image = speciesImage(item);

  return (
    <CkSheet open onClose={onClose} label={t("close")}>
      <div className="flex flex-col gap-3.5 pt-1">
        <div className="flex items-center gap-3.5">
          <span
            className={cn(
              "flex h-[62px] w-[62px] flex-none items-center justify-center overflow-hidden rounded-[20px]",
              found
                ? "ck-photo-stripes"
                : "border border-dashed border-ck-border-3 bg-ck-canvas-2",
            )}
          >
            {found && image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image}
                alt=""
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
            ) : (
              <MushroomShapeIcon
                shape={item.species.shape}
                className="h-10 w-10 text-ck-border-3"
              />
            )}
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[19px] font-extrabold leading-[1.15] tracking-[-0.02em] text-ck-ink">
              {name}
            </span>
            <span className="text-[12px] font-medium italic text-ck-muted">
              {item.species.scientificName}
            </span>
            {found && (
              <span className="text-[11.5px] font-semibold text-ck-primary-text">
                {t("foundLabel", {
                  date: formatHistoryDate(found.createdAt, locale),
                })}
                {" · "}
                {Math.round(found.probability * 100)}%
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1 rounded-[18px] bg-ck-canvas px-4 py-3">
          <CkMono>{t("whereLabel")}</CkMono>
          <span className="text-[12.5px] font-medium leading-[1.45] text-ck-body">
            {t(`where.${item.species.key}`)}
          </span>
        </div>

        {item.species.warning && (
          <CkStatusCard
            variant="warn"
            icon="!"
            title={t("lookalikeTitle")}
            body={t(`warnings.${item.species.key}`)}
          />
        )}

        <div className="flex flex-col gap-2">
          {found && (
            <button
              type="button"
              onClick={() =>
                void (async () => {
                  const url = await buildShareUrl(
                    {
                      kind: "find",
                      speciesKey: item.species.key,
                      date: found.createdAt.slice(0, 10),
                    },
                    locale,
                  );
                  await shareContent({
                    title: name,
                    text: t("shareTextFind", { name }),
                    url,
                  });
                })()
              }
              className="ck-btn ck-btn-primary h-[52px] text-[15.5px]"
            >
              <Share2 className="h-[17px] w-[17px]" strokeWidth={2.3} />
              {t("shareFind")}
            </button>
          )}
          {!found && (
            <Link
              href={CHECKER_HOME}
              onClick={onClose}
              className="ck-btn ck-btn-primary h-[52px] text-[15.5px]"
            >
              <Camera className="h-[18px] w-[18px]" strokeWidth={2.4} />
              {t("takePhoto")}
            </Link>
          )}
          <button
            type="button"
            onClick={() => void openExternal(speciesUrl(item))}
            className="ck-btn ck-btn-secondary"
          >
            <ExternalLink className="h-4 w-4" strokeWidth={2.2} />
            {t("readMore")}
          </button>
        </div>
      </div>
    </CkSheet>
  );
}

/* ------------------------------------------------------------------ */
/* Экран                                                               */
/* ------------------------------------------------------------------ */

export function CheckerQuests() {
  const t = useTranslations("checker.quests");
  const locale = useLocale();
  const { entries, loading, failed, reload } = useCheckerHistory();
  const [openKey, setOpenKey] = useState<string | null>(null);

  const progress = questProgressFrom(entries);
  const allDone = progress.foundCount === progress.total;
  const rank = rankFor(progress.foundCount);
  const pipLevels = progress.levels.map((level) => ({
    id: level.level.id,
    found: level.foundCount,
    total: level.total,
  }));

  // Ближайшая цель — первый ненайденный вид в порядке уровней.
  const next = progress.levels
    .flatMap((level) => level.species)
    .find((item) => !item.found);

  const open =
    progress.levels
      .flatMap((level) => level.species)
      .find((item) => item.species.key === openKey) ?? null;

  // Точка на вкладке гаснет от самого факта визита: пользователь уже увидел
  // всё, что открылось.
  useEffect(() => {
    clearQuestsUnseen();
  }, []);

  return (
    <CkScreen>
      <div className="flex flex-col gap-4 pb-4 pt-4">
        <header className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <h1 className="text-[28px] font-extrabold leading-[1.05] tracking-[-0.03em] text-ck-ink">
                {t("title")}
              </h1>
              <p className="text-[12.5px] font-medium leading-[1.4] text-ck-body-soft">
                {t("subtitle")}
              </p>
            </div>
            {/* Делиться нулевым прогрессом нечем — кнопка появляется с первой
                находкой. Ссылка ведёт на нашу карточку, а не на справочник:
                иначе шеринг рекламирует чужой сайт. */}
            {progress.foundCount > 0 && (
              <button
                type="button"
                onClick={() =>
                  void (async () => {
                    const url = await buildShareUrl(
                      {
                        kind: "rank",
                        found: progress.foundCount,
                        total: progress.total,
                      },
                      locale,
                    );
                    await shareContent({
                      title: t("title"),
                      text: t("shareTextRank", {
                        rank: t(`ranks.${rank.rank.key}`),
                        found: progress.foundCount,
                        total: progress.total,
                      }),
                      url,
                    });
                  })()
                }
                aria-label={t("shareProgress")}
                className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-ck-border-3 bg-ck-surface text-ck-ink-3"
              >
                <Share2 className="h-[17px] w-[17px]" strokeWidth={2.2} />
              </button>
            )}
          </div>

          <section className="flex flex-col gap-3 rounded-[24px] border border-ck-border bg-ck-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-0.5">
                <CkMono>{t("rankLabel")}</CkMono>
                <span className="text-[16.5px] font-extrabold tracking-[-0.02em] text-ck-ink">
                  {t(`ranks.${rank.rank.key}`)}
                </span>
                <span className="text-[11.5px] font-medium leading-[1.35] text-ck-body-soft">
                  {rank.next
                    ? t("toNextRank", {
                        count: rank.toNext,
                        rank: t(`ranks.${rank.next.key}`),
                      })
                    : t("rankMax")}
                </span>
              </div>
              <div className="flex flex-none items-center gap-1">
                {progress.levels.map((level) => (
                  <CheckerMedal
                    key={level.level.key}
                    level={level.level.id}
                    found={level.foundCount}
                    total={level.total}
                    size={34}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckerProgressPips levels={pipLevels} />
              <span className="flex-none text-[12.5px] font-extrabold text-ck-ink">
                {progress.foundCount}/{progress.total}
              </span>
            </div>
          </section>
        </header>

        {/* Ближайшая цель: экран квестов должен вести к камере, а не только
            показывать счёт. */}
        {!loading && !failed && next && (
          <section className="flex flex-col gap-3 rounded-[24px] border border-ck-primary-border bg-ck-primary-tint p-4">
            <CkMono className="text-ck-primary-mid">{t("nextUp")}</CkMono>
            <button
              type="button"
              onClick={() => setOpenKey(next.species.key)}
              className="flex items-center gap-3 text-left"
            >
              <span className="flex h-[54px] w-[54px] flex-none items-center justify-center rounded-[18px] bg-ck-surface">
                <MushroomShapeIcon
                  shape={next.species.shape}
                  className="h-8 w-8 text-ck-primary-text"
                />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-[15.5px] font-extrabold text-ck-primary-deep">
                  {t(`species.${next.species.key}`)}
                </span>
                <span className="text-[11.5px] font-medium leading-[1.35] text-ck-primary-mid">
                  {t(`where.${next.species.key}`)}
                </span>
              </span>
            </button>
            <Link
              href={CHECKER_HOME}
              className="ck-btn ck-btn-primary h-[50px] text-[15px]"
            >
              <Camera className="h-[18px] w-[18px]" strokeWidth={2.4} />
              {t("takePhoto")}
            </Link>
          </section>
        )}

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
          <LevelSection
            key={level.level.key}
            progress={level}
            onOpen={setOpenKey}
          />
        ))}

        <p className="px-1 text-[10.5px] font-medium leading-[1.45] text-ck-muted-2">
          {t("note")}
        </p>
      </div>

      {open && (
        <SpeciesSheet item={open} onClose={() => setOpenKey(null)} />
      )}
    </CkScreen>
  );
}
