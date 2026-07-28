"use client";

/**
 * Строительные блоки Mushroom Checker.
 *
 * Размеры взяты из дизайна как есть: кнопки 58/56/52, карточки radius 24–28.
 * Цвета — только токены `ck-*` (src/styles/flavors/checker.css): их значения
 * меняются вместе с выбранной темой, поэтому literal-цветов здесь быть не
 * должно. Компоненты используются только во флейворе `checker`, поэтому
 * тёмная тема SkyForest и WayBack ими не затрагивается.
 */

import { Check, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Escape закрывает оверлей — на вебе к этому привыкли, в WebView не мешает. */
function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
}

/* ------------------------------------------------------------------ */
/* Каркас экрана                                                       */
/* ------------------------------------------------------------------ */

/**
 * Экран во всю высоту: контент скроллится, нижний блок кнопок «прилипает»
 * к краю с отступом под safe-area (в дизайне — 34px).
 *
 * `--ck-chrome`, `--ck-safe-top` и `--ck-screen-pb` выставляют оболочки
 * (`ck/(app)/layout.tsx` и `identify/layout.tsx`): из 100dvh вычитается всё,
 * что занято шапкой и нижним меню, а safe-area отступы держат они же. Без
 * оболочки (экраны входа) переменных нет и работают значения по умолчанию.
 */
export function CkScreen({
  children,
  bottom,
  className,
  padding = "px-5",
}: {
  children: ReactNode;
  bottom?: ReactNode;
  className?: string;
  padding?: string;
}) {
  return (
    <div
      className={cn(
        "font-ck mx-auto flex min-h-[calc(100dvh-var(--ck-chrome,0px))] w-full max-w-[520px] flex-col text-ck-ink",
        className,
      )}
    >
      <div
        className={cn(
          "flex-1 pt-[var(--ck-safe-top,env(safe-area-inset-top))]",
          padding,
        )}
      >
        {children}
      </div>
      {bottom && (
        <div
          className={cn(
            "pt-4 pb-[var(--ck-screen-pb,calc(34px+env(safe-area-inset-bottom)))]",
            padding,
          )}
        >
          {bottom}
        </div>
      )}
    </div>
  );
}

