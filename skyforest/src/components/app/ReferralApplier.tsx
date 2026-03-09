"use client";

import { useEffect } from "react";

export function ReferralApplier() {
  useEffect(() => {
    const code = localStorage.getItem("skyforest_ref");
    if (!code) return;

    localStorage.removeItem("skyforest_ref");

    fetch("/api/referral/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    }).catch(() => {});
  }, []);

  return null;
}
