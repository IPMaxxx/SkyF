import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ count: 0 });
  }

  const [{ data: messages }, { data: reads }] = await Promise.all([
    supabase
      .from("marketplace_messages")
      .select("listing_id, sender_id, recipient_id, created_at")
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order("created_at", { ascending: false }),
    supabase
      .from("marketplace_chat_reads")
      .select("listing_id, partner_id, read_at")
      .eq("user_id", user.id),
  ]);

  const readMap = new Map<string, string>();
  for (const r of reads ?? []) {
    readMap.set(`${r.listing_id}:${r.partner_id}`, r.read_at);
  }

  const conversations = new Map<
    string,
    { lastSenderId: string; lastAt: string }
  >();
  for (const msg of messages ?? []) {
    const partnerId =
      msg.sender_id === user.id ? msg.recipient_id : msg.sender_id;
    if (!partnerId) continue;
    const key = `${msg.listing_id}:${partnerId}`;
    if (!conversations.has(key)) {
      conversations.set(key, {
        lastSenderId: msg.sender_id,
        lastAt: msg.created_at,
      });
    }
  }

  let count = 0;
  for (const [key, conv] of conversations) {
    if (conv.lastSenderId === user.id) continue;
    const readAt = readMap.get(key);
    if (!readAt || new Date(conv.lastAt) > new Date(readAt)) {
      count++;
    }
  }

  return NextResponse.json({ count });
}
