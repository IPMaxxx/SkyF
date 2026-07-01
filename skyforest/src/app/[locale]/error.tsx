"use client";

import { useEffect } from "react";

/**
 * Граница ошибок для локализованного дерева. Ловит исключения при рендере/
 * гидрации страниц и клиентских компонентов внутри [locale], сохраняя
 * корневой layout (html/body). Без неё необработанная ошибка гасит весь
 * экран — в нативном WebView это выглядит как чёрный экран без диагностики.
 *
 * Стили инлайновые, чтобы фолбэк был виден даже при сбое загрузки CSS.
 */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[SkyForest] LocaleError:", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f1a12",
        color: "#e8f0ea",
        fontFamily: "system-ui, -apple-system, sans-serif",
        padding: 24,
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 360 }}>
        <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>
          SkyForest
        </div>
        <p style={{ opacity: 0.75, marginBottom: 20, lineHeight: 1.5 }}>
          Something went wrong. Please try again.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            background: "#62a863",
            color: "#0f1a12",
            border: "none",
            borderRadius: 12,
            padding: "12px 24px",
            fontSize: 16,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Reload
        </button>
        {error?.digest ? (
          <p style={{ opacity: 0.4, fontSize: 12, marginTop: 16 }}>
            Ref: {error.digest}
          </p>
        ) : null}
      </div>
    </div>
  );
}
