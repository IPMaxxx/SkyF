import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface PurgeBody {
  user_id?: string | null;
  email?: string | null;
  confirm_email: string;
  also_clear_deleted_archive?: boolean;
}

interface PurgeReport {
  ok: boolean;
  user_id: string | null;
  email: string | null;
  steps: Array<{
    step: string;
    affected: number | null;
    error?: string;
  }>;
  auth_deleted: boolean;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user: caller },
  } = await supabase.auth.getUser();

  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", caller.id)
    .single();

  if (callerProfile?.account_type !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: PurgeBody;
  try {
    body = (await request.json()) as PurgeBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const confirmEmail = (body.confirm_email || "").trim().toLowerCase();
  if (!confirmEmail || !confirmEmail.includes("@")) {
    return NextResponse.json(
      { error: "confirm_email is required" },
      { status: 400 }
    );
  }

  const admin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  // Resolve target user. Prefer explicit user_id; otherwise look up by email.
  let targetUserId: string | null = body.user_id?.trim() || null;
  let targetEmail: string | null = null;

  if (targetUserId) {
    const { data: u, error: getErr } = await admin.auth.admin.getUserById(
      targetUserId
    );
    if (getErr) {
      return NextResponse.json(
        { error: "auth.getUserById failed", details: getErr.message },
        { status: 500 }
      );
    }
    targetEmail = (u.user?.email || "").toLowerCase() || null;
  } else {
    // Find by email via paginated listUsers
    for (let page = 1; page <= 5; page++) {
      const { data: list, error: listErr } = await admin.auth.admin.listUsers({
        page,
        perPage: 1000,
      });
      if (listErr) {
        return NextResponse.json(
          { error: "auth.listUsers failed", details: listErr.message },
          { status: 500 }
        );
      }
      const found = list.users.find(
        (u) => (u.email || "").toLowerCase() === confirmEmail
      );
      if (found) {
        targetUserId = found.id;
        targetEmail = (found.email || "").toLowerCase() || null;
        break;
      }
      if (list.users.length < 1000) break;
    }
  }

  // Fallback: maybe the auth user is gone but a profile remains
  if (!targetUserId) {
    const { data: pByEmail } = await admin
      .from("profiles")
      .select("id, email")
      .ilike("email", confirmEmail)
      .maybeSingle();
    if (pByEmail) {
      targetUserId = pByEmail.id as string;
      targetEmail = ((pByEmail.email as string) || "").toLowerCase() || null;
    }
  }

  if (!targetUserId) {
    // No auth row, no profile — but maybe only an archive entry exists
    if (body.also_clear_deleted_archive) {
      const { error: delErr, count } = await admin
        .from("deleted_accounts")
        .delete({ count: "exact" })
        .ilike("email", confirmEmail);
      if (delErr) {
        return NextResponse.json(
          { error: "Failed clearing deleted_accounts", details: delErr.message },
          { status: 500 }
        );
      }
      return NextResponse.json({
        ok: true,
        user_id: null,
        email: confirmEmail,
        steps: [
          { step: "deleted_accounts(by email)", affected: count ?? 0 },
        ],
        auth_deleted: false,
      } satisfies PurgeReport);
    }
    return NextResponse.json(
      {
        error:
          "User not found in auth.users or profiles. Pass also_clear_deleted_archive=true to wipe deleted_accounts archive.",
      },
      { status: 404 }
    );
  }

  // Refuse to purge yourself
  if (targetUserId === caller.id) {
    return NextResponse.json(
      { error: "Refusing to purge the calling admin account" },
      { status: 400 }
    );
  }

  // Email confirmation must match what we resolved
  if (targetEmail && targetEmail !== confirmEmail) {
    return NextResponse.json(
      {
        error: "confirm_email does not match target user email",
        target_email: targetEmail,
      },
      { status: 400 }
    );
  }

  const steps: PurgeReport["steps"] = [];

  // Helper: delete by simple eq filter and capture count.
  const wipe = async (
    table: string,
    column: string,
    value: string,
    label?: string,
  ) => {
    const { error, count } = await admin
      .from(table)
      .delete({ count: "exact" })
      .eq(column, value);
    steps.push({
      step: label ?? `${table}.${column}`,
      affected: error ? null : count ?? 0,
      error: error?.message,
    });
  };

  // 1. Tables WITHOUT FK CASCADE to profiles must be purged manually first.
  await wipe("deleted_locations", "user_id", targetUserId);
  await wipe(
    "deleted_locations",
    "deleted_by_user_id",
    targetUserId,
    "deleted_locations.deleted_by_user_id"
  );
  await wipe("deleted_best_days", "user_id", targetUserId);
  await wipe(
    "deleted_best_days",
    "deleted_by_user_id",
    targetUserId,
    "deleted_best_days.deleted_by_user_id"
  );

  // 2. marketplace_messages may exist without ON DELETE CASCADE in older
  //    migrations — wipe sender/recipient explicitly to be safe.
  await wipe("marketplace_messages", "sender_id", targetUserId);
  // recipient_id column is optional depending on patch version; ignore errors
  {
    const { error, count } = await admin
      .from("marketplace_messages")
      .delete({ count: "exact" })
      .eq("recipient_id", targetUserId);
    steps.push({
      step: "marketplace_messages.recipient_id",
      affected: error ? null : count ?? 0,
      error:
        error && !/column .*recipient_id/.test(error.message)
          ? error.message
          : undefined,
    });
  }

  // 3. admin_marks where this user authored the mark
  await wipe("admin_marks", "admin_id", targetUserId);

  // 4. deleted_accounts archive entries that point at this user
  await wipe(
    "deleted_accounts",
    "original_user_id",
    targetUserId,
    "deleted_accounts.original_user_id"
  );
  if (targetEmail) {
    const { error, count } = await admin
      .from("deleted_accounts")
      .delete({ count: "exact" })
      .ilike("email", targetEmail);
    steps.push({
      step: "deleted_accounts(by email)",
      affected: error ? null : count ?? 0,
      error: error?.message,
    });
  }

  // 5. Best-effort wipes for the main owned tables. Most of these will already
  //    be removed by ON DELETE CASCADE when we drop the auth user, but doing it
  //    here makes the result deterministic and the report informative.
  for (const table of [
    "auto_compares",
    "forest_search_history",
    "referral_codes",
    "marketplace_listings",
    "best_days",
    "locations",
    "token_transactions",
    "search_requests",
    "subscriptions",
  ]) {
    await wipe(table, "user_id", targetUserId);
  }
  // marketplace_listings also has buyer_id (cancel buyer link without deleting other sellers' listings)
  {
    const { error } = await admin
      .from("marketplace_listings")
      .update({ buyer_id: null })
      .eq("buyer_id", targetUserId);
    steps.push({
      step: "marketplace_listings.buyer_id → null",
      affected: error ? null : 0,
      error: error?.message,
    });
  }
  await wipe("token_balances", "user_id", targetUserId);

  // 6. Finally, drop the auth user. profiles row is removed by FK CASCADE.
  let authDeleted = false;
  const { error: delAuthErr } = await admin.auth.admin.deleteUser(targetUserId);
  if (delAuthErr) {
    steps.push({
      step: "auth.admin.deleteUser",
      affected: null,
      error: delAuthErr.message,
    });
  } else {
    authDeleted = true;
    steps.push({ step: "auth.admin.deleteUser", affected: 1 });
  }

  // 7. profiles fallback: if auth.deleteUser failed (or there was no auth row),
  //    we still want the profile gone.
  if (!authDeleted) {
    const { error, count } = await admin
      .from("profiles")
      .delete({ count: "exact" })
      .eq("id", targetUserId);
    steps.push({
      step: "profiles(direct)",
      affected: error ? null : count ?? 0,
      error: error?.message,
    });
  }

  return NextResponse.json(
    {
      ok: true,
      user_id: targetUserId,
      email: targetEmail,
      auth_deleted: authDeleted,
      steps,
    } satisfies PurgeReport,
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
