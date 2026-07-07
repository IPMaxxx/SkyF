import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { BRAND } from "@/lib/brand";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { amount, method, details, comment } = await request.json();
  const numAmount = Math.floor(Number(amount));

  if (!Number.isFinite(numAmount) || numAmount < 100) {
    return NextResponse.json(
      { error: "Минимальная сумма вывода — 100 токенов" },
      { status: 400 }
    );
  }

  if (!method || !details) {
    return NextResponse.json(
      { error: "Укажите способ и реквизиты для вывода" },
      { status: 400 }
    );
  }

  // Выводу подлежит только доход с маркетплейса минус уже выведенное
  // (купленные и бонусные токены не выводятся — политика сторов).
  // Лимит атомарно проверяет RPC withdraw_tokens (patch-v41).
  const { data: availData } = await supabase.rpc("get_withdrawable", {
    p_user_id: user.id,
  });
  const currentBalance = availData?.available ?? 0;

  const { data: spendResult, error: spendErr } = await supabase.rpc("withdraw_tokens", {
    p_user_id: user.id,
    p_amount: numAmount,
    p_description: `Вывод ${numAmount} токенов`,
  });

  if (spendErr || !spendResult?.success) {
    const msg = spendResult?.error === "insufficient"
      ? `Недостаточно токенов, доступных к выводу (доступно: ${spendResult?.available ?? 0}). Выводить можно только доход с маркетплейса.`
      : "Ошибка списания токенов";
    return NextResponse.json({ error: msg }, { status: 402 });
  }

  const safeMethod = escapeHtml(String(method).slice(0, 200));
  const safeDetails = escapeHtml(String(details).slice(0, 500));
  const safeComment = comment ? escapeHtml(String(comment).slice(0, 500)) : "";

  try {
    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h2 style="color:#10b981;">Token withdrawal request</h2>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">User</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600;">${escapeHtml(user.email ?? "")}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">User ID</td><td style="padding:8px;border-bottom:1px solid #eee;font-family:monospace;font-size:12px;">${user.id}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Withdrawal amount</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600;color:#f59e0b;">${numAmount} tokens (~${(numAmount * 0.3).toFixed(2)} BYN)</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Withdrawable before</td><td style="padding:8px;border-bottom:1px solid #eee;">${currentBalance} tokens</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Balance after</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600;">${spendResult.balance} tokens</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Withdrawal method</td><td style="padding:8px;border-bottom:1px solid #eee;">${safeMethod}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Payment details</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600;">${safeDetails}</td></tr>
          ${safeComment ? `<tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Comment</td><td style="padding:8px;border-bottom:1px solid #eee;">${safeComment}</td></tr>` : ""}
        </table>
        <p style="color:#666;font-size:13px;">Date: ${new Date().toLocaleString("en-GB", { timeZone: "Europe/Minsk" })}</p>
        <p style="color:#999;font-size:11px;">Tokens have already been deducted from the user's balance. If the request is rejected, refund them via the admin panel.</p>
      </div>
    `;

    await sendEmail(
      BRAND.contacts.email,
      `Withdrawal request: ${numAmount} tokens from ${user.email}`,
      html
    );
  } catch (emailErr) {
    console.error("Withdraw email error (tokens already deducted):", emailErr);
  }

  return NextResponse.json({
    success: true,
    withdrawn: numAmount,
    balance: spendResult.balance,
  });
}
