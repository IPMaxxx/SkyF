/**
 * Каркасы экранов Mushroom Checker для `loading.tsx`.
 *
 * ЗАЧЕМ. Разделы нижнего меню — серверные маршруты (у «Аккаунта» перед первой
 * разметкой ещё и два запроса в Supabase), поэтому без границы Suspense тап по
 * вкладке ничего не менял на экране до конца ответа сервера. Каркас даёт этой
 * границе содержимое: рамка раздела рисуется сразу, а данные дотекают в неё.
 *
 * ПОЧЕМУ БЕЗ ТЕКСТА. Каркас живёт доли секунды и ничего не сообщает — надписи
 * в нём успели бы только мигнуть, поэтому блоки прямоугольные и `aria-hidden`:
 * скринридеру нечего зачитывать, он дождётся настоящего экрана.
 *
 * ЦВЕТ ЗАГЛУШЕК — `ck-border-3`, как у пустых сегментов CheckerProgressPips:
 * `ck-field` в светлой схеме совпадает с поверхностью карточки, и заглушки на
 * ней исчезают.
 *
 * Размеры повторяют настоящие экраны (карточки 26px, строки списка 52px,
 * плитки квестов 3 в ряд), чтобы при появлении данных ничего не прыгало.
 */

import { cn } from "@/lib/utils";
import { CkScreen } from "@/components/checker/primitives";

/** Полоска на месте строки текста. */
function Bar({ className }: { className?: string }) {
  return <span className={cn("block rounded-full bg-ck-border-3", className)} />;
}

/** Общая обёртка: пульсация только там, где анимации не отключены системой. */
function Frame({
  name,
  className,
  children,
}: {
  name: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      data-ck-skeleton={name}
      aria-hidden="true"
      className={cn("flex flex-col motion-safe:animate-pulse", className)}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Распознать                                                          */
/* ------------------------------------------------------------------ */

export function CheckerIdentifySkeleton() {
  return (
    <CkScreen
      centerContent
      bottom={
        <Frame name="identify-actions" className="gap-2.5">
          <div className="flex items-start gap-2.5 rounded-[20px] border border-ck-amber-border bg-ck-amber-tint px-3.5 py-3">
            <span className="h-[26px] w-[26px] flex-none rounded-[9px] bg-ck-surface" />
            <span className="flex min-w-0 flex-1 flex-col gap-1.5 pt-1">
              <Bar className="h-2.5 w-1/2" />
              <Bar className="h-2 w-4/5" />
            </span>
          </div>
          <span className="h-[58px] w-full rounded-full bg-ck-border-3" />
          <span className="h-[52px] w-full rounded-full border border-ck-border-3 bg-ck-surface" />
          <span className="h-[48px] w-full rounded-[20px] border border-ck-border-2 bg-ck-surface" />
        </Frame>
      }
    >
      <Frame name="identify" className="gap-3.5 pt-4">
        <span className="flex flex-col gap-2.5">
          <Bar className="h-8 w-4/5 rounded-[12px]" />
          <Bar className="h-8 w-3/5 rounded-[12px]" />
        </span>
        {/* Место снимка. Высоту диктует `--ck-home-photo-max`, та же, что у
            самой фотографии, иначе при подмене каркаса содержимое прыгнет:
            экран центрирован по вертикали, и лишние сто точек сдвигают всё. */}
        <span className="ck-home-photo-ghost ck-photo-stripes rounded-[18px]" />
        <span className="flex items-center gap-3 rounded-[22px] border border-ck-primary-border bg-ck-primary-tint px-4 py-3">
          <span className="h-6 w-6 flex-none rounded-lg bg-ck-border-3" />
          <Bar className="h-2.5 w-1/2" />
        </span>
      </Frame>
    </CkScreen>
  );
}

/* ------------------------------------------------------------------ */
/* История                                                             */
/* ------------------------------------------------------------------ */

export function CheckerHistorySkeleton() {
  return (
    <CkScreen>
      <Frame name="history" className="gap-4 pb-4 pt-4">
        <span className="flex flex-col gap-2">
          <Bar className="h-6 w-2/5 rounded-[10px]" />
          <Bar className="h-2.5 w-3/5" />
        </span>
        <div className="flex flex-col rounded-[26px] border border-ck-border bg-ck-surface px-[18px]">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={cn(
                "flex min-h-[76px] items-center gap-3 py-3",
                i > 0 && "border-t border-ck-hairline",
              )}
            >
              <span className="ck-photo-stripes h-[58px] w-[58px] flex-none rounded-[18px]" />
              <span className="flex min-w-0 flex-1 flex-col gap-2">
                <Bar className="h-3 w-2/3" />
                <Bar className="h-2.5 w-2/5" />
                <Bar className="h-2 w-1/3" />
              </span>
            </span>
          ))}
        </div>
      </Frame>
    </CkScreen>
  );
}

