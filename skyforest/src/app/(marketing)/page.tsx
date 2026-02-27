import { Hero } from "@/components/marketing/Hero";
import { Bridge } from "@/components/marketing/Bridge";
import { Oracle } from "@/components/marketing/Oracle";
import { Tariffs } from "@/components/marketing/Tariffs";
import { CTASection } from "@/components/marketing/CTASection";
import { FAQ } from "@/components/marketing/FAQ";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Bridge />
      <Oracle />
      <Tariffs />
      <CTASection />
      <FAQ />
    </>
  );
}
