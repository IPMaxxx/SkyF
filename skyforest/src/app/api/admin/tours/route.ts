import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServerClient } from "@supabase/ssr";

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
  if (!user) return { error: "Unauthorized", status: 401 as const, user: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", user.id)
    .single();

  if (profile?.account_type !== "admin") {
    return { error: "Forbidden", status: 403 as const, user: null };
  }
  return { error: null, status: 200 as const, user };
}

const EDITABLE_FIELDS = [
  "title",
  "description",
  "departure_lat",
  "departure_lng",
  "departure_desc",
  "mushroom_species",
  "tour_date",
  "departure_time",
  "spots",
  "auction_start_at",
  "auction_end_at",
  "start_price",
  "bid_step",
  "currency",
  "anti_snipe_seconds",
  "confirm_window_hours",
  "status",
] as const;

function pickFields(body: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const f of EDITABLE_FIELDS) {
    if (f in body && body[f] !== undefined) out[f] = body[f] === "" ? null : body[f];
  }
  return out;
}

// GET /api/admin/tours — list all tours (incl. drafts/cancelled)
export async function GET() {
  const gate = await requireAdmin();
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const admin = adminClient();
  const { data, error } = await admin
    .from("mushroom_tours")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Admin tours list error:", error);
    return NextResponse.json({ error: "Query error" }, { status: 500 });
  }
  return NextResponse.json(
    { tours: data ?? [] },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}

// POST /api/admin/tours — create a tour
export async function POST(request: NextRequest) {
  const gate = await requireAdmin();
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const body = await request.json().catch(() => ({}));
  const fields = pickFields(body);

  if (!fields.title) {
    return NextResponse.json({ error: "Укажите название тура" }, { status: 400 });
  }
  if (!fields.auction_start_at || !fields.auction_end_at) {
    return NextResponse.json(
      { error: "Укажите время начала и окончания аукциона" },
      { status: 400 }
    );
  }

  const admin = adminClient();
  const { data, error } = await admin
    .from("mushroom_tours")
    .insert({ ...fields, created_by: gate.user!.id })
    .select("*")
    .single();

  if (error) {
    console.error("Admin tour create error:", error);
    return NextResponse.json({ error: "Не удалось создать тур" }, { status: 500 });
  }
  return NextResponse.json({ tour: data });
}

// PATCH /api/admin/tours — update a tour { id, ...fields }
export async function PATCH(request: NextRequest) {
  const gate = await requireAdmin();
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const body = await request.json().catch(() => ({}));
  const id = body.id as string | undefined;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const fields = pickFields(body);
  fields.updated_at = new Date().toISOString();

  const admin = adminClient();
  const { data, error } = await admin
    .from("mushroom_tours")
    .update(fields)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("Admin tour update error:", error);
    return NextResponse.json({ error: "Не удалось обновить тур" }, { status: 500 });
  }
  return NextResponse.json({ tour: data });
}

// DELETE /api/admin/tours?id=... — delete a tour
export async function DELETE(request: NextRequest) {
  const gate = await requireAdmin();
  if (gate.error) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const admin = adminClient();
  const { error } = await admin.from("mushroom_tours").delete().eq("id", id);
  if (error) {
    console.error("Admin tour delete error:", error);
    return NextResponse.json({ error: "Не удалось удалить тур" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
