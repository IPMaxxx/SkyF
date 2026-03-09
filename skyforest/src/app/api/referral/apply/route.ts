import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const code = body.code?.trim();

  if (!code) {
    return NextResponse.json({ error: "No code provided" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("apply_referral", {
    p_code: code,
    p_new_user_id: user.id,
  });

  if (error) {
    console.error("Referral apply error:", error);
    return NextResponse.json({ error: "Processing error" }, { status: 500 });
  }

  const result = data as { success: boolean; error?: string };

  if (!result.success) {
    const statusMap: Record<string, string> = {
      invalid_code: "not_found",
      self_referral: "self_referral",
      already_linked: "already_linked",
    };
    return NextResponse.json({
      status: statusMap[result.error ?? ""] ?? "error",
    });
  }

  return NextResponse.json({ status: "linked" });
}
