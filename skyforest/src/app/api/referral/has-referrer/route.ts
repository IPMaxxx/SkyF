import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ has_referrer: false });
  }

  const { data } = await supabase.rpc("has_referrer", {
    p_user_id: user.id,
  });

  return NextResponse.json({ has_referrer: !!data });
}
