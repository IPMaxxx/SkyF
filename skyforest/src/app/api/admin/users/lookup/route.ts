import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

interface AuthUserRow {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  banned_until: string | null;
  raw_user_meta_data?: Record<string, unknown> | null;
}

export async function GET(request: NextRequest) {
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

  const { searchParams } = new URL(request.url);
  const rawEmail = (searchParams.get("email") || "").trim().toLowerCase();

  if (!rawEmail || !rawEmail.includes("@")) {
    return NextResponse.json(
      { error: "Provide ?email=<address>" },
      { status: 400 }
    );
  }

  const admin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  // 1. auth.users via admin API (paginated; small instances are fine, but we
  //    cap to 5 pages × 1000 to avoid runaway loops on huge tenants).
  let authUser: AuthUserRow | null = null;
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
      (u) => (u.email || "").toLowerCase() === rawEmail
    );
    if (found) {
      authUser = {
        id: found.id,
        email: found.email ?? null,
        created_at: found.created_at,
        last_sign_in_at: found.last_sign_in_at ?? null,
        email_confirmed_at: found.email_confirmed_at ?? null,
        banned_until:
          (found as unknown as { banned_until?: string | null }).banned_until ??
          null,
        raw_user_meta_data: found.user_metadata ?? null,
      };
      break;
    }
    if (list.users.length < 1000) break;
  }

  // 2. profiles by email (covers case where auth row is gone but profile lingers)
  const { data: profilesByEmail } = await admin
    .from("profiles")
    .select(
      "id, email, full_name, phone, account_type, created_at, updated_at, deletion_scheduled_at, deletion_effective_at"
    )
    .ilike("email", rawEmail);

  // 3. profile by auth id (more reliable when found)
  let profileRow: Record<string, unknown> | null =
    profilesByEmail && profilesByEmail.length > 0 ? profilesByEmail[0] : null;
  if (authUser) {
    const { data: pById } = await admin
      .from("profiles")
      .select(
        "id, email, full_name, phone, account_type, created_at, updated_at, deletion_scheduled_at, deletion_effective_at"
      )
      .eq("id", authUser.id)
      .maybeSingle();
    if (pById) profileRow = pById;
  }

  const targetUserId =
    (authUser?.id as string | undefined) ??
    ((profileRow?.id as string | undefined) ?? null);

  // 4. deleted_accounts archive
  const { data: deletedAccounts } = await admin
    .from("deleted_accounts")
    .select("id, original_user_id, email, deleted_at")
    .ilike("email", rawEmail)
    .order("deleted_at", { ascending: false });

  // 5. token_balance (single)
  let tokenBalance: Record<string, unknown> | null = null;
  if (targetUserId) {
    const { data: tb } = await admin
      .from("token_balances")
      .select(
        "user_id, balance, bonus_balance, total_purchased, total_spent, total_earned, updated_at"
      )
      .eq("user_id", targetUserId)
      .maybeSingle();
    tokenBalance = tb ?? null;
  }

  // 6. counts of related rows (parallel, count-only queries)
  const counts: Record<string, number> = {
    locations: 0,
    best_days: 0,
    marketplace_listings: 0,
    marketplace_listings_as_buyer: 0,
    marketplace_messages_sent: 0,
    token_transactions: 0,
    referral_codes: 0,
    auto_compares: 0,
    forest_search_history: 0,
    deleted_locations: 0,
    deleted_best_days: 0,
    admin_marks_authored: 0,
  };

  if (targetUserId) {
    const countQ = async (
      table: string,
      column: string,
      value: string,
    ): Promise<number> => {
      const { count, error } = await admin
        .from(table)
        .select("*", { count: "exact", head: true })
        .eq(column, value);
      if (error) return 0;
      return count ?? 0;
    };

    const results = await Promise.all([
      countQ("locations", "user_id", targetUserId),
      countQ("best_days", "user_id", targetUserId),
      countQ("marketplace_listings", "seller_id", targetUserId),
      countQ("marketplace_listings", "buyer_id", targetUserId),
      countQ("marketplace_messages", "sender_id", targetUserId),
      countQ("token_transactions", "user_id", targetUserId),
      countQ("referral_codes", "user_id", targetUserId),
      countQ("auto_compares", "user_id", targetUserId),
      countQ("forest_search_history", "user_id", targetUserId),
      countQ("deleted_locations", "user_id", targetUserId),
      countQ("deleted_best_days", "user_id", targetUserId),
      countQ("admin_marks", "admin_id", targetUserId),
    ]);

    counts.locations = results[0];
    counts.best_days = results[1];
    counts.marketplace_listings = results[2];
    counts.marketplace_listings_as_buyer = results[3];
    counts.marketplace_messages_sent = results[4];
    counts.token_transactions = results[5];
    counts.referral_codes = results[6];
    counts.auto_compares = results[7];
    counts.forest_search_history = results[8];
    counts.deleted_locations = results[9];
    counts.deleted_best_days = results[10];
    counts.admin_marks_authored = results[11];
  }

  // 7. derive a high-level status
  let status:
    | "active"
    | "scheduled_deletion"
    | "auth_only"
    | "profile_only"
    | "in_archive"
    | "not_found" = "not_found";

  if (authUser && profileRow) {
    if (profileRow.deletion_scheduled_at) {
      status = "scheduled_deletion";
    } else {
      status = "active";
    }
  } else if (authUser && !profileRow) {
    status = "auth_only";
  } else if (!authUser && profileRow) {
    status = "profile_only";
  } else if (!authUser && !profileRow && (deletedAccounts?.length ?? 0) > 0) {
    status = "in_archive";
  }

  return NextResponse.json(
    {
      email: rawEmail,
      status,
      auth_user: authUser,
      profile: profileRow,
      token_balance: tokenBalance,
      deleted_accounts: deletedAccounts ?? [],
      counts,
      target_user_id: targetUserId,
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
