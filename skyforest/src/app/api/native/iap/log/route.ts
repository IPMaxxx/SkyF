import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Телеметрия ошибок IAP из нативного клиента: пишет событие в серверный
 * лог (pm2) с префиксом "IAP client:" — без записи в БД. Нужна для
 * диагностики ошибок покупок у App Review: клиентские StoreKit-ошибки
 * (товар не загрузился, order() отклонён и т.п.) иначе не видны на сервере.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let body: {
    stage?: string;
    platform?: string;
    productId?: string;
    code?: string | number;
    message?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const clip = (v: unknown, max: number) =>
    typeof v === "string" || typeof v === "number"
      ? String(v).slice(0, max)
      : "";

  console.error(
    `IAP client: stage=${clip(body.stage, 40)} platform=${clip(body.platform, 10)} product=${clip(body.productId, 80)} code=${clip(body.code, 40)} message=${clip(body.message, 500)} user=${user.id} email=${user.email ?? ""}`,
  );

  return NextResponse.json({ ok: true });
}
