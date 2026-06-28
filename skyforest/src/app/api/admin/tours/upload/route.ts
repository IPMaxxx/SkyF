import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServerClient } from "@supabase/ssr";

const BUCKET = "tour-photos";
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function adminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401 as const, error: "Unauthorized" };
  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", user.id)
    .single();
  if (profile?.account_type !== "admin") {
    return { ok: false, status: 403 as const, error: "Forbidden" };
  }
  return { ok: true, status: 200 as const, error: null };
}

// POST /api/admin/tours/upload — multipart form with one or more "file" fields.
// Returns { urls: string[] } of public image URLs.
export async function POST(request: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const files = form.getAll("file").filter((f): f is File => f instanceof File);
  const tourId = (form.get("tour_id") as string) || "new";
  if (files.length === 0) {
    return NextResponse.json({ error: "Файл не передан" }, { status: 400 });
  }

  const admin = adminClient();
  const urls: string[] = [];

  for (const file of files) {
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json(
        { error: "Поддерживаются только изображения (JPG, PNG, WebP, GIF)" },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Файл слишком большой (максимум 8 МБ)" },
        { status: 400 }
      );
    }

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().slice(0, 5);
    const path = `${tourId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: upErr } = await admin.storage
      .from(BUCKET)
      .upload(path, file, { cacheControl: "3600", contentType: file.type, upsert: false });

    if (upErr) {
      console.error("Tour photo upload error:", upErr);
      return NextResponse.json({ error: "Ошибка загрузки фото" }, { status: 500 });
    }

    const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
    if (data?.publicUrl) urls.push(data.publicUrl);
  }

  return NextResponse.json({ urls });
}
