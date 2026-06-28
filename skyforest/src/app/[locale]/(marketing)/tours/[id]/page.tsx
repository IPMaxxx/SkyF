import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MarketingPageHeader } from "@/components/marketing/MarketingPageHeader";
import { marketingPageMetadata } from "@/lib/marketingSeo";
import { createClient } from "@/lib/supabase/server";
import { TourPublicView } from "@/components/marketing/TourPublicView";
import type { MushroomTour } from "@/lib/supabase/types";

type Props = { params: Promise<{ locale: string; id: string }> };

const PUBLIC_FIELDS =
  "id, title, description, departure_lat, departure_lng, departure_desc, mushroom_species, mushroom_image_url, mushroom_images, tour_date, departure_time, spots, auction_start_at, auction_end_at, start_price, bid_step, currency, status, followers_count";

async function getPublicTour(id: string): Promise<MushroomTour | null> {
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("mushroom_tours")
    .select(PUBLIC_FIELDS)
    .eq("id", id)
    .in("status", ["announced", "published", "finished"])
    .maybeSingle();
  return (data as MushroomTour | null) ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "mushroomTours" });
  const tour = await getPublicTour(id);
  if (!tour) {
    return marketingPageMetadata({
      title: t("title"),
      description: t("public.metaDescription"),
      path: `/tours/${id}`,
      locale,
    });
  }
  return marketingPageMetadata({
    title: `${tour.title} — ${t("public.eyebrow")}`,
    description: tour.description?.slice(0, 160) || t("public.metaDescription"),
    path: `/tours/${id}`,
    locale,
  });
}

export default async function PublicTourPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("mushroomTours");
  const tour = await getPublicTour(id);

  if (!tour) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 sm:pb-20 pt-24 sm:pt-28 sm:px-6 lg:px-8">
      <MarketingPageHeader
        locale={locale}
        title={tour.title}
        description={t("public.eyebrow")}
        breadcrumbs={[
          { name: t("title"), path: "/services" },
          { name: tour.title, path: `/tours/${id}` },
        ]}
      />
      <TourPublicView tour={tour} />
    </div>
  );
}
