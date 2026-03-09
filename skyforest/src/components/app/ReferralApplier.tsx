"use client";

import { useEffect } from "react";

export function ReferralApplier() {
  useEffect(() => {
    const code = localStorage.getItem("skyforest_ref");
    if (!code) return;

    fetch("/api/referral/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    })
      .then((res) => {
        if (res.status >= 500) {
          // Server error — keep code in localStorage so next load retries
          return;
        }
        // Any 2xx / 4xx = definitive answer, remove code from localStorage
        localStorage.removeItem("skyforest_ref");
      })
      .catch(() => {
        // Network error — keep code in localStorage so next load retries
      });
  }, []);

  return null;
}
