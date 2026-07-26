import Image from "next/image";
import { Link } from "@/i18n/navigation";

/**
 * Посадочная WayBack: middleware переписывает "/" поддомена
 * wayback.skyforest.ai на эту страницу (URL остаётся корнем).
 */
export default async function WaybackLanding({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const en = locale === "en";
  const t = en
    ? {
        tagline: "Always find your way back out of the forest",
        text: "Mark your entry point — the arrow and offline map will lead you back even with no internet and no mobile signal. Download the map of your area in advance.",
        cta: "Open the map",
        full: "Powered by SkyForest",
      }
    : {
        tagline: "Всегда выведет из леса к точке входа",
        text: "Отметьте точку входа — стрелка и офлайн-карта выведут обратно даже без интернета и связи. Карту своего района можно скачать заранее.",
        cta: "Открыть карту",
        full: "Работает на технологиях SkyForest",
      };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0e1710] px-6 text-center text-white">
      <Image
        src="/icons/wayback-192.png"
        alt=""
        width={96}
        height={96}
        className="mb-6 rounded-3xl shadow-[0_8px_40px_rgba(16,185,129,0.35)]"
        priority
      />
      <h1 className="font-heading text-4xl font-bold tracking-tight">WayBack</h1>
      <p className="mt-3 max-w-md text-lg text-emerald-200/90">{t.tagline}</p>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-white/60">{t.text}</p>
      <Link
        href="/dashboard/track"
        className="mt-8 rounded-2xl bg-[#10b981] px-8 py-4 text-base font-bold text-[#04140f] transition-transform hover:scale-[1.02] active:scale-95"
      >
        {t.cta}
      </Link>
      <a
        href="https://skyforest.ai"
        className="mt-10 text-xs text-white/35 underline-offset-4 hover:text-white/60 hover:underline"
      >
        {t.full}
      </a>
    </main>
  );
}
