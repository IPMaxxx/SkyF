import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServerClient } from "@supabase/ssr";

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
  const userFilter = searchParams.get("user_id");

  const admin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  );

  let locQuery = admin
    .from("locations")
    .select("id, user_id, name, lat, lng, forest_info, created_at, profile:profiles!user_id(full_name, email)");
  if (userFilter) locQuery = locQuery.eq("user_id", userFilter);

  let bdQuery = admin
    .from("best_days")
    .select("id, user_id, location_id, name, best_date, photos, mushroom_id, created_at, location:locations(name, lat, lng), mushroom:mushroom_species(latin_name, common_name, image_url), profile:profiles!user_id(full_name, email)");
  if (userFilter) bdQuery = bdQuery.eq("user_id", userFilter);

  let delLocQuery = admin
    .from("deleted_locations")
    .select("*")
    .order("deleted_at", { ascending: false });
  if (userFilter) delLocQuery = delLocQuery.eq("user_id", userFilter);

  let delBdQuery = admin
    .from("deleted_best_days")
    .select("*")
    .order("deleted_at", { ascending: false });
  if (userFilter) delBdQuery = delBdQuery.eq("user_id", userFilter);

  const [locRes, bdRes, delLocRes, delBdRes] = await Promise.all([
    locQuery,
    bdQuery,
    delLocQuery,
    delBdQuery,
  ]);

  const profileIds = new Set<string>();
  for (const r of delLocRes.data || []) profileIds.add(r.user_id);
  for (const r of delBdRes.data || []) profileIds.add(r.user_id);

  let deletedProfiles: Record<string, { full_name: string | null; email: string | null }> = {};
  if (profileIds.size > 0) {
    const { data: profs } = await admin
      .from("profiles")
      .select("id, full_name, email")
      .in("id", [...profileIds]);
    if (profs) {
      for (const p of profs) {
        deletedProfiles[p.id as string] = { full_name: p.full_name, email: p.email };
      }
    }
  }

  const allUsers = new Set<string>();
  for (const r of locRes.data || []) allUsers.add(r.user_id);
  for (const r of bdRes.data || []) allUsers.add(r.user_id);
  for (const r of delLocRes.data || []) allUsers.add(r.user_id);
  for (const r of delBdRes.data || []) allUsers.add(r.user_id);

  let usersList: { id: string; full_name: string | null; email: string | null }[] = [];
  if (allUsers.size > 0) {
    const { data: ul } = await admin
      .from("profiles")
      .select("id, full_name, email")
      .in("id", [...allUsers])
      .order("full_name");
    usersList = (ul || []) as typeof usersList;
  }

  return NextResponse.json(
    {
      locations: locRes.data ?? [],
      best_days: bdRes.data ?? [],
      deleted_locations: (delLocRes.data ?? []).map((r: Record<string, unknown>) => ({
        ...r,
        profile: deletedProfiles[r.user_id as string] ?? null,
      })),
      deleted_best_days: (delBdRes.data ?? []).map((r: Record<string, unknown>) => ({
        ...r,
        profile: deletedProfiles[r.user_id as string] ?? null,
      })),
      users: usersList,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
