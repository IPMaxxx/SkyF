import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServerClient } from "@supabase/ssr";

const EDITABLE_COLUMNS: Record<string, string[]> = {
  profiles: ["full_name", "phone", "account_type"],
  locations: ["name"],
  best_days: ["name", "best_date"],
  marketplace_listings: ["price", "status"],
  token_balances: ["balance", "total_purchased", "total_spent", "total_earned"],
  auto_compares: ["enabled", "name"],
};

const PK_COLUMN: Record<string, string> = {
  profiles: "id",
  locations: "id",
  best_days: "id",
  marketplace_listings: "id",
  token_balances: "user_id",
  auto_compares: "id",
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", user.id)
    .single();

  if (profile?.account_type !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { table, id, updates } = body as {
    table: string;
    id: string;
    updates: Record<string, unknown>;
  };

  if (!table || !EDITABLE_COLUMNS[table]) {
    return NextResponse.json(
      {
        error: "Table not editable",
        allowed: Object.keys(EDITABLE_COLUMNS),
      },
      { status: 400 }
    );
  }

  if (!id || !updates || typeof updates !== "object") {
    return NextResponse.json(
      { error: "Missing id or updates" },
      { status: 400 }
    );
  }

  const allowedCols = EDITABLE_COLUMNS[table];
  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (allowedCols.includes(key)) {
      filtered[key] = value;
    }
  }

  if (Object.keys(filtered).length === 0) {
    return NextResponse.json(
      { error: "No valid columns to update", allowed: allowedCols },
      { status: 400 }
    );
  }

  const admin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  const pk = PK_COLUMN[table] || "id";
  const { data, error } = await admin
    .from(table)
    .update(filtered)
    .eq(pk, id)
    .select()
    .single();

  if (error) {
    console.error(`Admin update error [${table}]:`, error);
    return NextResponse.json(
      { error: "Update failed", details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data });
}
