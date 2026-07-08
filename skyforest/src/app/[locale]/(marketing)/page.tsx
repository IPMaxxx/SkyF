import { Hero } from "@/components/marketing/Hero";
import { Bridge } from "@/components/marketing/Bridge";
import { Oracle } from "@/components/marketing/Oracle";
import { MushroomBot } from "@/components/marketing/MushroomBot";
import { TrackFeature } from "@/components/marketing/TrackFeature";
import { Tariffs } from "@/components/marketing/Tariffs";
import { CTASection } from "@/components/marketing/CTASection";
import { FAQ } from "@/components/marketing/FAQ";

export default async function HomePage() {
  return (
    <>
      <Hero />
      <Bridge />
      <Oracle />
      <MushroomBot />
      <TrackFeature />
      <Tariffs />
      <CTASection />
      <FAQ />
    </>
  );
}
