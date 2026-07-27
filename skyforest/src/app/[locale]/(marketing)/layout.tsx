import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";
import { FlavorLegalShell } from "@/components/marketing/FlavorLegalShell";
import { getServerFlavorConfig } from "@/lib/serverFlavor";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // На поддоменах флейворов из этой группы доступны только юридические
  // страницы — им нужна своя минимальная оболочка без навигации SkyForest.
  const flavor = await getServerFlavorConfig();
  if (flavor.id !== "skyforest") {
    return <FlavorLegalShell flavor={flavor}>{children}</FlavorLegalShell>;
  }

  return (
    <div className="relative min-h-screen">
      {/* Video background */}
      <div className="fixed inset-0 z-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        >
          <source src="/images/background.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a1f0f]/40 via-transparent to-[#0a1f0f]/60" />
      </div>
      <div className="relative z-10">
        <Header />
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
}
