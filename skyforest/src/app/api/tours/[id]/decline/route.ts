import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ id: string }> };

const ERROR_MESSAGES: Record<string, string> = {
  forbidden: "Действие запрещено",
  not_participant: "Вы не участвуете в этом туре",
  not_winner: "Отказ доступен только победителям",
};

// POST /api/tours/[id]/decline — winner declines; waitlist auto-promotes.
export async function POST(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("decline_tour_participation", {
    p_tour_id: id,
    p_user_id: user.id,
  });

  if (error) {
    console.error("decline_tour_participation RPC error:", error);
    return NextResponse.json({ error: "Ошибка отказа" }, { status: 500 });
  }

  const result = data as { success: boolean; error?: string };
  if (!result.success) {
    return NextResponse.json(
      { error: ERROR_MESSAGES[result.error ?? ""] ?? "Не удалось отказаться" },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}
