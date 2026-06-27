import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const maxDuration = 60;

// GET /api/cron/auctions — finalize ended auctions and expire overdue
// winner confirmations (auto-promoting the waitlist). Secured by CRON_SECRET.
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || cronSecret.length < 16) {
    console.error("CRON_SECRET is not configured or too short");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  const { data: finalized, error: finalizeErr } = await supabase.rpc("finalize_due_auctions");
  if (finalizeErr) {
    console.error("finalize_due_auctions error:", finalizeErr);
  }

  const { data: expired, error: expireErr } = await supabase.rpc("expire_tour_confirmations");
  if (expireErr) {
    console.error("expire_tour_confirmations error:", expireErr);
  }

  return NextResponse.json({
    success: true,
    finalized: finalized ?? null,
    expired: expired ?? null,
  });
}
