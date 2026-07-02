import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServerClient } from "@supabase/ssr";
import { sendEmail } from "@/lib/email";
import { buildTourAuctionScheduledEmail } from "@/lib/email-templates";
import { BRAND } from "@/lib/brand";

type Ctx = { params: Promise<{ id: string }> };

function adminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401 as const, error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", user.id)
    .single();

  if (profile?.account_type !== "admin") {
    return { ok: false, status: 403 as const, error: "Forbidden" };
  }
  return { ok: true, status: 200 as const, error: null };
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || BRAND.url;

// POST /api/admin/tours/[id]/notify — email every follower that the auction
// date has been set. Manual, admin-triggered.
export async function POST(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const admin = adminClient();

  const { data: tour } = await admin
    .from("mushroom_tours")
    .select("id, title, tour_date, auction_start_at")
    .eq("id", id)
    .single();

  if (!tour) return NextResponse.json({ error: "Тур не найден" }, { status: 404 });
  if (!tour.auction_start_at) {
    return NextResponse.json(
      { error: "Сначала укажите дату аукциона" },
      { status: 400 }
    );
  }

  const { data: followers } = await admin
    .from("tour_followers")
    .select("user_id")
    .eq("tour_id", id);

  const userIds = (followers ?? []).map((f) => f.user_id);
  if (userIds.length === 0) {
    return NextResponse.json({ success: true, sent: 0, skipped: 0 });
  }

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, email")
    .in("id", userIds);

  const auctionDate = new Date(tour.auction_start_at).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const tourDate = tour.tour_date
    ? new Date(tour.tour_date).toLocaleDateString("ru-RU")
    : null;
  const tourUrl = `${APP_URL}/tours/${id}`;
  const html = buildTourAuctionScheduledEmail({
    tourTitle: tour.title,
    auctionDate,
    tourDate,
    tourUrl,
  });
  const subject = `Skyforest: auction date scheduled — ${tour.title}`;

  let sent = 0;
  let skipped = 0;
  for (const p of profiles ?? []) {
    if (!p.email) {
      skipped++;
      continue;
    }
    try {
      await sendEmail(p.email, subject, html);
      sent++;
    } catch (e) {
      console.error("Tour notify email failed:", p.id, e);
      skipped++;
    }
  }

  const nowIso = new Date().toISOString();
  await admin
    .from("tour_followers")
    .update({ notified_at: nowIso })
    .eq("tour_id", id);
  await admin
    .from("mushroom_tours")
    .update({ notifications_sent_at: nowIso })
    .eq("id", id);

  return NextResponse.json({ success: true, sent, skipped });
}
