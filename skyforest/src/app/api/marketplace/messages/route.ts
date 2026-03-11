import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServerClient } from "@supabase/ssr";
import { sendEmail } from "@/lib/email";
import { buildNewMessageEmail } from "@/lib/email-templates";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const listingId = request.nextUrl.searchParams.get("listing_id");
  if (!listingId) {
    return NextResponse.json({ error: "listing_id required" }, { status: 400 });
  }

  const { data: listing } = await supabase
    .from("marketplace_listings")
    .select("id, seller_id, buyer_id, status")
    .eq("id", listingId)
    .in("status", ["active", "sold"])
    .single();

  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  const isSeller = listing.seller_id === user.id;

  if (listing.status === "sold") {
    if (listing.seller_id !== user.id && listing.buyer_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  let partnerId: string | null;

  if (listing.status === "sold") {
    partnerId = isSeller ? listing.buyer_id : listing.seller_id;
  } else {
    if (isSeller) {
      const requestedPartnerId = request.nextUrl.searchParams.get("partner_id");
      partnerId = requestedPartnerId;
    } else {
      partnerId = listing.seller_id;
    }
  }

  if (!partnerId) {
    if (isSeller) {
      const { data: threads } = await supabase
        .from("marketplace_messages")
        .select("sender_id, recipient_id")
        .eq("listing_id", listingId)
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`);

      const userIds = new Set<string>();
      for (const msg of threads ?? []) {
        if (msg.sender_id !== user.id) userIds.add(msg.sender_id);
        if (msg.recipient_id && msg.recipient_id !== user.id) userIds.add(msg.recipient_id);
      }

      const threadUsers: { id: string; full_name: string | null; account_type: string }[] = [];
      if (userIds.size > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, account_type")
          .in("id", [...userIds]);
        if (profiles) threadUsers.push(...profiles);
      }

      return NextResponse.json({
        mode: "thread_list",
        threads: threadUsers,
        role: "seller",
      });
    }
    return NextResponse.json({ error: "partner_id required" }, { status: 400 });
  }

  const { data: messages, error } = await supabase
    .from("marketplace_messages")
    .select("id, sender_id, recipient_id, message, created_at")
    .eq("listing_id", listingId)
    .or(
      `and(sender_id.eq.${user.id},recipient_id.eq.${partnerId}),and(sender_id.eq.${partnerId},recipient_id.eq.${user.id})`
    )
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Ошибка загрузки" }, { status: 500 });
  }

  const admin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  const { data: partnerProfile } = await admin
    .from("profiles")
    .select("full_name, account_type")
    .eq("id", partnerId)
    .single();

  return NextResponse.json({
    mode: "conversation",
    messages: messages ?? [],
    partner: {
      id: partnerId,
      full_name: partnerProfile?.full_name ?? null,
      account_type: partnerProfile?.account_type ?? "user",
    },
    role: isSeller ? "seller" : "buyer",
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const listingId = body?.listing_id;
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const recipientId = body?.recipient_id;

  if (!listingId || !message) {
    return NextResponse.json(
      { error: "listing_id and message required" },
      { status: 400 }
    );
  }

  if (message.length > 2000) {
    return NextResponse.json(
      { error: "Сообщение слишком длинное (макс. 2000 символов)" },
      { status: 400 }
    );
  }

  const { data: listing } = await supabase
    .from("marketplace_listings")
    .select("id, seller_id, buyer_id, status")
    .eq("id", listingId)
    .in("status", ["active", "sold"])
    .single();

  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  let resolvedRecipientId: string;

  if (listing.status === "sold") {
    if (listing.seller_id !== user.id && listing.buyer_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    resolvedRecipientId =
      listing.seller_id === user.id ? listing.buyer_id! : listing.seller_id;
  } else {
    if (listing.seller_id === user.id) {
      if (!recipientId) {
        return NextResponse.json(
          { error: "recipient_id required for seller" },
          { status: 400 }
        );
      }
      resolvedRecipientId = recipientId;
    } else {
      resolvedRecipientId = listing.seller_id;
    }
  }

  if (resolvedRecipientId === user.id) {
    return NextResponse.json(
      { error: "Cannot message yourself" },
      { status: 400 }
    );
  }

  const { data: msg, error } = await supabase
    .from("marketplace_messages")
    .insert({
      listing_id: listingId,
      sender_id: user.id,
      recipient_id: resolvedRecipientId,
      message,
    })
    .select("id, sender_id, recipient_id, message, created_at")
    .single();

  if (error) {
    console.error("Send message error:", error);
    return NextResponse.json({ error: "Ошибка отправки" }, { status: 500 });
  }

  // Send email notification (throttled: max once per hour per conversation)
  try {
    const adminSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    );

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await adminSupabase
      .from("marketplace_messages")
      .select("id", { count: "exact", head: true })
      .eq("listing_id", listingId)
      .eq("sender_id", user.id)
      .eq("recipient_id", resolvedRecipientId)
      .gte("created_at", oneHourAgo)
      .neq("id", msg.id);

    if ((recentCount ?? 0) === 0) {
      const [recipientRes, senderRes, listingInfoRes] = await Promise.all([
        adminSupabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", resolvedRecipientId)
          .single(),
        adminSupabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single(),
        adminSupabase
          .from("marketplace_listings")
          .select(
            "id, best_day:best_days!marketplace_listings_best_day_id_fkey(name)"
          )
          .eq("id", listingId)
          .single(),
      ]);

      const recipientEmail = recipientRes.data?.email;
      if (recipientEmail) {
        const senderName = senderRes.data?.full_name || "Пользователь";
        const bd = listingInfoRes.data?.best_day as
          | { name: string }
          | { name: string }[]
          | null;
        const listingName = Array.isArray(bd)
          ? bd[0]?.name
          : bd?.name ?? "Листинг";

        const appUrl =
          process.env.NEXT_PUBLIC_APP_URL || "https://www.skyforest.by";
        const chatUrl = `${appUrl}/dashboard/marketplace/chats?listing=${listingId}&partner=${user.id}`;

        await sendEmail(
          recipientEmail,
          `Новое сообщение от ${senderName} — Skyforest`,
          buildNewMessageEmail(senderName, listingName, message, chatUrl)
        );
      }
    }
  } catch (emailErr) {
    console.error("Email notification error:", emailErr);
  }

  return NextResponse.json({ message: msg });
}
