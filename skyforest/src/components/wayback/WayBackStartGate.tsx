"use client";

/**
 * Обязательный гейт на старте WayBack: вход → пробный период → приложение.
 *
 * Порядок именно такой, и он не произвольный. Право на приложение хранится на
 * сервере в `user_subscriptions` и привязано к учётной записи: чек стора
 * проверяется в `/api/native/iap/verify-subscription` под конкретным
 * пользователем. Купить раньше входа технически можно, но записать покупку было
 * бы некуда, а «Восстановить покупки» после смены телефона не нашло бы, к чему
 * её привязать. Поэтому сначала аккаунт, потом стор.
 *
 * Гейт работает ТОЛЬКО в нативной оболочке. В браузере покупки стора не
 * существует, и такой экран стал бы тупиком без единственной кнопки, которая
 * его снимает; на вебе трек остаётся открытым, а `/payment` объясняет, что
 * оформить подписку можно в приложении.
 *
 * Из каждого состояния есть выход: на входе — другой аккаунт, на пейволле —
 * «Восстановить покупки» и смена аккаунта, при отсутствии связи — повтор и то
 * же восстановление. Тупик означал бы отказ на ревью и запертого пользователя.
 *
 * Экран трека и меню компонент не трогает: он либо рисует своё, либо отдаёт
 * `children` как есть.
 */

import { useCallback } from "react";
import { Loader2, WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useIsNative } from "@/lib/native/useIsNative";
import { storeName } from "@/lib/native/capacitor";
import { useWaybackGate } from "@/lib/wayback/entitlement";
import { useWaybackPurchase } from "@/lib/wayback/useWaybackPurchase";
import { waybackSignOut } from "@/lib/wayback/signOut";
import { WayBackTrialTerms } from "@/components/wayback/WayBackTrialTerms";
import {
  WayBackAuthDivider,
  WayBackSocialButtons,
} from "@/components/wayback/WayBackSocialButtons";
import {
  WbPrimaryButton,
  WbQuietButton,
  WbTile,
  WbTopBar,
} from "@/components/wayback/primitives";

const HOME = "/dashboard/track";

/** Тихая ссылка-выход, одна на все состояния гейта. */
function GateExit({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mx-auto w-fit py-1 text-[12.5px] font-bold text-wb-muted underline decoration-wb-border-3 underline-offset-4"
    >
      {label}
    </button>
  );
}

/**
 * Каркас гейта: экран ровно в высоту вьюпорта, контент скроллится внутри,
 * действие всегда на виду.
 *
 * Почему не `WbScreen`: там нижний блок стоит в потоке за контентом, и на
 * экране 667px раскрытие условий (сократить нельзя — требование сторов)
 * уводило единственную кнопку «дальше» под сгиб. У обязательного гейта так
 * нельзя: не найдя кнопку, человек не выйдет с экрана вообще.
 *
 * Цвета — токены `wb-*`, поэтому каркас переживёт смену темы приложения.
 */
function GateScreen({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex h-[100dvh] w-full max-w-[520px] flex-col px-4 text-wb-ink">
      <div className="min-h-0 flex-1 overflow-y-auto pb-4">{children}</div>
      {footer && (
        <div className="-mx-4 flex flex-col gap-2.5 border-t border-wb-hairline bg-wb-canvas px-4 pt-3 pb-[calc(16px+env(safe-area-inset-bottom))]">
          {footer}
        </div>
      )}
    </div>
  );
}

