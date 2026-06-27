import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServerClient } from "@supabase/ssr";

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

// GET /api/admin/tours/[id]/participants — full de-anonymized picture.
export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const admin = adminClient();

  const [tourRes, partsRes, bidsRes] = await Promise.all([
    admin.from("mushroom_tours").select("*").eq("id", id).single(),
    admin
      .from("tour_participants")
      .select("*")
      .eq("tour_id", id)
      .order("best_amount", { ascending: false }),
    admin
      .from("tour_bids")
      .select("id, user_id, amount, created_at")
      .eq("tour_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (tourRes.error || !tourRes.data) {
    return NextResponse.json({ error: "Тур не найден" }, { status: 404 });
  }

  const parts = partsRes.data ?? [];
  const bids = bidsRes.data ?? [];

  const userIds = [...new Set(parts.map((p) => p.user_id as string))];
  const profileMap = new Map<string, Record<string, unknown>>();
  if (userIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, email, full_name, phone, contact_link")
      .in("id", userIds);
    for (const p of profiles ?? []) profileMap.set(p.id as string, p);
  }

  const bidsByUser = new Map<string, { amount: number; created_at: string }[]>();
  for (const b of bids) {
    const arr = bidsByUser.get(b.user_id as string) ?? [];
    arr.push({ amount: b.amount as number, created_at: b.created_at as string });
    bidsByUser.set(b.user_id as string, arr);
  }

  const participants = parts.map((p) => {
    const profile = profileMap.get(p.user_id as string);
    return {
      participant_no: p.participant_no,
      user_id: p.user_id,
      email: profile?.email ?? null,
      full_name: profile?.full_name ?? null,
      phone: profile?.phone ?? null,
      contact_link: profile?.contact_link ?? null,
      best_amount: p.best_amount,
      bids_count: p.bids_count,
      tokens_spent: p.tokens_spent,
      rank: p.rank,
      status: p.status,
      confirm_deadline: p.confirm_deadline,
      confirmed_at: p.confirmed_at,
      bids: bidsByUser.get(p.user_id as string) ?? [],
    };
  });

  return NextResponse.json(
    { tour: tourRes.data, participants },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}

// POST /api/admin/tours/[id]/participants — admin actions on a participant.
// body: { user_id, action: "no_show" | "promote" }
export async function POST(request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const body = await request.json().catch(() => ({}));
  const action = body.action as string | undefined;
  const userId = body.user_id as string | undefined;

  const admin = adminClient();

  if (action === "no_show") {
    if (!userId) return NextResponse.json({ error: "user_id required" }, { status: 400 });
    const { error } = await admin
      .from("tour_participants")
      .update({ status: "no_show", confirm_deadline: null, updated_at: new Date().toISOString() })
      .eq("tour_id", id)
      .eq("user_id", userId);
    if (error) {
      console.error("Admin no_show error:", error);
      return NextResponse.json({ error: "Не удалось отметить неявку" }, { status: 500 });
    }
    await admin.rpc("promote_tour_waitlist", { p_tour_id: id });
    return NextResponse.json({ success: true });
  }

  if (action === "promote") {
    const { error } = await admin.rpc("promote_tour_waitlist", { p_tour_id: id });
    if (error) {
      console.error("Admin promote error:", error);
      return NextResponse.json({ error: "Не удалось продвинуть лист ожидания" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Неизвестное действие" }, { status: 400 });
}
