import { flavorFromHost } from "@/lib/appFlavor";
import { resolveAuthNext } from "@/lib/appOrigin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Домашний экран у каждого приложения свой: /dashboard есть только у SkyForest.
  const redirect = resolveAuthNext(
    searchParams.get("redirect"),
    flavorFromHost(request.headers.get("host")),
  );

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${redirect}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
