"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  MessageCircle,
  ChevronLeft,
  Send,
  Store,
} from "lucide-react";
import { UserName } from "@/components/app/UserName";

/* ─── Types ─── */

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

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  message: string;
  created_at: string;
}

interface Partner {
  id: string;
  full_name: string | null;
  account_type: string;
}

const STATUS_LABEL: Record<string, string> = {
  active: "Активный",
  sold: "Продан",
  cancelled: "Отменён",
};

const STATUS_COLOR: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  sold: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "только что";
  if (mins < 60) return `${mins} мин`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ч`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} д`;
  return new Date(dateStr).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
}

/* ─── Main Page ─── */

export default function ChatsPage() {
  const [conversations, setConversations] = useState<ListingGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeChat, setActiveChat] = useState<{
    listingId: string;
    partnerId: string;
    listingName: string;
    isSeller: boolean;
  } | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [msgLoading, setMsgLoading] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/marketplace/chats");
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations ?? []);
      }
    } catch { /* noop */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Read URL params on mount (from email link)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const listing = params.get("listing");
    const partner = params.get("partner");
    if (listing && partner) {
      openChat(listing, partner, "", false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMessages = useCallback(
    async (listingId: string, partnerId: string) => {
      try {
        const params = new URLSearchParams({
          listing_id: listingId,
          partner_id: partnerId,
        });
        const res = await fetch(`/api/marketplace/messages?${params}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.mode === "conversation") {
          setMessages(data.messages ?? []);
          setPartner(data.partner ?? null);
        }
      } catch { /* noop */ }
    },
    []
  );

  const openChat = useCallback(
    async (
      listingId: string,
      partnerId: string,
      listingName: string,
      isSeller: boolean
    ) => {
      setActiveChat({ listingId, partnerId, listingName, isSeller });
      setMessages([]);
      setPartner(null);
      setMsgLoading(true);
      setText("");
      await loadMessages(listingId, partnerId);
      setMsgLoading(false);
    },
    [loadMessages]
  );

  // Poll active chat
  useEffect(() => {
    if (!activeChat) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(
      () => loadMessages(activeChat.listingId, activeChat.partnerId),
      10_000
    );
    return () => clearInterval(pollRef.current);
  }, [activeChat, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!activeChat || !text.trim() || sending) return;
    setSending(true);
    try {
      const body: Record<string, string> = {
        listing_id: activeChat.listingId,
        message: text.trim(),
        recipient_id: activeChat.partnerId,
      };
      const res = await fetch("/api/marketplace/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok && data.message) {
        setMessages((prev) => [...prev, data.message]);
        setText("");
      }
    } catch { /* noop */ }
    finally { setSending(false); }
  };

  const closeChat = () => {
    setActiveChat(null);
    loadConversations();
  };

  const totalUnread = conversations.reduce(
    (sum, g) => sum + g.threads.filter((t) => t.is_unread).length,
    0
  );

  /* ─── Active Chat View ─── */
  if (activeChat) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6">
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <button
            onClick={closeChat}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-muted-foreground hover:bg-white/5"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-blue-400 flex-shrink-0" />
              {partner && (
                <span className="text-sm font-medium truncate">
                  <UserName
                    name={partner.full_name}
                    accountType={partner.account_type}
                  />
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {activeChat.listingName || "Грибной день"}
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
          <div className="max-h-[60vh] overflow-y-auto px-4 py-4 space-y-2">
            {msgLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <p className="py-12 text-center text-xs text-muted-foreground">
                Нет сообщений. Напишите первым!
              </p>
            ) : (
              messages.map((msg) => {
                const isMine = msg.sender_id !== partner?.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                        isMine
                          ? "bg-blue-600/80 text-white rounded-br-md"
                          : "bg-white/10 text-foreground rounded-bl-md"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">
                        {msg.message}
                      </p>
                      <p
                        className={`mt-0.5 text-[10px] ${
                          isMine
                            ? "text-blue-200/60"
                            : "text-muted-foreground/50"
                        }`}
                      >
                        {new Date(msg.created_at).toLocaleString("ru-RU", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-white/10 px-4 py-3">
            <div className="flex items-end gap-2">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Написать сообщение..."
                rows={1}
                className="flex-1 resize-none rounded-xl border border-border bg-white/5 px-3 py-2 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-muted-foreground/50"
              />
              <button
                onClick={handleSend}
                disabled={sending || !text.trim()}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:opacity-40"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Conversations List ─── */
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/dashboard/marketplace"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          Маркетплейс
        </Link>
      </div>

      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400">
          <MessageCircle className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-lg font-bold">Мои чаты</h1>
          <p className="text-xs text-muted-foreground">
            {conversations.length === 0
              ? "Нет диалогов"
              : `${conversations.reduce((s, g) => s + g.threads.length, 0)} диалогов`}
            {totalUnread > 0 && (
              <span className="ml-1 text-blue-400">
                ({totalUnread} неотвеченных)
              </span>
            )}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] py-16">
          <MessageCircle className="mb-3 h-12 w-12 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground mb-3">
            У вас пока нет сообщений
          </p>
          <Link
            href="/dashboard/marketplace"
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Store className="h-4 w-4" />
            Перейти на маркетплейс
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {conversations.map((group) => (
            <div
              key={group.listing_id}
              className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden"
            >
              {/* Listing header */}
              <div className="flex items-center gap-3 border-b border-white/5 px-4 py-3 bg-white/[0.02]">
                <Store className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {group.listing_name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {group.is_seller ? "Вы продавец" : "Вы покупатель"}
                  </p>
                </div>
                <span
                  className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${
                    STATUS_COLOR[group.listing_status] ?? ""
                  }`}
                >
                  {STATUS_LABEL[group.listing_status] ?? group.listing_status}
                </span>
              </div>

              {/* Threads */}
              <div className="divide-y divide-white/5">
                {group.threads.map((thread) => (
                  <button
                    key={thread.partner_id}
                    onClick={() =>
                      openChat(
                        group.listing_id,
                        thread.partner_id,
                        group.listing_name,
                        group.is_seller
                      )
                    }
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.04]"
                  >
                    {/* Avatar placeholder */}
                    <div
                      className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        thread.is_unread
                          ? "bg-blue-500/20 text-blue-400"
                          : "bg-white/10 text-muted-foreground"
                      }`}
                    >
                      {(
                        thread.partner_name?.[0] ?? "?"
                      ).toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm truncate ${
                            thread.is_unread
                              ? "font-semibold text-foreground"
                              : "font-medium text-foreground/80"
                          }`}
                        >
                          <UserName
                            name={thread.partner_name}
                            accountType={thread.partner_account_type}
                          />
                        </span>
                        <span className="text-[10px] text-muted-foreground/60 whitespace-nowrap flex-shrink-0">
                          {timeAgo(thread.last_message_at)}
                        </span>
                      </div>
                      <p
                        className={`text-xs truncate mt-0.5 ${
                          thread.is_unread
                            ? "text-foreground/70"
                            : "text-muted-foreground"
                        }`}
                      >
                        {thread.last_sender_id === thread.partner_id
                          ? ""
                          : "Вы: "}
                        {thread.last_message}
                      </p>
                    </div>

                    {/* Unread indicator */}
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {thread.is_unread && (
                        <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {thread.message_count}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
