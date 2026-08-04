"use client";

/**
 * Панель «Ещё» нижнего меню WayBack.
 *
 * Раньше это было полноэкранное меню из бургера в шапке. Теперь навигация
 * внизу (WayBackTabBar), а сюда собрано всё редкое: аккаунт, подписка, «как
 * это работает» (переехало с главного экрана — на нём оно занимало место
 * рядом с главным действием, хотя читают его один раз), язык, единицы, ссылки
 * на соседние приложения и выход.
 *
 * В анонимном режиме вместо карточки аккаунта показывается приглашение войти,
 * а «Выйти» не рендерится: трек работает без входа, и меню не должно намекать
 * на обратное.
 */

import { useEffect, useState } from "react";
import { ChevronDown, ExternalLink, Loader2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { waybackSignOut } from "@/lib/wayback/signOut";
import {
  CHECKER_SITE,
  openExternal,
  skyforestLink,
} from "@/lib/wayback/externalLinks";
import { setUnitSystem, useUnitSystem } from "@/lib/units";
import {
  initialsFrom,
  useWaybackAccount,
} from "@/lib/wayback/useWaybackAccount";
import { useRecordingCopy } from "@/lib/wayback/useRecordingCopy";
import { cn } from "@/lib/utils";
import { formatNativeBuild, nativeBuild } from "@/lib/native/appBuild";
import { WayBackDiagnostics } from "@/components/wayback/WayBackDiagnostics";
import { WbLabel } from "@/components/wayback/primitives";

export function WayBackMenu({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("wayback.menu");
  const tHow = useTranslations("wayback.home");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const unitSystem = useUnitSystem();
  const { email, signedIn, subscription, trialDaysLeft } = useWaybackAccount();
  // «Как это работает» обещает запись с погашенным экраном только там, где
  // нативная часть для неё действительно есть.
  const copy = useRecordingCopy();
  const [loggingOut, setLoggingOut] = useState(false);
  const [howOpen, setHowOpen] = useState(false);
  const [shellVersion, setShellVersion] = useState<string | null>(null);
  const [logOpen, setLogOpen] = useState(false);

  useEffect(() => {
    void nativeBuild().then((info) => setShellVersion(formatNativeBuild(info)));
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  // Панель открыта поверх экрана трека, то есть уже на /dashboard/track: переход
  // туда же ничего не перерисовал бы. Состояние аккаунта на всех экранах меняет
  // подписка в useWaybackAccount, здесь остаётся закрыть панель и обновить то,
  // что посчитал сервер.
  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await waybackSignOut();
      onClose();
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
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
    <>
      <button
        type="button"
        aria-label={t("close")}
        onClick={onClose}
        className="fixed inset-0 z-[1180] bg-[rgba(3,7,4,0.6)]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("moreTitle")}
        className="wb-sheet"
      >
        <div className="mx-auto flex w-full max-w-[520px] flex-col gap-2.5 px-4 pt-4 pb-[calc(80px+env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[19px] font-extrabold tracking-[-0.02em] text-wb-ink">
              {t("moreTitle")}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label={t("close")}
              className="-mr-1 flex h-11 w-11 items-center justify-center rounded-full text-wb-muted"
            >
              <X
                className="h-[18px] w-[18px]"
                strokeWidth={2.5}
                aria-hidden="true"
              />
            </button>
          </div>

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

          <MenuRow href="/payment" label={t("subscription")} onClose={onClose} />
          <MenuRow href="/account" label={t("account")} onClose={onClose} />

          {/* «Как это работает» — читают один раз, поэтому свёрнуто. */}
          <div className="wb-tile overflow-hidden">
            <button
              type="button"
              aria-expanded={howOpen}
              onClick={() => setHowOpen((v) => !v)}
              className="flex w-full items-center gap-3 px-5 py-[18px] text-left"
            >
              <span className="flex-1 text-[16px] font-bold text-wb-ink">
                {tHow("howTitle")}
              </span>
              <ChevronDown
                className={cn(
                  "h-[18px] w-[18px] flex-none text-wb-primary transition-transform",
                  howOpen && "rotate-180",
                )}
                strokeWidth={2.5}
                aria-hidden="true"
              />
            </button>
            {howOpen && (
              <div className="flex flex-col gap-3 px-5 pb-[18px]">
                <ol className="flex flex-col gap-3">
                  {[tHow("how1"), tHow(copy.how2), tHow("how3")].map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="wb-mono flex h-[22px] w-[22px] flex-none items-center justify-center rounded-[7px] bg-wb-primary-tint text-[12px] font-semibold text-wb-primary">
                        {i + 1}
                      </span>
                      <span className="text-[14.5px] font-medium leading-[1.45] text-wb-body">
                        {step}
                      </span>
                    </li>
                  ))}
                </ol>
                <p className="wb-mono text-[12.5px] text-wb-muted-2">
                  {tHow("localOnly")}
                </p>
              </div>
            )}
          </div>

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

          {/* Соседние приложения. Открываются снаружи: в нативной оболочке —
              системным браузером, иначе чужой сайт подменил бы приложение. */}
          <WbLabel className="mt-1 px-1">{t("otherApps")}</WbLabel>
          <ExternalAppRow
            label={t("skyforestName")}
            hint={t("skyforestHint")}
            onClick={() => {
              onClose();
              void openExternal(skyforestLink());
            }}
          />
          <ExternalAppRow
            label={t("checkerName")}
            hint={t("checkerHint")}
            onClick={() => {
              onClose();
              void openExternal(CHECKER_SITE);
            }}
          />

          {signedIn && (
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="wb-tile-danger mt-1 flex items-center justify-center gap-2 py-[18px] text-[16px] font-extrabold text-wb-danger disabled:opacity-55"
            >
              {loggingOut && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              {t("logout")}
            </button>
          )}

          {/* Версия сайта и версия оболочки рядом: сайт обновляется сам, а
              оболочка — только переустановкой, и без второй цифры разбор любой
              поломки начинался с гадания, что у человека стоит. По нажатию —
              журнал записи: спрятан здесь, чтобы не попадаться на глаза, но
              путь к нему объясняется одной фразой. */}
          <button
            type="button"
            onClick={() => setLogOpen(true)}
            className="wb-mono mt-1 text-center text-[10px] tracking-[0.12em] text-wb-muted-3"
          >
            V {process.env.NEXT_PUBLIC_APP_VERSION}
            {shellVersion ? ` · APP ${shellVersion}` : ""} · BY SKYFOREST
          </button>
          <WayBackDiagnostics open={logOpen} onClose={() => setLogOpen(false)} />
        </div>
      </div>
    </>
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

function ExternalAppRow({
  label,
  hint,
  onClick,
}: {
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="wb-tile flex items-center gap-3 px-5 py-4 text-left"
    >
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[15.5px] font-bold text-wb-ink">{label}</span>
        <span className="text-[12.5px] font-medium text-wb-muted-2">
          {hint}
        </span>
      </span>
      <ExternalLink
        className="h-[17px] w-[17px] flex-none text-wb-muted-2"
        aria-hidden="true"
      />
    </button>
  );
}
