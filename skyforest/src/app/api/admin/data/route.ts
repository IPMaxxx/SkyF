import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServerClient } from "@supabase/ssr";

const ALLOWED_TABLES: Record<
  string,
  { select: string; searchColumns?: string[]; defaultSort?: string }
> = {
  profiles: {
    select:
      "id, email, full_name, phone, account_type, created_at, updated_at, token_balance:token_balances(balance, total_purchased, total_spent, total_earned)",
    searchColumns: ["email", "full_name", "phone"],
    defaultSort: "created_at",
  },
  locations: {
    select:
      "id, user_id, name, lat, lng, created_at, profile:profiles!user_id(full_name, email)",
    searchColumns: ["name"],
    defaultSort: "created_at",
  },
  best_days: {
    select:
      "id, user_id, location_id, mushroom_id, name, best_date, photos, purchased_from_listing_id, created_at, profile:profiles!user_id(full_name, email), location:locations(name, lat, lng), mushroom:mushroom_species(latin_name, common_name, image_url)",
    searchColumns: ["name"],
    defaultSort: "created_at",
  },
  marketplace_listings: {
    select:
      "id, seller_id, best_day_id, price, season, status, buyer_id, sold_at, created_at, best_day:best_days(name, best_date)",
    defaultSort: "created_at",
  },
  marketplace_messages: {
    select: "id, listing_id, sender_id, message, created_at",
    searchColumns: ["message"],
    defaultSort: "created_at",
  },
  token_transactions: {
    select:
      "id, user_id, amount, type, description, payment_id, balance_after, created_at, profile:profiles!user_id(full_name, email)",
    searchColumns: ["description", "payment_id"],
    defaultSort: "created_at",
  },
  token_balances: {
    select:
      "user_id, balance, total_purchased, total_spent, total_earned, updated_at, profile:profiles!user_id(full_name, email)",
    defaultSort: "updated_at",
  },
  referral_codes: {
    select: "id, user_id, code, uses_count, created_at",
    searchColumns: ["code"],
    defaultSort: "created_at",
  },
  auto_compares: {
    select:
      "id, user_id, name, enabled, run_time, last_run_at, last_score, created_at, profile:profiles!user_id(full_name, email)",
    searchColumns: ["name"],
    defaultSort: "created_at",
  },
  forest_search_history: {
    select:
      "id, user_id, ref_lat, ref_lng, search_lat, search_lng, radius_km, token_cost, created_at, profile:profiles!user_id(full_name, email)",
    defaultSort: "created_at",
  },
};

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
  const table = searchParams.get("table");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "25"), 100);
  const sortBy = searchParams.get("sort_by");
  const sortDir = searchParams.get("sort_dir") === "asc" ? true : false;
  const search = searchParams.get("search") || "";
  const filterColumn = searchParams.get("filter_column");
  const filterValue = searchParams.get("filter_value");

  if (!table || !ALLOWED_TABLES[table]) {
    return NextResponse.json(
      { error: "Invalid table", allowed: Object.keys(ALLOWED_TABLES) },
      { status: 400 }
    );
  }

  const config = ALLOWED_TABLES[table];
  const admin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = admin
    .from(table)
    .select(config.select, { count: "exact" });

  if (filterColumn && filterValue) {
    query = query.eq(filterColumn, filterValue);
  }

  if (search && config.searchColumns && config.searchColumns.length > 0) {
    const orFilter = config.searchColumns
      .map((col) => `${col}.ilike.%${search}%`)
      .join(",");
    query = query.or(orFilter);
  }

  const sortColumn = sortBy || config.defaultSort || "created_at";
  query = query.order(sortColumn, { ascending: sortDir });
  query = query.range(from, to);

  const { data, count, error } = await query;

  if (error) {
    console.error(`Admin data error [${table}]:`, error);
    return NextResponse.json(
      { error: "Query error", details: error.message },
      { status: 500 }
    );
  }

  let enriched: Record<string, unknown>[] = (data ?? []).map(
    (row) => ({ ...(row as unknown as Record<string, unknown>) })
  );

  const ENRICH_USER_FIELDS: Record<string, string[]> = {
    referral_codes: ["user_id"],
    marketplace_messages: ["sender_id"],
    marketplace_listings: ["seller_id"],
  };

  const fieldsToEnrich = ENRICH_USER_FIELDS[table];
  if (fieldsToEnrich && enriched.length > 0) {
    const allIds = new Set<string>();
    for (const r of enriched) {
      for (const field of fieldsToEnrich) {
        if (r[field]) allIds.add(r[field] as string);
      }
    }
    if (allIds.size > 0) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, full_name, email")
        .in("id", [...allIds]);
      const profileMap = new Map(
        (profiles ?? []).map((p: Record<string, unknown>) => [p.id, p])
      );
      enriched = enriched.map((r) => {
        const copy = { ...r };
        for (const field of fieldsToEnrich) {
          const profileKey = field.replace("_id", "").replace("user", "profile");
          const resolvedKey = field === "user_id" ? "profile" : profileKey;
          copy[resolvedKey] = profileMap.get(r[field] as string) ?? null;
        }
        return copy;
      });
    }
  }

  return NextResponse.json(
    {
      data: enriched,
      total: count ?? 0,
      page,
      limit,
      total_pages: Math.ceil((count ?? 0) / limit),
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
