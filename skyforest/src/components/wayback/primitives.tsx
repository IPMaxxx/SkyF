"use client";

/**
 * Строительные блоки светлой схемы WayBack («Widget Board»).
 *
 * Правило системы одно: контент живёт в белых плитках radius 26 на холсте
 * #eef0ec, действия — зелёные #2f6b3f, подписи к данным — моно капсом.
 * Размеры кнопок (58/56/52/50) из дизайна: их жмут в лесу и в перчатках,
 * уменьшать нельзя. Палитра — токены `--color-wb-*` в src/app/globals.css.
 *
 * Компоненты используются только во флейворе `wayback`, поэтому тёмная тема
 * SkyForest и светлая схема Checker ими не затрагиваются.
 */

import { ArrowLeft, ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Каркас экрана                                                       */
/* ------------------------------------------------------------------ */

/**
 * Экран во всю высоту. Контент скроллится, нижний блок кнопок «прилипает»
 * к краю с отступом под safe-area.
 */
export function WbScreen({
  children,
  bottom,
  className,
}: {
  children: ReactNode;
  bottom?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto flex min-h-[100dvh] w-full max-w-[520px] flex-col text-wb-ink",
        className,
      )}
    >
      <div className="flex-1 px-4 pb-6">{children}</div>
      {bottom && (
        <div className="px-4 pt-2 pb-[calc(20px+env(safe-area-inset-bottom))]">
          {bottom}
        </div>
      )}
    </div>
  );
}

/**
 * Верхняя панель экрана. Два режима из дизайна: корневой (название бренда +
 * кнопка меню) и вложенный (стрелка назад + заголовок).
 */
export function WbTopBar({
  title,
  onBack,
  backLabel,
  trailing,
  eyebrow,
}: {
  title: string;
  onBack?: () => void;
  backLabel?: string;
  trailing?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="flex min-h-[52px] items-center gap-3 pt-[calc(8px+env(safe-area-inset-top))] pb-3">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label={backLabel ?? "Back"}
          className="-ml-1 flex h-9 w-9 flex-none items-center justify-center rounded-full text-wb-primary"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
        </button>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        {eyebrow && <WbLabel>{eyebrow}</WbLabel>}
        <h1 className="truncate text-[21px] font-extrabold tracking-[-0.02em] text-wb-ink">
          {title}
        </h1>
      </div>
      {trailing}
    </div>
  );
}

/** Моно-подпись к данным: 11px, капс, разрядка .14em. */
export function WbLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <span className={cn("wb-label", className)}>{children}</span>;
}

/** Моно-строка данных без капса: «≈ 198 tiles · 3.8 MB». */
export function WbMono({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("wb-mono text-[12.5px] text-wb-muted", className)}>
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Плитки                                                              */
/* ------------------------------------------------------------------ */

export function WbTile({
  children,
  className,
  tone = "surface",
}: {
  children: ReactNode;
  className?: string;
  tone?: "surface" | "tint" | "quiet" | "danger" | "primary";
}) {
  const tones = {
    surface: "wb-tile",
    tint: "wb-tile-tint",
    quiet: "wb-tile-quiet",
    danger: "wb-tile-danger",
    primary: "rounded-[26px] bg-wb-primary text-wb-on-primary",
  } as const;
  return <div className={cn(tones[tone], className)}>{children}</div>;
}

/**
 * Плитка-строка со стрелкой: «Set entry point on the map →».
 * Кликабельна целиком — основной способ перехода между экранами.
 */
export function WbRowTile({
  label,
  sublabel,
  value,
  onClick,
  tone = "surface",
}: {
  label: string;
  sublabel?: string;
  value?: string;
  onClick?: () => void;
  tone?: "surface" | "tint" | "quiet";
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className={cn(
        "flex w-full items-center gap-3 px-5 py-[18px] text-left",
        tone === "surface" && "wb-tile",
        tone === "tint" && "wb-tile-tint",
        tone === "quiet" && "wb-tile-quiet",
      )}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[16px] font-bold text-wb-ink">{label}</span>
        {sublabel && (
          <span className="wb-mono text-[12px] text-wb-muted-2">
            {sublabel}
          </span>
        )}
      </span>
      {value && (
        <span className="wb-mono flex-none text-[12px] text-wb-muted-2">
          {value}
        </span>
      )}
      {onClick && (
        <ArrowRight
          className="h-[18px] w-[18px] flex-none text-wb-primary"
          strokeWidth={2.5}
          aria-hidden="true"
        />
      )}
    </Tag>
  );
}

/** Плитка-показатель: моно-подпись сверху, крупное значение, сноска снизу. */
export function WbStatTile({
  label,
  value,
  unit,
  footnote,
  accent,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  footnote?: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="wb-tile flex flex-col gap-1 px-4 py-[14px]">
      <WbLabel>{label}</WbLabel>
      <span
        className={cn(
          "flex items-baseline gap-1 text-[34px] font-extrabold leading-[1.05] tracking-[-0.03em]",
          accent ? "text-wb-primary" : "text-wb-ink",
        )}
      >
        {value}
        {unit && <span className="text-[16px] font-bold">{unit}</span>}
      </span>
      {footnote && (
        <span className="text-[13px] font-medium text-wb-muted">
          {footnote}
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Кнопки                                                              */
/* ------------------------------------------------------------------ */

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export function WbPrimaryButton({ className, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      {...props}
      className={cn("wb-btn wb-btn-primary", className)}
    />
  );
}

export function WbQuietButton({ className, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      {...props}
      className={cn("wb-btn wb-btn-quiet", className)}
    />
  );
}

export function WbSoftButton({ className, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      {...props}
      className={cn("wb-btn wb-btn-soft", className)}
    />
  );
}

/** «Я вышел из леса» — заметная, но не кричащая. */
export function WbDangerSoftButton({ className, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      {...props}
      className={cn("wb-btn wb-btn-danger-soft", className)}
    />
  );
}

/** Только для подтверждения необратимого действия. */
export function WbDangerButton({ className, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      {...props}
      className={cn("wb-btn wb-btn-danger", className)}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Сегментный переключатель                                            */
/* ------------------------------------------------------------------ */

export function WbSegmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
  disabled,
  className,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("grid gap-2", className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}
    >
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          type="button"
          disabled={disabled}
          aria-pressed={opt.value === value}
          onClick={() => onChange(opt.value)}
          className="wb-seg disabled:opacity-45"
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Поля ввода                                                          */
/* ------------------------------------------------------------------ */

export function WbField({
  label,
  hint,
  children,
}: {
  label?: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <div className="flex items-center justify-between gap-2">
          <WbLabel>{label}</WbLabel>
          {hint}
        </div>
      )}
      {children}
    </div>
  );
}

export function WbInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-[54px] w-full rounded-[18px] border border-transparent bg-wb-surface-2 px-4 text-[15px] font-medium text-wb-ink outline-none transition-shadow placeholder:text-wb-muted-3",
        className,
      )}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Оверлеи                                                             */
/* ------------------------------------------------------------------ */

/** Модалка подтверждения: плитка 26 у нижнего края, scrim .45. */
export function WbModal({
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
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end px-4 pb-[calc(20px+env(safe-area-inset-bottom))]">
      <button
        type="button"
        aria-label={label}
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(20,26,21,0.45)]"
      />
      <div className="relative z-10 mx-auto w-full max-w-[480px] rounded-[26px] bg-wb-surface px-6 py-[26px] shadow-[0_30px_60px_-24px_rgba(20,26,21,0.6)]">
        {children}
      </div>
    </div>
  );
}
