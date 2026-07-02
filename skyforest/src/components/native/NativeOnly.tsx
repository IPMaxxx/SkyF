"use client";

import type { ReactNode } from "react";
import { useIsNative } from "@/lib/native/useIsNative";

/**
 * Условный рендеринг для разделения web/native.
 *
 * Веб-версия по умолчанию не меняется: до гидрации и в браузере `useIsNative()`
 * возвращает `false`, поэтому `<NativeOnly>` ничего не показывает (или fallback),
 * а `<WebOnly>` рендерит контент как обычно.
 */

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

/** Рендерит детей только в нативной оболочке; иначе — fallback. */
export function NativeOnly({ children, fallback = null }: Props) {
  const isNative = useIsNative();
  return <>{isNative ? children : fallback}</>;
}

/** Рендерит детей только в вебе/PWA; в native — fallback. */
export function WebOnly({ children, fallback = null }: Props) {
  const isNative = useIsNative();
  return <>{isNative ? fallback : children}</>;
}
