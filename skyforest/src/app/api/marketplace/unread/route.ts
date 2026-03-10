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

  const { data: messages } = await supabase
    .from("marketplace_messages")
    .select("listing_id, sender_id, recipient_id, created_at")
    .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  const conversations = new Map<string, string>();
  for (const msg of messages ?? []) {
    const partnerId =
      msg.sender_id === user.id ? msg.recipient_id : msg.sender_id;
    if (!partnerId) continue;
    const key = `${msg.listing_id}:${partnerId}`;
    if (!conversations.has(key)) {
      conversations.set(key, msg.sender_id);
    }
  }

  let count = 0;
  for (const lastSenderId of conversations.values()) {
    if (lastSenderId !== user.id) count++;
  }

  return NextResponse.json({ count });
}
