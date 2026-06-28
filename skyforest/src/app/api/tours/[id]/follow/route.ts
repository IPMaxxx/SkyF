import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/tours/[id]/follow — start following a tour (free, any registered user)
export async function POST(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Make sure the tour exists and is publicly visible (RLS-gated).
  const { data: tour } = await supabase
    .from("mushroom_tours")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (!tour) return NextResponse.json({ error: "Тур не найден" }, { status: 404 });

  const { error } = await supabase
    .from("tour_followers")
    .upsert({ tour_id: id, user_id: user.id }, { onConflict: "tour_id,user_id" });

  if (error) {
    console.error("Tour follow error:", error);
    return NextResponse.json({ error: "Не удалось подписаться" }, { status: 500 });
  }
  return NextResponse.json({ success: true, following: true });
}

// DELETE /api/tours/[id]/follow — stop following
export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("tour_followers")
    .delete()
    .eq("tour_id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Tour unfollow error:", error);
    return NextResponse.json({ error: "Не удалось отписаться" }, { status: 500 });
  }
  return NextResponse.json({ success: true, following: false });
}
