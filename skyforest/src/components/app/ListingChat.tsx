"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, Send, MessageCircle, ChevronDown, ChevronUp } from "lucide-react";
import { UserName } from "@/components/app/UserName";

interface Message {
  id: string;
  sender_id: string;
  message: string;
  created_at: string;
}

interface Partner {
  id: string;
  full_name: string | null;
  account_type: string;
}

interface ListingChatProps {
  listingId: string;
  sellerId?: string;
  recipientId?: string;
  compact?: boolean;
  defaultExpanded?: boolean;
}

export function ListingChat({
  listingId,
  sellerId,
  recipientId,
  compact,
  defaultExpanded,
}: ListingChatProps) {
  const t = useTranslations("marketplace");
  const locale = useLocale();
  const [messages, setMessages] = useState<Message[]>([]);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [role, setRole] = useState<"buyer" | "seller">("buyer");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");
  const [expanded, setExpanded] = useState(defaultExpanded ?? false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const loadMessages = useCallback(async () => {
    try {
      const params = new URLSearchParams({ listing_id: listingId });
      if (recipientId) params.set("partner_id", recipientId);
      const res = await fetch(`/api/marketplace/messages?${params}`);
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.mode === "conversation") {
        setMessages(data.messages ?? []);
        setPartner(data.partner ?? null);
        setRole(data.role ?? "buyer");
      }
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  }, [listingId, recipientId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (!expanded) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(loadMessages, 15_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [expanded, loadMessages]);

  useEffect(() => {
    if (expanded) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, expanded]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setError("");

    try {
      const body: Record<string, string> = {
        listing_id: listingId,
        message: trimmed,
      };
      if (recipientId) body.recipient_id = recipientId;
      else if (sellerId) body.recipient_id = sellerId;

      const res = await fetch("/api/marketplace/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("chatSendError"));
        setSending(false);
        return;
      }
      setMessages((prev) => [...prev, data.message]);
      setText("");
    } catch {
      setError(t("errNetwork"));
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className={`${compact ? "" : "glass"} rounded-2xl p-4 flex items-center gap-2 text-sm text-muted-foreground`}>
        <Loader2 className="h-4 w-4 animate-spin" />
        {t("chatLoading")}
      </div>
    );
  }

  const partnerRole = role === "buyer" ? t("rolePartnerSeller") : t("rolePartnerBuyer");

  return (
    <div className={`${compact ? "border border-white/10 bg-white/5" : "glass"} rounded-2xl overflow-hidden`}>
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-3.5 text-left transition-colors hover:bg-white/5"
      >
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-medium">
            {t("chatWith", { role: partnerRole })}
            {partner && (
              <>
                {": "}
                <UserName
                  name={partner.full_name}
                  accountType={partner.account_type}
                />
              </>
            )}
          </span>
          {messages.length > 0 && (
            <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[11px] font-medium text-blue-400">
              {messages.length}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Expanded chat body */}
      {expanded && (
        <div className="border-t border-white/10">
          <div className={`${compact ? "max-h-52" : "max-h-80"} overflow-y-auto px-4 py-3 space-y-2`}>
            {messages.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                {t("chatNoMessages")}
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
                      <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                      <p
                        className={`mt-0.5 text-[10px] ${
                          isMine ? "text-blue-200/60" : "text-muted-foreground/50"
                        }`}
                      >
                        {new Date(msg.created_at).toLocaleString(
                          locale === "en" ? "en-US" : "ru-RU",
                          {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
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
            {error && (
              <p className="mb-2 text-xs text-red-400">{error}</p>
            )}
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
                placeholder={t("chatPlaceholder")}
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
      )}
    </div>
  );
}