export function WayBackStartGate({ children }: { children: React.ReactNode }) {
  const native = useIsNative();
  const router = useRouter();
  const t = useTranslations("wayback.gate");
  const tp = useTranslations("wayback.paywall");
  const { status, email, recheck } = useWaybackGate(native);

  const {
    price,
    trialDays,
    purchasing,
    restoring,
    error,
    nothingRestored,
    subscribe,
    restore,
  } = useWaybackPurchase(recheck, tp("purchaseFailed"));

  const store = native
    ? storeName()
    : `${tp("storeApple")} / ${tp("storeGoogle")}`;

  const signOut = useCallback(async () => {
    await waybackSignOut();
    // Кеш права чистит сам гейт по событию auth — здесь достаточно перерисовки.
    router.refresh();
  }, [router]);

  if (status === "allowed") return <>{children}</>;

  if (status === "resolving") {
    return (
      <GateScreen>
        <div className="flex h-full flex-col items-center justify-center gap-3">
          <Loader2
            className="h-6 w-6 animate-spin text-wb-primary"
            aria-hidden="true"
          />
          <p className="text-[13px] font-medium text-wb-muted">
            {t("checking")}
          </p>
        </div>
      </GateScreen>
    );
  }

  /* ---------------- Шаг 1: учётная запись ---------------- */

  if (status === "needAuth") {
    return (
      <GateScreen>
        <WbTopBar title={t("authTitle")} eyebrow={t("eyebrow")} />

        <div className="flex flex-col gap-2.5">
          <WbTile tone="tint" className="px-5 py-[18px]">
            <p className="text-[13.5px] font-medium leading-[1.5] text-wb-body">
              {t("authBody")}
            </p>
          </WbTile>

          <WbTile className="flex flex-col gap-1 px-4 py-4">
            <WayBackSocialButtons redirect={HOME} />
            <WayBackAuthDivider />
            <WbQuietButton
              onClick={() => router.push(`/login?redirect=${HOME}`)}
            >
              {t("authEmail")}
            </WbQuietButton>
          </WbTile>

          <WayBackTrialTerms
            trialDays={trialDays}
            price={price}
            store={store}
          />
        </div>
      </GateScreen>
    );
  }

  /* ---------------- Нет связи ---------------- */

  if (status === "unreachable") {
    return (
      <GateScreen
        footer={
          <>
            <WbPrimaryButton onClick={() => void recheck()}>
              {t("retry")}
            </WbPrimaryButton>
            <button
              type="button"
              onClick={() => void restore()}
              disabled={restoring}
              className="mx-auto flex w-fit items-center gap-2 py-1 text-[12.5px] font-extrabold text-wb-primary disabled:opacity-55"
            >
              {restoring && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t("offlineRestore")}
            </button>
          </>
        }
      >
        <WbTopBar title={t("offlineTitle")} eyebrow={t("eyebrow")} />

        <div className="flex flex-col gap-2.5">
          <WbTile className="flex flex-col gap-3 px-5 py-[18px]">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-wb-amber-tint text-wb-amber-ink">
              <WifiOff
                className="h-5 w-5"
                strokeWidth={2.2}
                aria-hidden="true"
              />
            </span>
            <p className="text-[13.5px] font-medium leading-[1.5] text-wb-body">
              {t("offlineBody", { store })}
            </p>
          </WbTile>

          {nothingRestored && (
            <WbTile
              tone="quiet"
              className="px-5 py-4 text-[13px] font-medium leading-[1.5] text-wb-body"
            >
              {t("nothingRestored", { store })}
            </WbTile>
          )}

          {email && (
            <GateExit
              label={t("switchAccount")}
              onClick={() => void signOut()}
            />
          )}
        </div>
      </GateScreen>
    );
  }

  /* ---------------- Шаг 2: пробный период ---------------- */

  return (
    <GateScreen
      footer={
        <>
          <WbPrimaryButton
            onClick={() => void subscribe()}
            disabled={purchasing}
          >
            {purchasing && <Loader2 className="h-4 w-4 animate-spin" />}
            {tp("cta", { days: trialDays })}
          </WbPrimaryButton>
          <p className="text-center text-[12px] font-medium leading-[1.45] text-wb-muted">
            {tp("renewNote", { price, period: tp("perYear"), store })}{" "}
            <button
              type="button"
              onClick={() => void restore()}
              disabled={restoring}
              className="font-extrabold text-wb-primary disabled:opacity-55"
            >
              {tp("restore")}
            </button>
          </p>
        </>
      }
    >
      <WbTopBar title={t("subTitle")} eyebrow={t("eyebrow")} />

      <div className="flex flex-col gap-2.5">
        <div className="flex items-end justify-between gap-3 rounded-[22px] bg-wb-primary px-5 py-[18px] text-wb-on-primary">
          <div className="flex flex-col gap-1">
            <span className="wb-mono text-[10.5px] tracking-[0.14em] text-wb-primary-soft uppercase">
              {tp("trialBadge", { days: trialDays })}
            </span>
            <span className="text-[34px] font-extrabold leading-[1.05] tracking-[-0.03em]">
              {price}
            </span>
          </div>
          <span className="pb-1 text-[13px] font-semibold text-wb-primary-soft">
            {tp("perYear")}
          </span>
        </div>

        <WbTile className="flex flex-col gap-2.5 px-5 py-[18px]">
          <p className="text-[13.5px] font-medium leading-[1.5] text-wb-body">
            {t("subBody", { days: trialDays })}
          </p>
          <div className="flex flex-col gap-1">
            {[tp("f1"), tp("f2"), tp("f3")].map((line) => (
              <span
                key={line}
                className="text-[13.5px] font-semibold text-wb-ink-2"
              >
                {line}
              </span>
            ))}
          </div>
        </WbTile>

        <WayBackTrialTerms trialDays={trialDays} price={price} store={store} />

        {error && (
          <WbTile
            tone="danger"
            className="px-5 py-4 text-[14px] font-bold text-wb-danger"
          >
            {error}
          </WbTile>
        )}

        {nothingRestored && !error && (
          <WbTile
            tone="quiet"
            className="px-5 py-4 text-[13px] font-medium leading-[1.5] text-wb-body"
          >
            {t("nothingRestored", { store })}
          </WbTile>
        )}

        {email && (
          <div className="flex flex-col gap-1 pb-1">
            <span className="wb-mono text-center text-[11px] text-wb-muted-3">
              {t("signedInAs", { email })}
            </span>
            <GateExit
              label={t("switchAccount")}
              onClick={() => void signOut()}
            />
          </div>
        )}
      </div>
    </GateScreen>
  );
}
