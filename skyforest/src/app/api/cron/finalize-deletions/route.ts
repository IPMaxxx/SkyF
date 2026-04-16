import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || cronSecret.length < 16) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  const { data: pending, error: listError } = await admin.rpc(
    "list_pending_deletions"
  );

  if (listError || !pending) {
    return NextResponse.json(
      { error: listError?.message || "Failed to list" },
      { status: 500 }
    );
  }

  let deleted = 0;
  let failed = 0;

  for (const row of pending as Array<{ user_id: string; email: string | null }>) {
    try {
      const { error: insertError } = await admin
        .from("deleted_accounts")
        .insert({
          original_user_id: row.user_id,
          email: (row.email || "").toLowerCase(),
        });
      if (insertError) {
        console.error("deleted_accounts insert failed:", insertError);
      }

      const { error: delError } = await admin.auth.admin.deleteUser(row.user_id);
      if (delError) {
        failed++;
        console.error("Auth deleteUser failed:", delError);
        continue;
      }
      deleted++;
    } catch (err) {
      failed++;
      console.error("finalize-deletions error:", err);
    }
  }

  return NextResponse.json({
    deleted,
    failed,
    total: pending.length,
  });
}
