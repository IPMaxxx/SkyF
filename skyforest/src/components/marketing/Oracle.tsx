import { AlertTriangle } from "lucide-react";
import { getTranslations } from "next-intl/server";

export async function Oracle() {
  const t = await getTranslations("oracle");

  return (
    <section className="relative py-16 sm:py-20">
      <div className="absolute inset-0 bg-primary/10" />
      <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-primary/20" />
      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <div className="mb-6 inline-flex items-center justify-center rounded-full bg-primary/20 p-3">
          <AlertTriangle className="h-6 w-6 text-primary-light" />
        </div>
        <h2 className="mb-4 text-2xl font-bold text-white sm:text-3xl">
          {t("title")}
        </h2>
        <p className="text-lg leading-relaxed text-white/70">
          {t("body")}
          <span className="text-white font-medium">{t("bodyEmphasis")}</span>
        </p>
      </div>
    </section>
  );
}
