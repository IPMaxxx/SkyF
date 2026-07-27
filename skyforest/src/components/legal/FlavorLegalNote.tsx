import { getTranslations } from "next-intl/server";
import { getServerFlavorConfig } from "@/lib/serverFlavor";

/**
 * Пояснение на юридических страницах флейворов: документы оформлены на то же
 * юрлицо и описывают все его сервисы, поэтому пункты про отсутствующую в
 * приложении функциональность к нему не относятся. В SkyForest не рендерится.
 */
export async function FlavorLegalNote() {
  const flavor = await getServerFlavorConfig();
  if (flavor.id === "skyforest") return null;

  const t = await getTranslations("common");

  return (
    <p className="mb-6 rounded-xl border border-white/10 bg-white/[0.04] p-4 text-sm leading-relaxed text-muted-foreground">
      {t("flavorLegalNote", { app: flavor.name })}
    </p>
  );
}
