"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

type Platform = "ios" | "android" | "desktop" | "other";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

type PwaInstallContextValue = {
  platform: Platform;
  isMobile: boolean;
  isStandalone: boolean;
  canInstallNow: boolean;
  isIosSafari: boolean;
  showIosHelp: boolean;
  promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
  openIosHelp: () => void;
  closeIosHelp: () => void;
};

const PwaInstallContext = createContext<PwaInstallContextValue | null>(null);

const detectPlatform = (): Platform => {
  if (typeof window === "undefined") return "other";
  const ua = window.navigator.userAgent.toLowerCase();
  const platform = (window.navigator.platform || "").toLowerCase();

  const isIPadOs =
    platform === "macintel" && (navigator.maxTouchPoints || 0) > 1;
  if (/iphone|ipad|ipod/.test(ua) || isIPadOs) return "ios";
  if (/android/.test(ua)) return "android";
  if (/mobi|tablet/.test(ua)) return "other";
  return "desktop";
};

const detectIosSafari = (): boolean => {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const platform = (window.navigator.platform || "").toLowerCase();
  const isIPadOs =
    platform === "macintel" && (navigator.maxTouchPoints || 0) > 1;
  const isIos = /iPhone|iPad|iPod/.test(ua) || isIPadOs;
  if (!isIos) return false;
  const isSafari =
    /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|YaBrowser/.test(ua);
  return isSafari;
};

const detectStandalone = (): boolean => {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia?.("(display-mode: standalone)");
  const navStandalone = (window.navigator as Navigator & {
    standalone?: boolean;
  }).standalone;
  return Boolean(mq?.matches || navStandalone);
};

const noopSubscribe = () => () => {};

const subscribeStandalone = (cb: () => void) => {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia?.("(display-mode: standalone)");
  mq?.addEventListener?.("change", cb);
  window.addEventListener("appinstalled", cb);
  return () => {
    mq?.removeEventListener?.("change", cb);
    window.removeEventListener("appinstalled", cb);
  };
};

export function PwaInstallProvider({ children }: { children: ReactNode }) {
  const platform = useSyncExternalStore<Platform>(
    noopSubscribe,
    detectPlatform,
    () => "other"
  );
  const isIosSafari = useSyncExternalStore<boolean>(
    noopSubscribe,
    detectIosSafari,
    () => false
  );
  const isStandalone = useSyncExternalStore<boolean>(
    subscribeStandalone,
    detectStandalone,
    () => false
  );

  const [canInstallNow, setCanInstallNow] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (
      window.location.protocol !== "https:" &&
      window.location.hostname !== "localhost"
    ) {
      return;
    }
    const onLoad = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => undefined);
    };
    if (document.readyState === "complete") {
      onLoad();
      return;
    }
    window.addEventListener("load", onLoad, { once: true });
    return () => window.removeEventListener("load", onLoad);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
      setCanInstallNow(true);
    };

    const onAppInstalled = () => {
      deferredPromptRef.current = null;
      setCanInstallNow(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (isIosSafari) {
      setShowIosHelp(true);
      return "unavailable" as const;
    }
    const evt = deferredPromptRef.current;
    if (!evt) {
      if (platform === "ios") {
        setShowIosHelp(true);
      }
      return "unavailable" as const;
    }
    try {
      await evt.prompt();
      const choice = await evt.userChoice;
      deferredPromptRef.current = null;
      setCanInstallNow(false);
      return choice.outcome;
    } catch {
      return "unavailable" as const;
    }
  }, [isIosSafari, platform]);

  const openIosHelp = useCallback(() => setShowIosHelp(true), []);
  const closeIosHelp = useCallback(() => setShowIosHelp(false), []);

  const isMobile = platform === "ios" || platform === "android";

  const value = useMemo<PwaInstallContextValue>(
    () => ({
      platform,
      isMobile,
      isStandalone,
      canInstallNow,
      isIosSafari,
      showIosHelp,
      promptInstall,
      openIosHelp,
      closeIosHelp,
    }),
    [
      platform,
      isMobile,
      isStandalone,
      canInstallNow,
      isIosSafari,
      showIosHelp,
      promptInstall,
      openIosHelp,
      closeIosHelp,
    ]
  );

  return (
    <PwaInstallContext.Provider value={value}>
      {children}
    </PwaInstallContext.Provider>
  );
}

export function usePwaInstall(): PwaInstallContextValue {
  const ctx = useContext(PwaInstallContext);
  if (!ctx) {
    throw new Error("usePwaInstall must be used within PwaInstallProvider");
  }
  return ctx;
}
