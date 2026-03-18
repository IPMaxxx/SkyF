import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIP(request);

  if (ip === "unknown") {
    return NextResponse.json({ success: true, ip: "unknown" });
  }

  const { data, error } = await supabase.rpc("log_signup_ip", {
    p_user_id: user.id,
    p_ip_address: ip,
  });

  if (error) {
    console.error("Log signup IP error:", error);
    return NextResponse.json({ error: "Failed to log IP" }, { status: 500 });
  }

  return NextResponse.json(data);
}
