import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { amount, method, details, comment } = await request.json();
  const numAmount = Number(amount);

  if (!Number.isFinite(numAmount) || numAmount < 10) {
    return NextResponse.json(
      { error: "Минимальная сумма вывода — 10 токенов" },
      { status: 400 }
    );
  }

  if (!method || !details) {
    return NextResponse.json(
      { error: "Укажите способ и реквизиты для вывода" },
      { status: 400 }
    );
  }

  const { data: balanceData } = await supabase.rpc("get_token_balance", {
    p_user_id: user.id,
  });

  if (!balanceData || balanceData < numAmount) {
    return NextResponse.json(
      { error: "Недостаточно токенов на балансе" },
      { status: 400 }
    );
  }

  const { data: spendResult, error: spendErr } = await supabase.rpc(
    "spend_tokens",
    {
      p_user_id: user.id,
      p_amount: numAmount,
      p_description: `Запрос на вывод (${method})`,
    }
  );

  if (spendErr) {
    console.error("Withdraw spend error:", spendErr);
    const msg =
      spendErr.message?.includes("Недостаточно")
        ? "Недостаточно токенов на балансе"
        : "Ошибка списания токенов";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const newBalance =
    typeof spendResult === "object" && spendResult?.balance != null
      ? spendResult.balance
      : "—";

  try {
    const html = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h2 style="color:#10b981;">Запрос на вывод токенов</h2>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Пользователь</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600;">${user.email}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">ID пользователя</td><td style="padding:8px;border-bottom:1px solid #eee;font-family:monospace;font-size:12px;">${user.id}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Сумма вывода</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600;color:#f59e0b;">${numAmount} токенов</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Остаток после списания</td><td style="padding:8px;border-bottom:1px solid #eee;">${newBalance} токенов</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Способ вывода</td><td style="padding:8px;border-bottom:1px solid #eee;">${method}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Реквизиты</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600;">${details}</td></tr>
          ${comment ? `<tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666;">Комментарий</td><td style="padding:8px;border-bottom:1px solid #eee;">${comment}</td></tr>` : ""}
        </table>
        <p style="color:#666;font-size:13px;">Дата: ${new Date().toLocaleString("ru-RU", { timeZone: "Europe/Minsk" })}</p>
      </div>
    `;

    await sendEmail(
      "support@skyforest.by",
      `Запрос на вывод: ${numAmount} токенов от ${user.email}`,
      html
    );
  } catch (emailErr) {
    console.error("Withdraw email error:", emailErr);
  }

  return NextResponse.json({
    success: true,
    withdrawn: numAmount,
    newBalance,
  });
}
