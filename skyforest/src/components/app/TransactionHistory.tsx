"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowDownRight,
  ArrowUpRight,
  Gift,
  ChevronDown,
  Loader2,
  RotateCcw,
} from "lucide-react";

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  balance_after: number | null;
  created_at: string;
}

interface Props {
  initial?: Transaction[];
  limit?: number;
  compact?: boolean;
}

export function TransactionHistory({ initial, limit = 20, compact = false }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>(initial ?? []);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!initial);
  const [hasMore, setHasMore] = useState((initial?.length ?? 0) >= limit);

  const INITIAL_SHOW = compact ? 5 : 10;
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (initial) return;
    const load = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("token_transactions")
        .select("id, amount, type, description, balance_after, created_at")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (data) {
        setTransactions(data);
        setHasMore(data.length >= limit);
      }
      setInitialLoading(false);
    };
    load();
  }, [initial, limit]);

  const loadMore = async () => {
    setLoadingMore(true);
    const supabase = createClient();
    const lastDate = transactions[transactions.length - 1]?.created_at;
    const { data } = await supabase
      .from("token_transactions")
      .select("id, amount, type, description, balance_after, created_at")
      .lt("created_at", lastDate)
      .order("created_at", { ascending: false })
      .limit(20);

    if (data) {
      setTransactions((prev) => [...prev, ...data]);
      if (data.length < 20) setHasMore(false);
    } else {
      setHasMore(false);
    }
    setLoadingMore(false);
    setShowAll(true);
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (transactions.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">Нет операций</p>;
  }

  const visible = showAll ? transactions : transactions.slice(0, INITIAL_SHOW);
  const hiddenCount = transactions.length - INITIAL_SHOW;

  const typeIcon = (type: string) => {
    if (type === "spend") return <ArrowDownRight className="h-4 w-4 text-red-400" />;
    if (type === "purchase") return <ArrowUpRight className="h-4 w-4 text-green-400" />;
    if (type === "refund") return <RotateCcw className="h-4 w-4 text-blue-400" />;
    return <Gift className="h-4 w-4 text-amber-400" />;
  };

  const typeBg = (type: string) => {
    if (type === "spend") return "bg-red-500/15";
    if (type === "purchase") return "bg-green-500/15";
    if (type === "refund") return "bg-blue-500/15";
    return "bg-amber-500/15";
  };

  const typeLabel = (type: string) => {
    if (type === "spend") return "Списание";
    if (type === "purchase") return "Покупка";
    if (type === "refund") return "Возврат";
    if (type === "bonus") return "Бонус";
    if (type === "referral_bonus") return "Реферальный бонус";
    if (type === "seller_credit") return "Продажа";
    return type;
  };

  return (
    <div>
      <div className="space-y-2">
        {visible.map((tx) => (
          <div
            key={tx.id}
            className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3"
          >
            <div
              className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${typeBg(tx.type)}`}
            >
              {typeIcon(tx.type)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">
                {tx.description || typeLabel(tx.type)}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(tx.created_at).toLocaleDateString("ru-RU", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <div className="flex-shrink-0 text-right">
              <p
                className={`text-sm font-semibold ${
                  tx.amount > 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {tx.amount > 0 ? "+" : ""}
                {tx.amount}
              </p>
              {tx.balance_after !== null && (
                <p className="text-xs text-muted-foreground">
                  = {tx.balance_after}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {!showAll && hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl bg-white/5 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
        >
          <ChevronDown className="h-4 w-4" />
          Показать ещё {hiddenCount}
        </button>
      )}

      {showAll && hasMore && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loadingMore}
          className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl bg-white/5 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground disabled:opacity-50"
        >
          {loadingMore ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
          Загрузить ещё
        </button>
      )}
    </div>
  );
}
