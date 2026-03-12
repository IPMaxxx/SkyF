import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServerClient } from "@supabase/ssr";

const VALID_STATUSES = ["interesting", "priority", "secondary", "reviewed", "suspicious"];
const VALID_TYPES = ["location", "best_day", "deleted_location", "deleted_best_day"];

function makeAdmin() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  );
}

async function checkAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", user.id)
    .single();
  if (profile?.account_type !== "admin") return null;
  return user;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const user = await checkAdmin(supabase);
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const targetType = searchParams.get("target_type");
  const targetIds = searchParams.get("target_ids");

  const admin = makeAdmin();

  let query = admin.from("admin_marks").select("*");

  if (targetType) {
    query = query.eq("target_type", targetType);
  }
  if (targetIds) {
    const ids = targetIds.split(",").filter(Boolean);
    if (ids.length > 0) {
      query = query.in("target_id", ids);
    }
  }

  query = query.order("updated_at", { ascending: false });

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ marks: data ?? [] }, {
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const user = await checkAdmin(supabase);
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { target_type, target_id, status, note } = body as {
    target_type: string;
    target_id: string;
    status: string;
    note?: string;
  };

  if (!VALID_TYPES.includes(target_type)) {
    return NextResponse.json({ error: "Invalid target_type" }, { status: 400 });
  }
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  if (!target_id) {
    return NextResponse.json({ error: "Missing target_id" }, { status: 400 });
  }

  const admin = makeAdmin();

  const { data: existing } = await admin
    .from("admin_marks")
    .select("id")
    .eq("admin_id", user.id)
    .eq("target_type", target_type)
    .eq("target_id", target_id)
    .maybeSingle();

  if (existing) {
    const { error } = await admin
      .from("admin_marks")
      .update({ status, note: note ?? null, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, action: "updated" });
  }

  const { error } = await admin.from("admin_marks").insert({
    admin_id: user.id,
    target_type,
    target_id,
    status,
    note: note ?? null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, action: "created" });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const user = await checkAdmin(supabase);
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const target_type = searchParams.get("target_type");
  const target_id = searchParams.get("target_id");

  if (!target_type || !target_id) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const admin = makeAdmin();
  await admin
    .from("admin_marks")
    .delete()
    .eq("admin_id", user.id)
    .eq("target_type", target_type)
    .eq("target_id", target_id);

  return NextResponse.json({ ok: true });
}
