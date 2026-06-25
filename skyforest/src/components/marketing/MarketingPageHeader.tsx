import { MarketingBreadcrumbs } from "@/components/marketing/MarketingBreadcrumbs";
import type { BreadcrumbItem } from "@/lib/marketingSeo";
import type { Locale } from "@/i18n/routing";

type Props = {
  locale: Locale | string;
  title: string;
  description?: string;
  breadcrumbs: BreadcrumbItem[];
};

export function MarketingPageHeader({
  locale,
  title,
  description,
  breadcrumbs,
}: Props) {
  return (
    <header className="mb-6 sm:mb-8">
      <MarketingBreadcrumbs
        locale={locale}
        items={breadcrumbs}
        className="mb-4"
      />
      <h1 className="text-2xl sm:text-3xl font-bold">{title}</h1>
      {description && (
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
          {description}
        </p>
      )}
    </header>
  );
}
