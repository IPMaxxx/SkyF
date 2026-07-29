"use client";

/**
 * Подсказки «как снимать гриб» на главном экране.
 *
 * Раньше это была сетка 2×2 из четырёх плиток с подписями вроде «Шляпка» и
 * «Пластинки»: она занимала треть экрана и ничего не объясняла тому, кто
 * держит гриб в руках первый раз. Теперь на экране одна полоса в 48px, а
 * человеческие объяснения открываются нижним листом по нажатию — целиком, а
 * не по одной подсказке: их пять, и читать их имеет смысл подряд.
 *
 * Доступность: полоса — обычная кнопка (Enter/Space, 48px область нажатия),
 * лист — `role="dialog"` с переводом фокуса и закрытием по Escape (CkSheet).
 * Значки декоративные и скрыты от скринридера, всё содержание — текстом.
 */

import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { CkSheet } from "@/components/checker/primitives";

/** Значки идут по порядку подсказок из `checker.home.tips`. */
const TIP_GLYPHS = ["◠", "▮", "≡", "☀", "◉"];

interface Tip {
  title: string;
  body: string;
}

export function CheckerShootingTips() {
  const t = useTranslations("checker.home");
  const [open, setOpen] = useState(false);
  const tips = t.raw("tips") as Tip[];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex min-h-[48px] w-full items-center gap-3 rounded-[20px] border border-ck-border-2 bg-ck-surface px-3.5 py-2 text-left"
      >
        <span
          aria-hidden="true"
          className="ck-tips-glyphs flex flex-none gap-[7px] text-[13px] leading-none text-ck-primary-text"
        >
          {TIP_GLYPHS.map((glyph) => (
            <span key={glyph}>{glyph}</span>
          ))}
        </span>
        <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold text-ck-ink-2">
          {t("tipsStrip")}
        </span>
        <i className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full bg-ck-primary-tint text-ck-primary-text">
          <HelpCircle className="h-[15px] w-[15px]" strokeWidth={2.2} aria-hidden="true" />
        </i>
      </button>

      <CkSheet open={open} onClose={() => setOpen(false)} label={t("tipsClose")}>
        <div className="flex flex-col gap-3.5 pb-1">
          <div className="flex flex-col gap-1 px-1">
            <h2 className="text-[19px] font-extrabold tracking-[-0.02em] text-ck-ink">
              {t("tipsTitle")}
            </h2>
            <p className="text-[12.5px] font-medium leading-[1.45] text-ck-body-soft">
              {t("tipsIntro")}
            </p>
          </div>

          <ul className="flex flex-col gap-2.5">
            {tips.map((tip, i) => (
              <li
                key={tip.title}
                className="flex gap-3 rounded-[20px] border border-ck-border-2 bg-ck-canvas-2 p-3.5"
              >
                <span
                  aria-hidden="true"
                  className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[11px] bg-ck-primary-tint text-[15px] leading-none text-ck-primary-text"
                >
                  {TIP_GLYPHS[i] ?? "◉"}
                </span>
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="text-[13.5px] font-extrabold text-ck-ink-2">
                    {tip.title}
                  </span>
                  <span className="text-[12.5px] font-medium leading-[1.45] text-ck-body-soft">
                    {tip.body}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="ck-btn ck-btn-secondary"
          >
            {t("tipsClose")}
          </button>
        </div>
      </CkSheet>
    </>
  );
}
