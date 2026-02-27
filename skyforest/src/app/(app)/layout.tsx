import type { Metadata } from "next";
import { AppHeader } from "@/components/app/AppHeader";
import { TokenProvider } from "@/lib/TokenContext";

export const metadata: Metadata = {
  title: "Приложение",
};

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TokenProvider>
      <div className="relative flex min-h-screen flex-col">
        {/* Video background */}
        <div className="fixed inset-0 -z-10">
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
        <AppHeader />
        <main className="flex-1">{children}</main>
      </div>
    </TokenProvider>
  );
}
