import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServerClient } from "@supabase/ssr";

interface Thread {
  partner_id: string;
  partner_name: string | null;
  partner_account_type: string;
  last_message: string;
  last_message_at: string;
  last_sender_id: string;
  message_count: number;
  is_unread: boolean;
}

interface ListingGroup {
  listing_id: string;
  listing_name: string;
  listing_status: string;
  seller_id: string;
  is_seller: boolean;
  threads: Thread[];
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: messages } = await supabase
    .from("marketplace_messages")
    .select("listing_id, sender_id, recipient_id, message, created_at")
    .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  if (!messages || messages.length === 0) {
    return NextResponse.json({ conversations: [] });
  }

  const threadMap = new Map<
    string,
    { msgs: typeof messages; partnerId: string; listingId: string }
  >();

  for (const msg of messages) {
    const partnerId =
      msg.sender_id === user.id ? msg.recipient_id : msg.sender_id;
    if (!partnerId) continue;
    const key = `${msg.listing_id}:${partnerId}`;
    if (!threadMap.has(key)) {
      threadMap.set(key, {
        msgs: [],
        partnerId,
        listingId: msg.listing_id,
      });
    }
    threadMap.get(key)!.msgs.push(msg);
  }

  const listingIds = [...new Set(messages.map((m) => m.listing_id))];
  const partnerIds = [
    ...new Set(
      [...threadMap.values()].map((t) => t.partnerId)
    ),
  ];

  const admin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  const [listingsRes, profilesRes, readsRes] = await Promise.all([
    admin
      .from("marketplace_listings")
      .select(
        "id, seller_id, status, best_day:best_days!marketplace_listings_best_day_id_fkey(name)"
      )
      .in("id", listingIds),
    admin
      .from("profiles")
      .select("id, full_name, account_type")
      .in("id", partnerIds),
    supabase
      .from("marketplace_chat_reads")
      .select("listing_id, partner_id, read_at")
      .eq("user_id", user.id),
  ]);

  const readMap = new Map<string, string>();
  for (const r of readsRes.data ?? []) {
    readMap.set(`${r.listing_id}:${r.partner_id}`, r.read_at);
  }

  const listingMap = new Map<
    string,
    { seller_id: string; status: string; name: string }
  >();
  for (const l of listingsRes.data ?? []) {
    const bd = l.best_day as
      | { name: string }
      | { name: string }[]
      | null;
    const name = Array.isArray(bd) ? bd[0]?.name : bd?.name;
    listingMap.set(l.id, {
      seller_id: l.seller_id,
      status: l.status,
      name: name ?? "Грибной день",
    });
  }

  const profileMap = new Map<
    string,
    { full_name: string | null; account_type: string }
  >();
  for (const p of profilesRes.data ?? []) {
    profileMap.set(p.id, {
      full_name: p.full_name,
      account_type: p.account_type,
    });
  }

  const groupedByListing = new Map<string, Thread[]>();

  for (const [, thread] of threadMap) {
    const last = thread.msgs[0];
    const profile = profileMap.get(thread.partnerId);

    const key = `${thread.listingId}:${thread.partnerId}`;
    const readAt = readMap.get(key);
    const isFromPartner = last.sender_id !== user.id;
    const isUnread =
      isFromPartner && (!readAt || new Date(last.created_at) > new Date(readAt));

    const t: Thread = {
      partner_id: thread.partnerId,
      partner_name: profile?.full_name ?? null,
      partner_account_type: profile?.account_type ?? "user",
      last_message: last.message,
      last_message_at: last.created_at,
      last_sender_id: last.sender_id,
      message_count: thread.msgs.length,
      is_unread: isUnread,
    };

    if (!groupedByListing.has(thread.listingId)) {
      groupedByListing.set(thread.listingId, []);
    }
    groupedByListing.get(thread.listingId)!.push(t);
  }

  const conversations: ListingGroup[] = [];

  for (const [listingId, threads] of groupedByListing) {
    const listing = listingMap.get(listingId);
    threads.sort(
      (a, b) =>
        new Date(b.last_message_at).getTime() -
        new Date(a.last_message_at).getTime()
    );

    conversations.push({
      listing_id: listingId,
      listing_name: listing?.name ?? "Грибной день",
      listing_status: listing?.status ?? "unknown",
      seller_id: listing?.seller_id ?? "",
      is_seller: listing?.seller_id === user.id,
      threads,
    });
  }

  conversations.sort((a, b) => {
    const aTime = a.threads[0]?.last_message_at ?? "";
    const bTime = b.threads[0]?.last_message_at ?? "";
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });

  return NextResponse.json({ conversations });
}
