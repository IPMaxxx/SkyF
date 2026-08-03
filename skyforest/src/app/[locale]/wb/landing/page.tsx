import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/**
 * Посадочная WayBack: middleware переписывает "/" поддомена
 * wayback.skyforest.ai на этот путь (URL остаётся корнем).
 *
 * Цвета — токены тёмной схемы WayBack (canvas #0b120d, акцент #5fb573), те же,
 * что на экранах приложения: витрина и приложение должны выглядеть одним
 * продуктом.
 */
export default async function WaybackLanding({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const tFooter = await getTranslations({ locale, namespace: "footer" });
  const en = locale === "en";
  const t = en
    ? {
        tagline: "Always find your way back to where you started",
        text: "Mark your entry point — the arrow and offline map will lead you back even with no internet and no mobile signal. Download the map of your area in advance.",
        cta: "Open the map",
        full: "Powered by SkyForest",
      }
    : {
        tagline: "Всегда выведет обратно к точке входа",
        text: "Отметьте точку входа — стрелка и офлайн-карта выведут обратно даже без интернета и связи. Карту своего района можно скачать заранее.",
        cta: "Открыть карту",
        full: "Работает на технологиях SkyForest",
      };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-wb-canvas px-6 text-center text-wb-ink">
      <Image
        src="/icons/wayback-192.png"
        alt=""
        width={96}
        height={96}
        className="mb-6 rounded-3xl shadow-[0_8px_40px_rgba(95,181,115,0.35)]"
        priority
      />
      <h1 className="font-heading text-4xl font-bold tracking-tight">WayBack</h1>
      <p className="mt-3 max-w-md text-lg text-wb-primary">{t.tagline}</p>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-wb-body">
        {t.text}
      </p>
      <Link
        href="/dashboard/track"
        className="mt-8 rounded-2xl bg-wb-primary px-8 py-4 text-base font-bold text-wb-on-primary transition-transform hover:scale-[1.02] active:scale-95"
      >
        {t.cta}
      </Link>
      {/* Документы приложения: требование сторов и просто нужны пользователю. */}
      <ul className="mt-10 flex flex-wrap justify-center gap-x-4 gap-y-2">
        {[
          { href: "/offer", label: tFooter("offer") },
          { href: "/privacy", label: tFooter("privacy") },
          { href: "/delete-account", label: tFooter("deleteAccount") },
        ].map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-xs text-wb-muted-2 underline-offset-4 hover:text-wb-ink-2 hover:underline"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
      <a
        href="https://skyforest.ai"
        className="mt-4 text-xs text-wb-muted-3 underline-offset-4 hover:text-wb-ink-2 hover:underline"
      >
        {t.full}
      </a>
    </main>
  );
}
