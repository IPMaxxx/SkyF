import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServerClient } from "@supabase/ssr";

/** Service-role клиент для upsert токена в обход RLS. */
function makeAdmin() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  );
}

/**
 * Регистрация push-токена устройства из нативного приложения.
 * Токен привязывается к текущему пользователю; при повторной отправке
 * (тем же устройством) переносится на актуального пользователя.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { token?: unknown; platform?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  const platform = body.platform === "ios" || body.platform === "android" ? body.platform : null;
  if (!token || !platform) {
    return NextResponse.json({ error: "token and platform are required" }, { status: 400 });
  }

  const admin = makeAdmin();
  const now = new Date().toISOString();
  const { error } = await admin
    .from("push_tokens")
    .upsert(
      {
        user_id: user.id,
        token,
        platform,
        updated_at: now,
        last_seen_at: now,
      },
      { onConflict: "token" },
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/** Удаление токена (например, при выходе из аккаунта). */
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = req.nextUrl.searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("push_tokens")
    .delete()
    .eq("user_id", user.id)
    .eq("token", token);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
