"use client";

import { useEffect } from "react";

/**
 * Последний рубеж обработки ошибок: ловит исключения, которые не поймал
 * ни один сегментный error.tsx (в т.ч. падения в корневом layout).
 *
 * Критично для нативной оболочки (Android/iOS WebView): без границы ошибок
 * необработанное исключение при гидрации сносит всё дерево React, и остаётся
 * пустой чёрный экран (#0f1a12) без единого следа. Здесь мы показываем
 * видимый фолбэк с кнопкой перезагрузки и логируем ошибку в консоль —
 * её видно при удалённой отладке через chrome://inspect.
 *
 * Стили только инлайновые: фолбэк обязан отрисоваться, даже если CSS/шрифты
 * не загрузились.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[SkyForest] GlobalError:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
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
            Something went wrong while loading the app.
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
      </body>
    </html>
  );
}
