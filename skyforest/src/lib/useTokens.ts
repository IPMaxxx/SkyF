"use client";

import { useState, useEffect, useCallback } from "react";

interface SpendResult {
  success: boolean;
  balance: number;
  error?: string;
}

export function useTokens() {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const loadBalance = useCallback(async () => {
    try {
      const res = await fetch("/api/tokens/balance");
      const data = await res.json();
      setBalance(data.balance ?? 0);
    } catch {
      setBalance(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBalance();
  }, [loadBalance]);

  const spend = async (action: string, description?: string): Promise<SpendResult> => {
    try {
      const res = await fetch("/api/tokens/spend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, description }),
      });
      const data = await res.json();

      if (!res.ok) {
        return {
          success: false,
          balance: data.balance ?? balance ?? 0,
          error: data.error || "Ошибка списания токенов",
        };
      }

      setBalance(data.balance);
      return { success: true, balance: data.balance };
    } catch {
      return { success: false, balance: balance ?? 0, error: "Ошибка сети" };
    }
  };

  return { balance, loading, spend, refresh: loadBalance };
}
