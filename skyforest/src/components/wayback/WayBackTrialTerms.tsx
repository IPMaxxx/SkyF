"use client";

/**
 * Раскрытие условий подписки перед покупкой.
 *
 * Оба стора требуют, чтобы на экране покупки были названы длительность
 * пробного периода, цена, периодичность списания и автопродление, а рядом
 * лежали ссылки на оферту и политику конфиденциальности. Для обязательного
 * гейта на старте это тем более критично: другого экрана, где человек мог бы
 * прочитать условия, у него нет.
 *
 * Плитка одна для пейволла и гейта, чтобы формулировки не разошлись.
 */

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { WbLabel, WbTile } from "@/components/wayback/primitives";

export function WayBackTrialTerms({
  trialDays,
  price,
  store,
}: {
  trialDays: number;
  price: string;
  /** «App Store» / «Google Play» — куда идти отменять. */
  store: string;
}) {
  const t = useTranslations("wayback.paywall");

  return (
    <WbTile tone="quiet" className="flex flex-col gap-2 px-5 py-[18px]">
      <WbLabel>{t("termsTitle")}</WbLabel>
      <ul className="flex flex-col gap-1.5">
        {[
          t("termsTrial", { days: trialDays, price }),
          t("termsRenew"),
          t("termsCancel", { store }),
          t("termsAccount", { store }),
        ].map((line) => (
          <li
            key={line}
            className="flex gap-2 text-[13px] font-medium leading-[1.5] text-wb-body"
          >
            <span aria-hidden="true" className="text-wb-muted-3">
              ·
            </span>
            {line}
          </li>
        ))}
      </ul>
      <div className="flex gap-4 pt-1 text-[12px] font-bold text-wb-primary">
        <Link href="/offer">{t("terms")}</Link>
        <Link href="/privacy">{t("privacy")}</Link>
      </div>
    </WbTile>
  );
}