export function CkMono({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "ck-mono text-[10px] tracking-[0.14em] text-ck-muted-2",
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Кнопки                                                              */
/* ------------------------------------------------------------------ */

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export function CkPrimaryButton({ className, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      {...props}
      className={cn("ck-btn ck-btn-primary", className)}
    />
  );
}

export function CkSecondaryButton({ className, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      {...props}
      className={cn("ck-btn ck-btn-secondary", className)}
    />
  );
}

export function CkQuietButton({ className, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      {...props}
      className={cn("ck-btn ck-btn-quiet", className)}
    />
  );
}

export function CkDangerButton({ className, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      {...props}
      className={cn("ck-btn ck-btn-danger", className)}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Поля ввода                                                          */
/* ------------------------------------------------------------------ */

export function CkField({
  label,
  hint,
  children,
}: {
  label?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-[11.5px] font-bold tracking-[0.02em] text-ck-body-soft">
            {label}
          </span>
          {hint && (
            <span className="text-[11px] font-bold text-ck-faint">{hint}</span>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

export function CkInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-[52px] w-full rounded-[18px] border border-ck-border-4 bg-ck-field px-4 text-[14.5px] font-medium text-ck-ink outline-none transition-shadow placeholder:text-ck-muted-2",
        className,
      )}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Карточки состояний                                                  */
/* ------------------------------------------------------------------ */

export type CkStatusVariant = "success" | "warn" | "error" | "neutral";

const STATUS_STYLES: Record<
  CkStatusVariant,
  { card: string; icon: string; title: string; body: string }
> = {
  success: {
    card: "bg-ck-primary-tint border-ck-primary-border",
    icon: "bg-ck-primary text-ck-on-primary",
    title: "text-ck-primary-deep",
    body: "text-ck-primary-mid",
  },
  warn: {
    card: "bg-ck-amber-tint border-ck-amber-border",
    icon: "bg-ck-surface text-ck-amber",
    title: "text-ck-amber-deep",
    body: "text-ck-amber-mid",
  },
  error: {
    card: "bg-ck-surface border-ck-danger-border",
    icon: "bg-ck-danger-tint text-ck-danger",
    title: "text-ck-danger-deep",
    body: "text-ck-danger-body",
  },
  neutral: {
    card: "bg-ck-surface border-ck-border",
    icon: "bg-ck-canvas text-ck-body",
    title: "text-ck-ink-2",
    body: "text-ck-body-soft",
  },
};

/**
 * Карточка состояния: 26px иконка-квадрат, заголовок 14/800, текст 12.5/500
 * и необязательное действие под ними (кнопка 48px).
 */
export function CkStatusCard({
  variant = "neutral",
  icon,
  title,
  body,
  action,
}: {
  variant?: CkStatusVariant;
  icon: ReactNode;
  title: string;
  body?: ReactNode;
  action?: ReactNode;
}) {
  const s = STATUS_STYLES[variant];
  return (
    <div
      className={cn("flex flex-col gap-3 rounded-[24px] border p-4", s.card)}
    >
      <div className="flex gap-3">
        <span
          className={cn(
            "flex h-[26px] w-[26px] flex-none items-center justify-center rounded-[9px] text-[14px] font-extrabold",
            s.icon,
          )}
        >
          {icon}
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <span className={cn("text-[14px] font-extrabold", s.title)}>
            {title}
          </span>
          {body && (
            <span className={cn("text-[12.5px] font-medium leading-[1.45]", s.body)}>
              {body}
            </span>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Списки-карточки                                                     */
/* ------------------------------------------------------------------ */

export function CkListCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-[26px] border border-ck-border bg-ck-surface px-[18px] py-1",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Строка списка: 15px по вертикали, 1px hairline между строками. */
export function CkListRow({
  label,
  sublabel,
  value,
  right,
  onClick,
  danger,
  first,
}: {
  label: string;
  sublabel?: string;
  value?: string;
  right?: ReactNode;
  onClick?: () => void;
  danger?: boolean;
  first?: boolean;
}) {
  const content = (
    <>
      <div className="flex min-w-0 flex-col gap-0.5 text-left">
        <span
          className={cn(
            "text-[14.5px] font-bold",
            danger ? "text-ck-danger" : "text-ck-ink-2",
          )}
        >
          {label}
        </span>
        {sublabel && (
          <span className="text-[11.5px] font-medium text-ck-muted-2">
            {sublabel}
          </span>
        )}
      </div>
      {right ?? (
        <span className="flex flex-none items-center gap-1 text-[13.5px] font-semibold text-ck-muted">
          {value}
          <ChevronRight
            className={cn("h-4 w-4", danger && "text-ck-danger-soft")}
            strokeWidth={2}
            aria-hidden="true"
          />
        </span>
      )}
    </>
  );

  const rowClass = cn(
    "flex min-h-[52px] w-full items-center justify-between gap-3 py-[15px]",
    !first && "border-t border-ck-hairline",
  );

  if (!onClick) return <div className={rowClass}>{content}</div>;

  return (
    <button type="button" onClick={onClick} className={rowClass}>
      {content}
    </button>
  );
}

/** Переключатель 46×28 с 22px «шайбой». */
export function CkToggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex h-[28px] w-[46px] flex-none items-center rounded-full p-[3px] transition-colors disabled:opacity-50",
        checked ? "bg-ck-primary" : "bg-ck-border",
      )}
    >
      <span
        className={cn(
          "h-[22px] w-[22px] rounded-full bg-ck-knob shadow-sm transition-transform",
          checked ? "translate-x-[18px]" : "translate-x-0",
        )}
      />
    </button>
  );
}

/** Пункт списка фич пейволла: 20px зелёный квадрат с галкой. */
export function CkFeatureRow({ children }: { children: ReactNode }) {
  return (
    <span className="flex items-center gap-2.5 text-[13px] font-semibold text-ck-body">
      <i className="flex h-5 w-5 flex-none items-center justify-center rounded-[7px] bg-ck-primary-tint text-ck-primary-text">
        <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
      </i>
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Оверлеи                                                             */
/* ------------------------------------------------------------------ */

/** Модалка по центру: radius 30, scrim .45. */
export function CkModal({
  open,
  onClose,
  children,
  label,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  label: string;
}) {
  useEscape(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-5">
      <button
        type="button"
        aria-label={label}
        onClick={onClose}
        className="ck-scrim absolute inset-0"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="font-ck relative z-10 w-full max-w-[420px] rounded-[30px] bg-ck-surface px-6 py-[26px] shadow-[0_30px_60px_-24px_var(--ck-shadow)]"
      >
        {children}
      </div>
    </div>
  );
}

/** Насколько нужно потянуть лист вниз, чтобы он закрылся. */
const SHEET_CLOSE_DISTANCE = 70;

/**
 * Нижний лист: radius 32 сверху, ручка 44×4, scrim задаётся параметром.
 *
 * Закрывается тапом по фону, Escape и свайпом вниз за ручку. Свайп повешен
 * только на область ручки: если слушать весь лист, жест перехватывал бы
 * прокрутку и поля ввода внутри.
 */
export function CkSheet({
  open,
  onClose,
  children,
  label,
  scrim = 0.45,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  label: string;
  scrim?: number;
}) {
  useEscape(open, onClose);
  const panelRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);
  const [drag, setDrag] = useState(0);

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const onTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (startY.current === null) return;
    setDrag(Math.max(0, e.touches[0].clientY - startY.current));
  };
  const onTouchEnd = () => {
    startY.current = null;
    const closing = drag > SHEET_CLOSE_DISTANCE;
    setDrag(0);
    if (closing) onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end">
      <button
        type="button"
        aria-label={label}
        onClick={onClose}
        className="ck-scrim absolute inset-0"
        style={{ "--ck-scrim-alpha": scrim } as React.CSSProperties}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        style={{ transform: drag ? `translateY(${drag}px)` : undefined }}
        className="font-ck relative z-10 mx-auto w-full max-w-[520px] rounded-t-[32px] bg-ck-surface px-5 pt-3.5 pb-[calc(34px+env(safe-area-inset-bottom))] shadow-[0_-20px_50px_-20px_var(--ck-shadow-soft)] outline-none"
      >
        <div
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className="-mx-5 -mt-3.5 px-5 pb-2.5 pt-3.5"
        >
          <i className="mx-auto block h-1 w-11 rounded-sm bg-ck-border-4" />
        </div>
        {children}
      </div>
    </div>
  );
}
