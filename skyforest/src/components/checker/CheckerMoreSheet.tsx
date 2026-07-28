"use client";

/**
 * Панель «Ещё» Mushroom Checker — всё, что не поместилось в две вкладки.
 *
 * Здесь собрано то, что раньше жило в бургер-меню шапки (подписка, язык,
 * выход, версия) плюс документы, поддержка и ссылки на соседние приложения
 * SkyForest. Бургер убран: две точки входа в одну и ту же навигацию только
 * путали бы.
 */

import { ChevronRight, ExternalLink, LogOut, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  CHECKER_SUPPORT_EMAIL,
  openCheckerDoc,
  openExternal,
  skyforestLink,
  WAYBACK_SITE,
} from "@/lib/checker/externalLinks";
import { CkMono, CkSheet } from "@/components/checker/primitives";

const LOCALE_LABELS: Record<string, string> = { en: "EN", ru: "RU" };

/** Строка панели: 44px минимум по высоте — требование к области нажатия. */
function MoreRow({
  label,
  hint,
  tint,
  right,
  danger,
  onClick,
  href,
}: {
  label: string;
  hint?: string;
  tint?: string;
  right?: React.ReactNode;
  danger?: boolean;
  onClick?: () => void;
  href?: string;
}) {
  const content = (
    <>
      {tint && (
        <i className={cn("block h-[22px] w-[22px] flex-none rounded-[7px]", tint)} />
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
        <span
          className={cn(
            "text-[15.5px] font-bold",
            danger ? "text-ck-danger" : "text-ck-ink-2",
          )}
        >
          {label}
        </span>
        {hint && (
          <span className="truncate text-[11.5px] font-medium text-ck-muted-2">
            {hint}
          </span>
        )}
      </span>
      {right}
    </>
  );

  const className =
    "flex min-h-[44px] w-full items-center gap-3.5 rounded-[18px] px-3 py-2.5";

  if (href) {
    return (
      <Link href={href} onClick={onClick} className={className}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}

function Divider() {
  return <div className="mx-3 my-1.5 h-px bg-ck-hairline" />;
}

export function CheckerMoreSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("checker.menu");
  const tLegal = useTranslations("checker.paywall");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    onClose();
    router.push("/login");
    router.refresh();
  };

  const openDoc = (href: "/offer" | "/privacy") => {
    onClose();
    openCheckerDoc(href, locale);
  };

  return (
    <CkSheet open={open} onClose={onClose} label={t("close")} scrim={0.42}>
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between px-3 pb-1">
          <span className="text-[19px] font-extrabold tracking-[-0.02em] text-ck-ink">
            {t("moreTitle")}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-ck-muted"
          >
            <X className="h-[18px] w-[18px]" strokeWidth={2.4} aria-hidden="true" />
          </button>
        </div>

        <MoreRow
          href="/payment"
          onClick={onClose}
          tint="bg-ck-amber-border"
          label={t("subscription")}
          right={
            <span className="rounded-full border border-ck-amber-border bg-ck-amber-tint px-[9px] py-1 text-[11px] font-extrabold text-ck-amber">
              {t("premiumPill")}
            </span>
          }
        />

        <Divider />

        <CkMono className="px-3 pb-0.5 pt-1">{t("otherApps")}</CkMono>
        <MoreRow
          tint="bg-ck-primary-tint"
          label={t("waybackName")}
          hint={t("waybackHint")}
          right={<ExternalLink className="h-4 w-4 flex-none text-ck-muted-2" aria-hidden="true" />}
          onClick={() => {
            onClose();
            void openExternal(WAYBACK_SITE);
          }}
        />
        <MoreRow
          tint="bg-ck-primary-tint"
          label={t("skyforestName")}
          hint={t("skyforestHint")}
          right={<ExternalLink className="h-4 w-4 flex-none text-ck-muted-2" aria-hidden="true" />}
          onClick={() => {
            onClose();
            void openExternal(skyforestLink());
          }}
        />

        <Divider />

        {/* Язык. Выбор запоминаем в куке NEXT_LOCALE руками: у локали по
            умолчанию нет префикса в URL, так что по одному адресу middleware
            не отличил бы «выбрал этот язык» от «языка не выбирал» и снова
            показал бы основной язык приложения (английский). */}
        <div className="flex min-h-[44px] items-center gap-3.5 px-3 py-2">
          <span className="flex-1 text-[15.5px] font-bold text-ck-ink-2">
            {t("language")}
          </span>
          <div className="flex gap-1 rounded-full bg-ck-canvas p-1">
            {routing.locales.map((loc) => (
              <Link
                key={loc}
                href={pathname}
                locale={loc}
                scroll={false}
                onClick={() => {
                  document.cookie = `NEXT_LOCALE=${loc}; path=/; max-age=31536000; samesite=lax`;
                  onClose();
                }}
                aria-current={loc === locale ? "true" : undefined}
                className={cn(
                  "flex min-w-[44px] items-center justify-center rounded-full px-3 py-2 text-[13px] font-extrabold",
                  loc === locale ? "bg-ck-primary text-white" : "text-ck-muted",
                )}
              >
                {LOCALE_LABELS[loc]}
              </Link>
            ))}
          </div>
        </div>

        <Divider />

        <MoreRow
          label={tLegal("eula")}
          right={<ChevronRight className="h-4 w-4 flex-none text-ck-muted-2" aria-hidden="true" />}
          onClick={() => openDoc("/offer")}
        />
        <MoreRow
          label={tLegal("privacy")}
          right={<ChevronRight className="h-4 w-4 flex-none text-ck-muted-2" aria-hidden="true" />}
          onClick={() => openDoc("/privacy")}
        />
        <MoreRow
          label={t("support")}
          hint={CHECKER_SUPPORT_EMAIL}
          right={<ExternalLink className="h-4 w-4 flex-none text-ck-muted-2" aria-hidden="true" />}
          onClick={() => {
            onClose();
            window.location.href = `mailto:${CHECKER_SUPPORT_EMAIL}`;
          }}
        />

        <Divider />

        <MoreRow
          danger
          tint="bg-ck-danger-tint"
          label={t("logout")}
          right={<LogOut className="h-4 w-4 flex-none text-ck-danger" aria-hidden="true" />}
          onClick={() => void logout()}
        />

        <span className="ck-mono mt-1 text-center text-[10px] tracking-[0.12em] text-[#a8b6ac]">
          V {process.env.NEXT_PUBLIC_APP_VERSION} · BY SKYFOREST
        </span>
      </div>
    </CkSheet>
  );
}
