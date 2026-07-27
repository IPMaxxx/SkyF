"use client";

/**
 * Меню WayBack — полноэкранная панель на холсте, а не выпадающий список.
 *
 * Разделов всего один (трек), поэтому меню — это в первую очередь аккаунт,
 * подписка и переключатели языка/единиц. В анонимном режиме вместо карточки
 * аккаунта показывается приглашение войти, а «Выйти» не рендерится: трек
 * работает без входа, и меню не должно намекать на обратное.
 */

import { useEffect } from "react";
import { X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/client";
import { setUnitSystem, useUnitSystem } from "@/lib/units";
import {
  initialsFrom,
  useWaybackAccount,
} from "@/lib/wayback/useWaybackAccount";
import { cn } from "@/lib/utils";
import { WbLabel } from "@/components/wayback/primitives";

export function WayBackMenu({
  open,
  onClose,
  offlineAreaCount,
  onOpenOfflineMap,
}: {
  open: boolean;
  onClose: () => void;
  offlineAreaCount: number;
  onOpenOfflineMap: () => void;
}) {
  const t = useTranslations("wayback.menu");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const unitSystem = useUnitSystem();
  const { email, signedIn, subscription, trialDaysLeft } = useWaybackAccount();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    onClose();
    router.push("/dashboard/track");
    router.refresh();
  };

  const switchLocale = (next: string) => {
    if (next === locale) return;
    router.replace(pathname, { locale: next });
  };

  const accountMeta = subscription
    ? trialDaysLeft != null
      ? t("trialLeft", { days: trialDaysLeft })
      : t("premium")
    : null;

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-wb-canvas">
      <div className="mx-auto w-full max-w-[520px] px-4 pb-[calc(24px+env(safe-area-inset-bottom))]">
        <div className="flex min-h-[52px] items-center justify-between pt-[calc(8px+env(safe-area-inset-top))] pb-3">
          <span className="text-[21px] font-extrabold tracking-[-0.02em] text-wb-ink">
            WayBack
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-wb-primary text-wb-on-primary"
          >
            <X className="h-[18px] w-[18px]" strokeWidth={2.5} aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-col gap-2.5">
          {/* Аккаунт: карточка для вошедших, приглашение — для анонимных. */}
          {signedIn ? (
            <div className="wb-tile flex items-center gap-3.5 px-4 py-4">
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-wb-primary-tint text-[15px] font-extrabold text-wb-primary">
                {initialsFrom(email)}
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-[15px] font-bold text-wb-ink">
                  {email}
                </span>
                {accountMeta && (
                  <span className="wb-mono text-[12px] text-wb-muted-2">
                    {accountMeta}
                  </span>
                )}
              </span>
            </div>
          ) : (
            <Link
              href="/login"
              onClick={onClose}
              className="wb-tile flex items-center gap-3 px-4 py-4"
            >
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[15px] font-bold text-wb-ink">
                  {t("anonymous")}
                </span>
                <span className="text-[12.5px] font-medium text-wb-muted">
                  {t("anonymousHint")}
                </span>
              </span>
              <span className="flex-none text-[13px] font-extrabold text-wb-primary">
                {t("signIn")}
              </span>
            </Link>
          )}

          {/* Текущий раздел — единственный в приложении. */}
          <div className="flex items-center gap-3 rounded-[26px] bg-wb-primary px-5 py-[18px] text-wb-on-primary">
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[17px] font-extrabold">{t("track")}</span>
              <span className="wb-mono text-[12px] opacity-80">
                {t("trackCurrent")}
              </span>
            </span>
            <span
              className="h-1.5 w-1.5 flex-none rounded-full bg-wb-on-primary"
              aria-hidden="true"
            />
          </div>

          <MenuRow href="/payment" label={t("subscription")} onClose={onClose} />
          <MenuRow href="/account" label={t("account")} onClose={onClose} />

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenOfflineMap();
            }}
            className="wb-tile flex items-center gap-3 px-5 py-[18px] text-left"
          >
            <span className="flex-1 text-[16px] font-bold text-wb-ink">
              {t("offlineMap")}
            </span>
            <span className="wb-mono text-[12px] text-wb-muted-2">
              {t("areaCount", { count: offlineAreaCount })}
            </span>
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="wb-tile flex flex-col gap-2 px-4 py-4">
              <WbLabel>{t("language")}</WbLabel>
              <div className="grid grid-cols-2 gap-1.5">
                {routing.locales.map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    aria-pressed={loc === locale}
                    onClick={() => switchLocale(loc)}
                    className={cn(
                      "h-9 rounded-full text-[13px] font-bold transition-colors",
                      loc === locale
                        ? "bg-wb-primary text-wb-on-primary"
                        : "bg-wb-surface-2 text-wb-body",
                    )}
                  >
                    {loc.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="wb-tile flex flex-col gap-2 px-4 py-4">
              <WbLabel>{t("units")}</WbLabel>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    ["metric", t("unitsKm")],
                    ["imperial", t("unitsMi")],
                  ] as const
                ).map(([system, label]) => (
                  <button
                    key={system}
                    type="button"
                    aria-pressed={unitSystem === system}
                    onClick={() => setUnitSystem(system)}
                    className={cn(
                      "h-9 rounded-full text-[13px] font-bold transition-colors",
                      unitSystem === system
                        ? "bg-wb-primary text-wb-on-primary"
                        : "bg-wb-surface-2 text-wb-body",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {signedIn && (
            <button
              type="button"
              onClick={handleLogout}
              className="wb-tile-danger py-[18px] text-[16px] font-extrabold text-wb-danger"
            >
              {t("logout")}
            </button>
          )}

          <span className="wb-mono mt-1 text-center text-[10px] tracking-[0.12em] text-wb-muted-3">
            V {process.env.NEXT_PUBLIC_APP_VERSION} · BY SKYFOREST
          </span>
        </div>
      </div>
    </div>
  );
}

function MenuRow({
  href,
  label,
  onClose,
}: {
  href: string;
  label: string;
  onClose: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClose}
      className="wb-tile flex items-center gap-3 px-5 py-[18px]"
    >
      <span className="flex-1 text-[16px] font-bold text-wb-ink">{label}</span>
      <span className="text-[16px] text-wb-primary" aria-hidden="true">
        →
      </span>
    </Link>
  );
}
