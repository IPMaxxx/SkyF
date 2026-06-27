"use client";

import { useLocale, useTranslations } from "next-intl";
import { MarketingBreadcrumbs } from "@/components/marketing/MarketingBreadcrumbs";

type Props = {
  title: string;
  className?: string;
};

export function BlogArticleHeader({ title, className }: Props) {
  const locale = useLocale();
  const t = useTranslations("header");

  return (
    <MarketingBreadcrumbs
      locale={locale}
      items={[
        { name: t("blog"), path: "/blog" },
        { name: title },
      ]}
      className={className ?? "mb-4"}
    />
  );
}
