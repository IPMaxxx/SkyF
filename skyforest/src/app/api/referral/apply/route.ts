import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServerClient } from "@supabase/ssr";

export async function POST(request: NextRequest) {
  // Verify the user is authenticated using their session
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

  // Use service_role client to call apply_referral so that auth.role() = 'service_role'
  // inside any nested functions (e.g. add_tokens if the old DB function calls it).
  // User identity is verified above; we pass p_new_user_id explicitly.
  const adminSupabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  const { data, error } = await adminSupabase.rpc("apply_referral", {
    p_code: code,
    p_new_user_id: user.id,
  });

  if (error) {
    console.error("Referral apply error:", error);
    // Unique constraint violation = already linked (race condition)
    if (error.code === "23505") {
      return NextResponse.json({ status: "already_linked" });
    }
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