/* ------------------------------------------------------------------ */
/* Квесты                                                              */
/* ------------------------------------------------------------------ */

export function CheckerQuestsSkeleton() {
  return (
    <CkScreen>
      <Frame name="quests" className="gap-4 pb-4 pt-4">
        <span className="flex flex-col gap-1.5">
          <Bar className="h-6 w-2/5 rounded-[10px]" />
          <Bar className="h-2.5 w-3/4" />
        </span>

        {/* Карточка ранга */}
        <div className="flex flex-col gap-3 rounded-[24px] border border-ck-border bg-ck-surface p-4">
          <div className="flex items-start justify-between gap-3">
            <span className="flex min-w-0 flex-col gap-1.5">
              <Bar className="h-2 w-16" />
              <Bar className="h-3.5 w-28" />
              <Bar className="h-2.5 w-36" />
            </span>
            <span className="flex flex-none items-center gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-[34px] w-[34px] rounded-full border-[3px] border-ck-border-3"
                />
              ))}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="flex flex-1 items-center gap-2">
              {[0, 1, 2].map((level) => (
                <span key={level} className="flex flex-1 items-center gap-[3px]">
                  {[0, 1, 2, 3, 4].map((pip) => (
                    <span
                      key={pip}
                      className="h-[6px] flex-1 rounded-full bg-ck-border-3"
                    />
                  ))}
                </span>
              ))}
            </span>
            <Bar className="h-2.5 w-8 flex-none" />
          </div>
        </div>

        {/* Дисклеймер безопасности */}
        <div className="flex items-start gap-2.5 rounded-[20px] border border-ck-amber-border bg-ck-amber-tint px-3.5 py-3">
          <span className="h-[26px] w-[26px] flex-none rounded-[9px] bg-ck-surface" />
          <span className="flex min-w-0 flex-1 flex-col gap-1.5 pt-1">
            <Bar className="h-2.5 w-2/5" />
            <Bar className="h-2 w-4/5" />
          </span>
        </div>

        {/* Первый уровень: заголовок и плитки видов */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="h-[38px] w-[38px] flex-none rounded-full border-[3px] border-ck-border-3" />
            <span className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Bar className="h-3.5 w-2/5" />
              <Bar className="h-2.5 w-3/5" />
            </span>
            <span className="h-6 w-12 flex-none rounded-full border border-ck-border-3" />
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <span
                key={i}
                className="aspect-square rounded-[20px] border border-dashed border-ck-border-3 bg-ck-canvas-2"
              />
            ))}
          </div>
        </div>
      </Frame>
    </CkScreen>
  );
}

/* ------------------------------------------------------------------ */
/* Аккаунт                                                             */
/* ------------------------------------------------------------------ */

function AccountCard() {
  return (
    <div className="flex items-center gap-3.5 rounded-[26px] border border-ck-border bg-ck-surface p-[18px]">
      <span className="h-[52px] w-[52px] flex-none rounded-[18px] bg-ck-primary-tint" />
      <span className="flex min-w-0 flex-1 flex-col gap-2">
        <Bar className="h-3.5 w-1/3" />
        <Bar className="h-2.5 w-3/5" />
      </span>
    </div>
  );
}

function AccountRows({ rows }: { rows: number }) {
  return (
    <div className="flex flex-col rounded-[26px] border border-ck-border bg-ck-surface px-[18px] py-1">
      {Array.from({ length: rows }, (_, i) => (
        <span
          key={i}
          className={cn(
            "flex min-h-[52px] items-center justify-between gap-3 py-[15px]",
            i > 0 && "border-t border-ck-hairline",
          )}
        >
          <Bar className="h-3 w-2/5" />
          <Bar className="h-3 w-12 flex-none" />
        </span>
      ))}
    </div>
  );
}

export function CheckerAccountSkeleton() {
  return (
    <CkScreen
      bottom={
        <span className="block h-[52px] w-full rounded-[26px] border border-ck-danger-border bg-ck-surface" />
      }
    >
      <Frame name="account" className="gap-3.5">
        <span className="flex items-center gap-3 pt-3">
          <span className="h-[38px] w-[38px] flex-none rounded-full border border-ck-border-4 bg-ck-surface" />
          <Bar className="h-4 w-1/3" />
        </span>
        <AccountCard />
        <AccountCard />
        <AccountRows rows={3} />
        <AccountRows rows={3} />
      </Frame>
    </CkScreen>
  );
}
