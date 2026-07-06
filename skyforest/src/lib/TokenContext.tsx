"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useTranslations } from "next-intl";

interface TokenContextType {
  /** Total balance (real + bonus) for general display */
  balance: number | null;
  /** Real balance only — the only tokens accepted on the marketplace */
  realBalance: number | null;
  /** Bonus tokens — usable for platform services, not marketplace or withdrawals */
  bonusBalance: number | null;
  loading: boolean;
  spend: (action: string, description?: string, multiplier?: number) => Promise<{ success: boolean; balance: number; error?: string }>;
  refresh: () => Promise<void>;
}

const TokenContext = createContext<TokenContextType>({
  balance: null,
  realBalance: null,
  bonusBalance: null,
  loading: true,
  spend: async () => ({ success: false, balance: 0, error: "No provider" }),
  refresh: async () => {},
});

export function TokenProvider({ children }: { children: ReactNode }) {
  const tc = useTranslations("common");
  const [balance, setBalance] = useState<number | null>(null);
  const [realBalance, setRealBalance] = useState<number | null>(null);
  const [bonusBalance, setBonusBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/tokens/balance");
      const data = await res.json();
      const real = data.balance ?? 0;
      const bonus = data.bonus_balance ?? 0;
      setRealBalance(real);
      setBonusBalance(bonus);
      setBalance(real + bonus);
    } catch {
      setBalance(0);
      setRealBalance(0);
      setBonusBalance(0);
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
          error: data.error || tc("spendError"),
        };
      }

      setBalance(data.balance);
      setRealBalance(data.real_balance ?? data.balance);
      setBonusBalance(data.bonus_balance ?? 0);
      return { success: true, balance: data.balance };
    } catch {
      return { success: false, balance: balance ?? 0, error: tc("networkError") };
    }
  };

  return (
    <TokenContext.Provider value={{ balance, realBalance, bonusBalance, loading, spend, refresh }}>
      {children}
    </TokenContext.Provider>
  );
}

export function useTokens() {
  return useContext(TokenContext);
}
