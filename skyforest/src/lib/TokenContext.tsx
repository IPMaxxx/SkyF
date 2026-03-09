"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

interface TokenContextType {
  balance: number | null;
  loading: boolean;
  spend: (action: string, description?: string, multiplier?: number) => Promise<{ success: boolean; balance: number; error?: string }>;
  refresh: () => Promise<void>;
}

const TokenContext = createContext<TokenContextType>({
  balance: null,
  loading: true,
  spend: async () => ({ success: false, balance: 0, error: "No provider" }),
  refresh: async () => {},
});

export function TokenProvider({ children }: { children: ReactNode }) {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
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
    refresh();
  }, [refresh]);

  const spend = async (action: string, description?: string, multiplier?: number) => {
    try {
      const res = await fetch("/api/tokens/spend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, description, multiplier }),
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

  return (
    <TokenContext.Provider value={{ balance, loading, spend, refresh }}>
      {children}
    </TokenContext.Provider>
  );
}

export function useTokens() {
  return useContext(TokenContext);
}
