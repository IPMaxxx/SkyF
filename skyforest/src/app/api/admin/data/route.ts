import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServerClient } from "@supabase/ssr";
import type { PostgrestError } from "@supabase/supabase-js";

/** Without patch-v26 payment columns — used as fallback if DB not migrated yet */
const TOKEN_TX_SELECT_LEGACY =
  "id, user_id, amount, type, description, payment_id, balance_after, created_at, profile:profiles!user_id(full_name, email)";

const TOKEN_TX_SEARCH_LEGACY = ["description", "payment_id"] as const;

function isMissingPaymentColumnsError(error: PostgrestError | null): boolean {
  const m = (error?.message ?? "").toLowerCase();
  return (
    m.includes("payment_amount_cents") ||
    m.includes("payment_currency") ||
    m.includes("payment_tracking_id") ||
    (m.includes("schema cache") && m.includes("column"))
  );
}

const ALLOWED_TABLES: Record<
  string,
  { select: string; searchColumns?: string[]; defaultSort?: string }
> = {
  profiles: {
    select:
      "id, email, full_name, phone, account_type, created_at, updated_at, token_balance:token_balances(balance, bonus_balance, total_purchased, total_spent, total_earned)",
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
      "id, seller_id, best_day_id, price, season, status, buyer_id, sold_at, created_at, best_day:best_days!marketplace_listings_best_day_id_fkey(name, best_date)",
    defaultSort: "created_at",
  },
  marketplace_messages: {
    select: "id, listing_id, sender_id, message, created_at",
    searchColumns: ["message"],
    defaultSort: "created_at",
  },
  token_transactions: {
    select:
      "id, user_id, amount, type, description, payment_id, balance_after, payment_amount_cents, payment_currency, payment_tracking_id, created_at, profile:profiles!user_id(full_name, email)",
    searchColumns: ["description", "payment_id", "payment_tracking_id"],
    defaultSort: "created_at",
  },
  token_payments: {
    select:
      "id, user_id, amount, type, description, payment_id, balance_after, payment_amount_cents, payment_currency, payment_tracking_id, created_at, profile:profiles!user_id(full_name, email)",
    searchColumns: ["description", "payment_id", "payment_tracking_id"],
    defaultSort: "created_at",
  },
  token_balances: {
    select:
      "user_id, balance, bonus_balance, total_purchased, total_spent, total_earned, updated_at, profile:profiles!user_id(full_name, email)",
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
  deleted_locations: {
    select:
      "id, original_id, user_id, name, lat, lng, forest_info, original_created_at, deleted_at, deleted_by_user_id",
    searchColumns: ["name"],
    defaultSort: "deleted_at",
  },
  deleted_best_days: {
    select:
      "id, original_id, user_id, name, best_date, photos, location_name, location_lat, location_lng, mushroom_latin_name, mushroom_common_name, mushroom_image_url, original_created_at, deleted_at, deleted_by_user_id",
    searchColumns: ["name", "location_name"],
    defaultSort: "deleted_at",
  },
  admin_marks: {
    select:
      "id, admin_id, target_type, target_id, status, note, created_at, updated_at",
    searchColumns: ["note"],
    defaultSort: "updated_at",
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

  const ALLOWED_TABLE_KEYS = [...Object.keys(ALLOWED_TABLES), "active_users"];

  if (!table || !ALLOWED_TABLE_KEYS.includes(table)) {
    return NextResponse.json(
      { error: "Invalid table", allowed: ALLOWED_TABLE_KEYS },
      { status: 400 }
    );
  }

  const admin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  if (table === "active_users") {
    const [profilesRes, balancesRes, locsRes, bdsRes, acsRes, txRes] =
      await Promise.all([
        admin.from("profiles").select("id, email, full_name, created_at"),
        admin.from("token_balances").select("user_id, balance, bonus_balance, total_purchased, total_spent, total_earned, updated_at"),
        admin.from("locations").select("user_id"),
        admin.from("best_days").select("user_id"),
        admin.from("auto_compares").select("user_id"),
        admin.from("token_transactions").select("user_id, created_at").order("created_at", { ascending: false }),
      ]);

    const balanceMap = new Map(
      (balancesRes.data || []).map((b: Record<string, unknown>) => [b.user_id as string, b])
    );

    const buildCountMap = (rows: { user_id: string }[] | null) => {
      const m = new Map<string, number>();
      for (const r of rows || []) m.set(r.user_id, (m.get(r.user_id) || 0) + 1);
      return m;
    };

    const locMap = buildCountMap(locsRes.data);
    const bdMap = buildCountMap(bdsRes.data);
    const acMap = buildCountMap(acsRes.data);

    const lastActivityMap = new Map<string, string>();
    const txCountMap = new Map<string, number>();
    for (const r of (txRes.data || []) as { user_id: string; created_at: string }[]) {
      txCountMap.set(r.user_id, (txCountMap.get(r.user_id) || 0) + 1);
      if (!lastActivityMap.has(r.user_id)) lastActivityMap.set(r.user_id, r.created_at);
    }

    let users = (profilesRes.data || []).map((p: Record<string, unknown>) => {
      const uid = p.id as string;
      const b = balanceMap.get(uid) as Record<string, unknown> | undefined;
      return {
        id: uid,
        email: p.email,
        full_name: p.full_name,
        created_at: p.created_at,
        balance: (b?.balance as number) ?? 0,
        bonus_balance: (b?.bonus_balance as number) ?? 0,
        total_purchased: (b?.total_purchased as number) ?? 0,
        total_spent: (b?.total_spent as number) ?? 0,
        locations_count: locMap.get(uid) || 0,
        best_days_count: bdMap.get(uid) || 0,
        compares_count: acMap.get(uid) || 0,
        transactions_count: txCountMap.get(uid) || 0,
        last_active_at: lastActivityMap.get(uid) || (b?.updated_at as string) || null,
      };
    });

    users.sort((a, b) => {
      if (!a.last_active_at && !b.last_active_at) return 0;
      if (!a.last_active_at) return 1;
      if (!b.last_active_at) return -1;
      return new Date(b.last_active_at).getTime() - new Date(a.last_active_at).getTime();
    });

    if (search) {
      const q = search.toLowerCase();
      users = users.filter(
        (u) =>
          (u.email as string | null)?.toLowerCase().includes(q) ||
          (u.full_name as string | null)?.toLowerCase().includes(q)
      );
    }

    const total = users.length;
    const paginated = users.slice(from, to + 1);

    return NextResponse.json(
      { data: paginated, total, page, limit, total_pages: Math.ceil(total / limit) },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  }

  const physicalTable =
    table === "token_payments" ? "token_transactions" : table!;
  const config =
    table === "token_payments"
      ? ALLOWED_TABLES.token_payments
      : ALLOWED_TABLES[table!];

  const buildTableQuery = (selectStr: string, searchCols: string[] | undefined) => {
    let q = admin.from(physicalTable).select(selectStr, { count: "exact" });
    if (table === "token_payments") {
      q = q.eq("type", "purchase").filter("payment_id", "not.is", null);
    }
    if (filterColumn && filterValue) {
      q = q.eq(filterColumn, filterValue);
    }
    if (search && searchCols && searchCols.length > 0) {
      const orFilter = searchCols
        .map((col) => `${col}.ilike.%${search}%`)
        .join(",");
      q = q.or(orFilter);
    }
    const sortColumn = sortBy || config.defaultSort || "created_at";
    q = q.order(sortColumn, { ascending: sortDir });
    q = q.range(from, to);
    return q;
  };

  let { data, count, error } = await buildTableQuery(
    config.select,
    config.searchColumns
  );

  if (
    error &&
    isMissingPaymentColumnsError(error) &&
    (table === "token_transactions" || table === "token_payments")
  ) {
    ({ data, count, error } = await buildTableQuery(
      TOKEN_TX_SELECT_LEGACY,
      [...TOKEN_TX_SEARCH_LEGACY]
    ));
  }

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
    deleted_locations: ["user_id"],
    deleted_best_days: ["user_id"],
  };

  const fieldsToEnrich = ENRICH_USER_FIELDS[table!];
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
