"use client";

/**
 * Панель «Ещё» Mushroom Checker — всё, что не поместилось в две вкладки.
 *
 * Здесь собрано то, что раньше жило в бургер-меню шапки (подписка, язык,
 * выход, версия) плюс «поделиться приложением», документы, поддержка и ссылки
 * на соседние приложения SkyForest. Бургер убран: две точки входа в одну и ту
 * же навигацию только путали бы.
 *
 * Иконки соседних приложений лежат в `public/checker/app-icons` — копии входных
 * иконок нативных сборок, их делает `scripts/make-checker-app-icons.mjs`.
 */

import Image from "next/image";
import {
  ChevronRight,
  Crown,
  ExternalLink,
  LogOut,
  Share2,
  X,
  type LucideIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  CHECKER_SITE,
  CHECKER_SUPPORT_EMAIL,
  openCheckerDoc,
  openExternal,
  skyforestLink,
  WAYBACK_SITE,
} from "@/lib/checker/externalLinks";
import { shareContent } from "@/lib/checker/share";
import { CkMono, CkSheet } from "@/components/checker/primitives";
import { useCheckerTheme } from "@/components/checker/CheckerThemeProvider";
import { CHECKER_THEMES } from "@/lib/checker/theme";
import {
  CHECKER_LOCALE_LABELS,
  rememberCheckerLocale,
} from "@/lib/checker/locale";

/** Сегментный переключатель настройки: подписи внутри «пилюли», как у языка. */
function SettingRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[44px] items-center gap-3.5 px-3 py-2">
      <span className="flex-1 text-[15.5px] font-bold text-ck-ink-2">
        {label}
      </span>
      <div className="flex gap-1 rounded-full bg-ck-canvas p-1">{children}</div>
    </div>
  );
}

/**
 * Строка панели: 44px минимум по высоте — требование к области нажатия.
 *
 * Слева — что за строка: либо значок в цветной плитке (`glyph` + `tint`), либо
 * иконка соседнего приложения (`icon`). Плитка без значка внутри читалась как
 * недогрузившаяся картинка, поэтому пустой её быть нельзя: `tint` задаёт и фон,
 * и цвет значка на нём. Справа — что произойдёт: плашка тарифа, шеврон
 * документа, стрелка «уйдём из приложения».
 */
