import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/**
 * Посадочная Mushroom Checker: middleware переписывает "/" поддомена
 * checker.skyforest.ai на эту страницу (URL остаётся корнем).
 */
export default async function CheckerLanding({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const tFooter = await getTranslations({ locale, namespace: "footer" });
  const en = locale === "en";
  const t = en
    ? {
        tagline: "AI mushroom identification by photo",
        text: "Take a photo of a mushroom — AI names the species with a confidence score, warns about dangerous lookalikes and edibility.",
        cta: "Identify a mushroom",
        full: "Powered by SkyForest",
      }
    : {
        tagline: "ИИ-определение грибов по фото",
        text: "Сфотографируйте гриб — ИИ назовёт вид с процентом уверенности, предупредит об опасных двойниках и съедобности.",
        cta: "Определить гриб",
        full: "Работает на технологиях SkyForest",
      };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0c150f] px-6 text-center text-white">
      <Image
        src="/icons/checker-192.png"
        alt=""
        width={96}
        height={96}
        className="mb-6 rounded-3xl shadow-[0_8px_40px_rgba(98,168,99,0.35)]"
        priority
      />
      <h1 className="font-heading text-4xl font-bold tracking-tight">Mushroom Checker</h1>
      <p className="mt-3 max-w-md text-lg text-emerald-200/90">{t.tagline}</p>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-white/60">{t.text}</p>
      <Link
        href="/dashboard/identify"
        className="mt-8 rounded-2xl bg-[#62a863] px-8 py-4 text-base font-bold text-[#0b130d] transition-transform hover:scale-[1.02] active:scale-95"
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
              className="text-xs text-white/45 underline-offset-4 hover:text-white/70 hover:underline"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
      <a
        href="https://skyforest.ai"
        className="mt-4 text-xs text-white/35 underline-offset-4 hover:text-white/60 hover:underline"
      >
        {t.full}
      </a>
    </main>
  );
}
