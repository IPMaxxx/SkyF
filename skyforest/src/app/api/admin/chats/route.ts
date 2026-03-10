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

  const admin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") || "threads";
  const search = searchParams.get("search") || "";

  if (mode === "conversation") {
    const listingId = searchParams.get("listing_id");
    const userA = searchParams.get("user_a");
    const userB = searchParams.get("user_b");

    if (!listingId || !userA || !userB) {
      return NextResponse.json(
        { error: "listing_id, user_a, user_b required" },
        { status: 400 }
      );
    }

    let query = admin
      .from("marketplace_messages")
      .select("id, listing_id, sender_id, recipient_id, message, created_at")
      .eq("listing_id", listingId)
      .or(
        `and(sender_id.eq.${userA},recipient_id.eq.${userB}),and(sender_id.eq.${userB},recipient_id.eq.${userA})`
      )
      .order("created_at", { ascending: true });

    if (search) {
      query = query.ilike("message", `%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: "Query error", details: error.message },
        { status: 500 }
      );
    }

    const userIds = new Set<string>([userA, userB]);
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, full_name, email, account_type")
      .in("id", [...userIds]);

    const profileMap = Object.fromEntries(
      (profiles ?? []).map((p) => [p.id, p])
    );

    return NextResponse.json(
      { messages: data ?? [], profiles: profileMap },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  }

  // mode === "threads": return grouped conversations
  const { data: allMessages, error } = await admin
    .from("marketplace_messages")
    .select(
      "id, listing_id, sender_id, recipient_id, message, created_at"
    )
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "Query error", details: error.message },
      { status: 500 }
    );
  }

  // Group by (listing_id, sorted pair of sender/recipient)
  const threadMap = new Map<
    string,
    {
      listing_id: string;
      user_a: string;
      user_b: string;
      message_count: number;
      last_message: string;
      last_message_at: string;
      last_sender_id: string;
    }
  >();

  for (const msg of allMessages ?? []) {
    if (!msg.recipient_id) continue;
    const pair = [msg.sender_id, msg.recipient_id].sort();
    const key = `${msg.listing_id}:${pair[0]}:${pair[1]}`;

    const existing = threadMap.get(key);
    if (!existing) {
      threadMap.set(key, {
        listing_id: msg.listing_id,
        user_a: pair[0],
        user_b: pair[1],
        message_count: 1,
        last_message: msg.message,
        last_message_at: msg.created_at,
        last_sender_id: msg.sender_id,
      });
    } else {
      existing.message_count++;
      if (msg.created_at > existing.last_message_at) {
        existing.last_message = msg.message;
        existing.last_message_at = msg.created_at;
        existing.last_sender_id = msg.sender_id;
      }
    }
  }

  let threads = Array.from(threadMap.values()).sort(
    (a, b) =>
      new Date(b.last_message_at).getTime() -
      new Date(a.last_message_at).getTime()
  );

  // Search filter — match in thread messages
  if (search) {
    const matchingKeys = new Set<string>();
    for (const msg of allMessages ?? []) {
      if (!msg.recipient_id) continue;
      if (msg.message.toLowerCase().includes(search.toLowerCase())) {
        const pair = [msg.sender_id, msg.recipient_id].sort();
        matchingKeys.add(`${msg.listing_id}:${pair[0]}:${pair[1]}`);
      }
    }
    threads = threads.filter((t) => {
      const pair = [t.user_a, t.user_b].sort();
      return matchingKeys.has(`${t.listing_id}:${pair[0]}:${pair[1]}`);
    });
  }

  // Collect all user IDs and listing IDs
  const userIds = new Set<string>();
  const listingIds = new Set<string>();
  for (const t of threads) {
    userIds.add(t.user_a);
    userIds.add(t.user_b);
    listingIds.add(t.listing_id);
  }

  const [profilesRes, listingsRes] = await Promise.all([
    userIds.size > 0
      ? admin
          .from("profiles")
          .select("id, full_name, email, account_type")
          .in("id", [...userIds])
      : { data: [] },
    listingIds.size > 0
      ? admin
          .from("marketplace_listings")
          .select(
            "id, seller_id, status, best_day:best_days!marketplace_listings_best_day_id_fkey(name)"
          )
          .in("id", [...listingIds])
      : { data: [] },
  ]);

  const profileMap = Object.fromEntries(
    (profilesRes.data ?? []).map((p) => [p.id, p])
  );
  const listingMap = Object.fromEntries(
    (listingsRes.data ?? []).map((l) => [l.id, l])
  );

  return NextResponse.json(
    { threads, profiles: profileMap, listings: listingMap },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
