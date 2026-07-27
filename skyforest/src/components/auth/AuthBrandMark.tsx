"use client";

/**
 * Логотип приложения на экранах входа/регистрации/восстановления пароля.
 *
 * Во флейворах (Mushroom Checker / WayBack) показывается иконка своего
 * приложения, в SkyForest — прежняя разметка: «стеклянный» квадрат с
 * иконкой на первом экране нативной оболочки и логотип-ссылка на остальных.
 */

import Image from "next/image";
import { ScanSearch } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useFlavorBrand } from "@/lib/useFlavorBrand";

type Mode =
  /** Первый экран нативной оболочки (login/register): крупная иконка без ссылки. */
  | "native-hero"
  /** Нативная оболочка, вспомогательные экраны: логотип-ссылка на главную. */
  | "native-logo"
  /** Веб-раскладка: логотип-ссылка на главную. */
  | "web-logo";

interface Props {
  mode: Mode;
  /** Переопределение классов картинки (нужно там, где размеры отличаются). */
  className?: string;
}

export function AuthBrandMark({ mode, className }: Props) {
  const brand = useFlavorBrand();

  if (mode === "native-hero") {
    if (!brand.isFlavored) {
      return (
        <div className="mx-auto mb-5 flex h-[76px] w-[76px] items-center justify-center rounded-[22px] border border-[rgba(55,201,166,0.35)] bg-gradient-to-br from-[#0e2b26] to-[#0a1712] shadow-[0_0_44px_-8px_rgba(55,201,166,0.5)]">
          <ScanSearch className="h-9 w-9 text-identify" strokeWidth={1.6} aria-hidden="true" />
        </div>
      );
    }
    return (
      <Image
        src={brand.logoPath}
        alt=""
        width={76}
        height={76}
        priority
        className="mx-auto mb-5 h-[76px] w-[76px] rounded-[22px] border border-[rgba(120,220,150,0.25)] shadow-[0_0_44px_-8px_rgba(95,181,115,0.5)]"
      />
    );
  }

  const imgClass =
    className ??
    (mode === "native-logo"
      ? "mx-auto mb-4 h-16 w-16 rounded-[18px] border border-[rgba(120,220,150,0.25)]"
      : "mx-auto mb-4 h-14 w-14 rounded-xl sm:h-16 sm:w-16");

  return (
    <Link href="/" aria-label={brand.name}>
      <Image
        src={brand.logoPath}
        alt={brand.name}
        width={64}
        height={64}
        className={imgClass}
      />
    </Link>
  );
}
