import { ImageResponse } from "next/og";
import { findQuestLevel, findQuestSpecies, readShareToken } from "./card";

/**
 * Картинка ссылки для мессенджеров и соцсетей (1200×630).
 *
 * ЧТО НА НЕЙ НЕ РИСУЕТСЯ. Фотографии пользователя: снимки лежат в приватном
 * бакете, и тащить их в публичный кадр нельзя ни технически, ни по смыслу
 * ссылки. Силуэтов грибов тоже нет — только примитивы, чтобы картинка не
 * зависела от компонентов интерфейса.
 *
 * ЯЗЫК КАДРА — ЛАТИНИЦА. `ImageResponse` (satori) рисует текст встроенным
 * шрифтом без кириллицы: русские буквы вышли бы пустыми прямоугольниками.
 * Поэтому вид подписан научным названием (оно и так международное), а служебные
 * строки — по-английски. Локализованное название видно на самой странице.
 *
 * ЦВЕТА ЗДЕСЬ ЛИТЕРАЛЬНЫЕ. Кадр рисуется вне браузера: переменных `--ck-*` из
 * styles/flavors/checker.css в нём не существует. Значения продублированы с
 * тёмной схемы Checker — при смене палитры поправить и тут.
 */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Mushroom Checker";

const CANVAS = "#0b120d";
const CANVAS_TOP = "#142b1c";
const INK = "#eaf2ea";
const MUTED = "#a2b4a5";
const FAINT = "#8a9c8c";
const PRIMARY = "#5fb573";
const PRIMARY_TEXT = "#7fd48f";
const PRIMARY_TINT = "rgba(95, 181, 115, 0.16)";
const PRIMARY_BORDER = "rgba(95, 181, 115, 0.34)";

/** Медаль уровня: круг с номером — тот же приём, что на странице. */
function Medal({ level }: { level: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 168,
        height: 168,
        borderRadius: 999,
        border: `6px solid ${PRIMARY_BORDER}`,
        background: PRIMARY_TINT,
        color: PRIMARY_TEXT,
        fontSize: 84,
        fontWeight: 700,
      }}
    >
      {level}
    </div>
  );
}

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { token } = await params;
  const payload = await readShareToken(token);

  const species =
    payload?.kind === "find" ? findQuestSpecies(payload.speciesKey) : undefined;
  const level =
    payload?.kind === "level" ? findQuestLevel(payload.levelId) : undefined;

  let caption = "AI mushroom identification by photo";
  let headline = "Mushroom Checker";
  let counter: string | null = null;
  let medal: number | null = null;

  if (payload?.kind === "find" && species) {
    caption = "Identified species";
    headline = species.scientificName;
  } else if (payload?.kind === "level") {
    caption = level ? `Level ${payload.levelId} complete` : "Level complete";
    headline = `${payload.found} / ${payload.total}`;
    medal = payload.levelId;
    counter = "species identified";
  } else if (payload?.kind === "rank") {
    caption = "Quest progress";
    headline = `${payload.found} / ${payload.total}`;
    counter = "species identified";
  }

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: 72,
          background: `linear-gradient(160deg, ${CANVAS_TOP} 0%, ${CANVAS} 55%)`,
          color: INK,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              width: 56,
              height: 56,
              borderRadius: 18,
              background: PRIMARY,
            }}
          />
          <div
            style={{
              marginLeft: 20,
              fontSize: 26,
              letterSpacing: 6,
              color: FAINT,
            }}
          >
            MUSHROOM CHECKER
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center" }}>
          {medal !== null && <Medal level={medal} />}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginLeft: medal !== null ? 48 : 0,
              maxWidth: medal !== null ? 800 : 1056,
            }}
          >
            <div style={{ fontSize: 30, color: PRIMARY_TEXT, letterSpacing: 1 }}>
              {caption}
            </div>
            <div
              style={{
                marginTop: 14,
                fontSize: headline.length > 26 ? 76 : 96,
                fontWeight: 700,
                lineHeight: 1.05,
              }}
            >
              {headline}
            </div>
            {counter && (
              <div style={{ marginTop: 14, fontSize: 32, color: MUTED }}>
                {counter}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{ display: "flex", width: 72, height: 6, borderRadius: 3, background: PRIMARY }}
          />
          <div style={{ marginLeft: 20, fontSize: 28, color: MUTED }}>
            checker.skyforest.ai
          </div>
        </div>
      </div>
    ),
    size,
  );
}