function MoreRow({
  label,
  hint,
  glyph: Glyph,
  tint,
  icon,
  right,
  danger,
  onClick,
  href,
}: {
  label: string;
  hint?: string;
  /** Значок в плитке. Цвет наследует от `tint`, размер — 14px в плитке 22px. */
  glyph?: LucideIcon;
  /** Пара классов плитки: фон и цвет значка (например `bg-ck-amber-tint text-ck-amber`). */
  tint?: string;
  /** Иконка приложения вместо плитки — того же размера, чтобы подписи в списке
      стояли в одну колонку. */
  icon?: string;
  right?: React.ReactNode;
  danger?: boolean;
  onClick?: () => void;
  href?: string;
}) {
  const content = (
    <>
      {icon && (
        /* Иконка крупнее плитки-акцента (26 против 22): на 22px рисунок
           приложения уже не читается. Колонка при этом остаётся 22px, поэтому
           подписи всех строк панели стоят на одной вертикали. */
        <span className="flex h-[22px] w-[22px] flex-none items-center justify-center">
          <Image
            src={icon}
            alt=""
            width={96}
            height={96}
            className="h-[26px] w-[26px] rounded-[8px] object-cover"
          />
        </span>
      )}
      {!icon && Glyph && (
        <span
          className={cn(
            "flex h-[22px] w-[22px] flex-none items-center justify-center rounded-[7px]",
            tint,
          )}
        >
          <Glyph className="h-[14px] w-[14px]" strokeWidth={2.4} aria-hidden="true" />
        </span>
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
  const { theme, setTheme } = useCheckerTheme();

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

  /**
   * Системный лист «поделиться» с ссылкой на приложение. Вызываем до `onClose`
   * и без `await`: и `navigator.share`, и нативный плагин требуют, чтобы лист
   * открылся в том же обработчике, что и касание, — иначе Safari считает жест
   * потраченным и молча ничего не показывает.
   */
  const shareApp = () => {
    void shareContent({
      title: t("brandShort"),
      text: t("shareAppText"),
      url: CHECKER_SITE,
    });
    onClose();
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
          glyph={Crown}
          tint="bg-ck-amber-tint text-ck-amber"
          label={t("subscription")}
          right={
            <span className="rounded-full border border-ck-amber-border bg-ck-amber-tint px-[9px] py-1 text-[11px] font-extrabold text-ck-amber">
              {t("premiumPill")}
            </span>
          }
        />

        {/* Рассказать о приложении — сразу под подпиской: это самое частое,
            зачем панель открывают после неё. */}
        <MoreRow
          glyph={Share2}
          tint="bg-ck-primary-tint text-ck-primary-text"
          label={t("shareApp")}
          hint={t("shareAppHint")}
          right={<ChevronRight className="h-4 w-4 flex-none text-ck-muted-2" aria-hidden="true" />}
          onClick={shareApp}
        />

        <Divider />

        <CkMono className="px-3 pb-0.5 pt-1">{t("otherApps")}</CkMono>
        <MoreRow
          icon="/checker/app-icons/wayback.webp"
          label={t("waybackName")}
          hint={t("waybackHint")}
          right={<ExternalLink className="h-4 w-4 flex-none text-ck-muted-2" aria-hidden="true" />}
          onClick={() => {
            onClose();
            void openExternal(WAYBACK_SITE);
          }}
        />
        <MoreRow
          icon="/checker/app-icons/skyforest.webp"
          label={t("skyforestName")}
          hint={t("skyforestHint")}
          right={<ExternalLink className="h-4 w-4 flex-none text-ck-muted-2" aria-hidden="true" />}
          onClick={() => {
            onClose();
            void openExternal(skyforestLink());
          }}
        />

        <Divider />

        {/* Тема. Панель открывается поверх любого экрана, поэтому цвета
            меняются у пользователя на глазах — отдельного экрана настроек
            для этого не нужно. Лист не закрываем: выбор хочется сравнить. */}
        <SettingRow label={t("theme")}>
          {CHECKER_THEMES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setTheme(option)}
              aria-pressed={option === theme}
              className={cn(
                "flex min-h-[44px] items-center justify-center rounded-full px-3.5 py-2 text-[13px] font-extrabold",
                option === theme
                  ? "bg-ck-primary text-ck-on-primary"
                  : "text-ck-muted",
              )}
            >
              {t(option === "dark" ? "themeDark" : "themeLight")}
            </button>
          ))}
        </SettingRow>

        {/* Язык. Тот же переключатель есть в шапке главного экрана: оба пишут
            куку `NEXT_LOCALE` через src/lib/checker/locale.ts — без неё
            middleware по одному адресу не отличил бы «выбрал этот язык» от
            «языка не выбирал» и снова показал бы английский. */}
        <SettingRow label={t("language")}>
          {routing.locales.map((loc) => (
            <Link
              key={loc}
              href={pathname}
              locale={loc}
              scroll={false}
              onClick={() => {
                rememberCheckerLocale(loc);
                onClose();
              }}
              aria-current={loc === locale ? "true" : undefined}
              className={cn(
                "flex min-w-[44px] items-center justify-center rounded-full px-3 py-2 text-[13px] font-extrabold",
                loc === locale
                  ? "bg-ck-primary text-ck-on-primary"
                  : "text-ck-muted",
              )}
            >
              {CHECKER_LOCALE_LABELS[loc]}
            </Link>
          ))}
        </SettingRow>

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

        {/* Значок выхода — слева, в плитке: справа он дублировал бы сам себя. */}
        <MoreRow
          danger
          glyph={LogOut}
          tint="bg-ck-danger-tint text-ck-danger"
          label={t("logout")}
          onClick={() => void logout()}
        />

        <span className="ck-mono mt-1 text-center text-[10px] tracking-[0.12em] text-ck-faint">
          V {process.env.NEXT_PUBLIC_APP_VERSION} · BY SKYFOREST
        </span>
      </div>
    </CkSheet>
  );
}
