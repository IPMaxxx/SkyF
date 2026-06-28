"use client";

/**
 * Shows the tour's main-mushroom photos (up to 5): a large cover image plus a
 * row of thumbnails. Falls back to a single image when only one is available.
 */
export function TourGallery({
  images,
  alt = "",
  coverClass = "h-64 sm:h-80",
}: {
  images: string[];
  alt?: string;
  coverClass?: string;
}) {
  const pics = (images || []).filter(Boolean).slice(0, 5);
  if (pics.length === 0) return null;

  const [cover, ...rest] = pics;

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-2xl border border-border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cover} alt={alt} className={`w-full object-cover ${coverClass}`} />
      </div>
      {rest.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {rest.map((src, i) => (
            <div key={i} className="overflow-hidden rounded-xl border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={alt} className="h-20 w-full object-cover sm:h-24" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
