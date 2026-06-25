import { Link } from "@/i18n/navigation";
import { breadcrumbListJsonLd, type BreadcrumbItem } from "@/lib/marketingSeo";
import type { Locale } from "@/i18n/routing";

type Props = {
  locale: Locale | string;
  items: BreadcrumbItem[];
  className?: string;
};

export function MarketingBreadcrumbs({ locale, items, className }: Props) {
  const homeLabel = locale === "en" ? "Home" : "Главная";
  const trail = [{ name: homeLabel, path: "/" as const }, ...items];
  const jsonLd = breadcrumbListJsonLd(locale, items);

  return (
    <>
      <nav
        aria-label={locale === "en" ? "Breadcrumb" : "Хлебные крошки"}
        className={className}
      >
        <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
          {trail.map((crumb, index) => {
            const isLast = index === trail.length - 1;
            return (
              <li key={`${crumb.path ?? crumb.name}-${index}`} className="flex items-center gap-1.5">
                {index > 0 && (
                  <span aria-hidden="true" className="text-white/30">
                    /
                  </span>
                )}
                {isLast || !crumb.path ? (
                  <span
                    className={isLast ? "font-medium text-foreground" : undefined}
                    aria-current={isLast ? "page" : undefined}
                  >
                    {crumb.name}
                  </span>
                ) : (
                  <Link
                    href={crumb.path}
                    className="transition-colors hover:text-primary-light"
                  >
                    {crumb.name}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}
