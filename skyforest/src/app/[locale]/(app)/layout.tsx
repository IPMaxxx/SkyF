import { AppShell } from "@/components/app/AppShell";
import { TokenProvider } from "@/lib/TokenContext";
import { AppDataProvider } from "@/lib/AppDataContext";
import { Toaster } from "sonner";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("appMeta");
  return {
    title: t("title"),
  };
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TokenProvider>
    <AppDataProvider>
      <AppShell>{children}</AppShell>
      <Toaster
        position="top-right"
        theme="dark"
        richColors
        toastOptions={{
          style: {
            background: "rgba(26, 42, 31, 0.95)",
            border: "1px solid rgba(255,255,255,0.1)",
            backdropFilter: "blur(16px)",
          },
        }}
      />
    </AppDataProvider>
    </TokenProvider>
  );
}
