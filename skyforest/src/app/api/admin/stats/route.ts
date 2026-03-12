import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServerClient } from "@supabase/ssr";

export async function GET() {
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

  const admin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  const [
    profilesRes,
    locationsRes,
    bestDaysRes,
    listingsActiveRes,
    listingsSoldRes,
    listingsCancelledRes,
    transactionsRes,
    referralCodesRes,
    forestSearchRes,
    autoComparesRes,
    messagesRes,
    deletedLocationsRes,
    deletedBestDaysRes,
    adminMarksRes,
  ] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("locations").select("id", { count: "exact", head: true }),
    admin.from("best_days").select("id", { count: "exact", head: true }),
    admin
      .from("marketplace_listings")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    admin
      .from("marketplace_listings")
      .select("id", { count: "exact", head: true })
      .eq("status", "sold"),
    admin
      .from("marketplace_listings")
      .select("id", { count: "exact", head: true })
      .eq("status", "cancelled"),
    admin
      .from("token_transactions")
      .select("id", { count: "exact", head: true }),
    admin.from("referral_codes").select("id", { count: "exact", head: true }),
    admin
      .from("forest_search_history")
      .select("id", { count: "exact", head: true }),
    admin.from("auto_compares").select("id", { count: "exact", head: true }),
    admin
      .from("marketplace_messages")
      .select("id", { count: "exact", head: true }),
    admin.from("deleted_locations").select("id", { count: "exact", head: true }),
    admin.from("deleted_best_days").select("id", { count: "exact", head: true }),
    admin.from("admin_marks").select("id", { count: "exact", head: true }),
  ]);

  const { data: tokenAgg } = await admin.from("token_balances").select("balance, total_purchased, total_spent, total_earned");

  let totalBalance = 0;
  let totalPurchased = 0;
  let totalSpent = 0;
  let totalEarned = 0;
  if (tokenAgg) {
    for (const t of tokenAgg) {
      totalBalance += t.balance ?? 0;
      totalPurchased += t.total_purchased ?? 0;
      totalSpent += t.total_spent ?? 0;
      totalEarned += t.total_earned ?? 0;
    }
  }

  const { data: recentUsers } = await admin
    .from("profiles")
    .select("id, email, full_name, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: recentTransactions } = await admin
    .from("token_transactions")
    .select("id, user_id, amount, type, description, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  return NextResponse.json(
    {
      counts: {
        profiles: profilesRes.count ?? 0,
        locations: locationsRes.count ?? 0,
        best_days: bestDaysRes.count ?? 0,
        listings_active: listingsActiveRes.count ?? 0,
        listings_sold: listingsSoldRes.count ?? 0,
        listings_cancelled: listingsCancelledRes.count ?? 0,
        token_transactions: transactionsRes.count ?? 0,
        referral_codes: referralCodesRes.count ?? 0,
        forest_searches: forestSearchRes.count ?? 0,
        auto_compares: autoComparesRes.count ?? 0,
        marketplace_messages: messagesRes.count ?? 0,
        deleted_locations: deletedLocationsRes.count ?? 0,
        deleted_best_days: deletedBestDaysRes.count ?? 0,
        admin_marks: adminMarksRes.count ?? 0,
      },
      tokens: {
        total_balance: totalBalance,
        total_purchased: totalPurchased,
        total_spent: totalSpent,
        total_earned: totalEarned,
      },
      recent_users: recentUsers ?? [],
      recent_transactions: recentTransactions ?? [],
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
