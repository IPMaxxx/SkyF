"use client";

/**
 * Шапка Mushroom Checker: логотип-марка + название слева, кнопка меню справа.
 *
 * Меню — нижний лист (а не выпадающая панель): «Подписка» и «Аккаунт» должны
 * открываться в один тап, это вся навигация приложения.
 */

import Image from "next/image";
import { useState } from "react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { FLAVORS } from "@/lib/appFlavor";
import { cn } from "@/lib/utils";
import { CkSheet } from "@/components/checker/primitives";

const MENU_ITEMS = [
  { href: "/dashboard/identify", key: "identify", tint: "bg-ck-primary" },
  { href: "/payment", key: "subscription", tint: "bg-ck-amber-border" },
  { href: "/account", key: "account", tint: "bg-ck-border" },
] as const;

export function CheckerHeader() {
  const t = useTranslations("checker.menu");
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setOpen(false);
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      <header className="font-ck mx-auto flex w-full max-w-[520px] items-center justify-between px-5 pb-1.5 pt-[calc(8px+env(safe-area-inset-top))]">
        <Link
          href="/dashboard/identify"
          className="flex items-center gap-[11px] rounded-full"
          aria-label={FLAVORS.checker.name}
        >
          <Image
            src={FLAVORS.checker.faviconPath}
            alt=""
            width={72}
            height={72}
            className="h-9 w-9 rounded-full object-cover"
          />
          <span className="text-[18px] font-extrabold tracking-[-0.02em] text-[#16291d]">
            {t("brandShort")}
          </span>
        </Link>

        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t("open")}
          aria-expanded={open}
          className="flex h-[38px] w-[38px] flex-col items-center justify-center gap-1 rounded-full border border-ck-border-4 bg-ck-surface"
        >
          <i className="block h-[2px] w-4 rounded-sm bg-[#41594a]" />
          <i className="block h-[2px] w-4 rounded-sm bg-[#41594a]" />
        </button>
      </header>

      <CkSheet
        open={open}
        onClose={() => setOpen(false)}
        label={t("close")}
        scrim={0.42}
      >
        <div className="flex flex-col gap-1.5">
          {MENU_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3.5 rounded-[22px] px-4 py-[15px]",
                  active && "bg-ck-primary-tint",
                )}
              >
                <i
                  className={cn(
                    "block h-[22px] w-[22px] flex-none rounded-[7px]",
                    item.tint,
                  )}
                />
                <span
                  className={cn(
                    "flex-1 text-[16px]",
                    active
                      ? "font-extrabold text-ck-primary-deep"
                      : "font-bold text-ck-ink-2",
                  )}
                >
                  {t(item.key)}
                </span>
                {item.key === "subscription" && (
                  <span className="rounded-full border border-ck-amber-border bg-ck-amber-tint px-[9px] py-1 text-[11px] font-extrabold text-ck-amber">
                    {t("premiumPill")}
                  </span>
                )}
              </Link>
            );
          })}

          <div className="mx-4 my-2 h-px bg-ck-hairline" />

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-3.5 rounded-[22px] px-4 py-[15px]"
          >
            <i className="block h-[22px] w-[22px] flex-none rounded-[7px] bg-ck-danger-tint" />
            <span className="text-[16px] font-bold text-ck-danger">
              {t("logout")}
            </span>
          </button>

          <span className="ck-mono mt-1.5 text-center text-[10px] tracking-[0.12em] text-[#a8b6ac]">
            V {process.env.NEXT_PUBLIC_APP_VERSION} · BY SKYFOREST
          </span>
        </div>
      </CkSheet>
    </>
  );
}
