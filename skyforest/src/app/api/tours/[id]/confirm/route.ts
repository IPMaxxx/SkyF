import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ id: string }> };

const ERROR_MESSAGES: Record<string, string> = {
  forbidden: "Действие запрещено",
  not_participant: "Вы не участвуете в этом туре",
  not_winner: "Подтверждение доступно только победителям",
  expired: "Срок подтверждения истёк",
};

// POST /api/tours/[id]/confirm — winner confirms participation.
export async function POST(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("confirm_tour_participation", {
    p_tour_id: id,
    p_user_id: user.id,
  });

  if (error) {
    console.error("confirm_tour_participation RPC error:", error);
    return NextResponse.json({ error: "Ошибка подтверждения" }, { status: 500 });
  }

  const result = data as { success: boolean; error?: string };
  if (!result.success) {
    return NextResponse.json(
      { error: ERROR_MESSAGES[result.error ?? ""] ?? "Не удалось подтвердить" },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}
