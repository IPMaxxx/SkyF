import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function generateMetadata() {
  const t = await getTranslations("notFound");
  return {
    title: `404 — ${t("title")}`,
  };
}

export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center">
        <h1 className="mb-2 text-5xl sm:text-6xl font-bold text-primary">404</h1>
        <p className="mb-6 text-base sm:text-lg text-muted-foreground">
          {t("title")}
        </p>
        <Link
          href="/"
          className="rounded-xl bg-primary px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
        >
          {t("home")}
        </Link>
      </div>
    </div>
  );
}
