import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const COOLDOWN_DAYS = 14;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const confirmationEmail = body.confirmation_email?.trim().toLowerCase();

  if (!confirmationEmail || confirmationEmail !== user.email?.toLowerCase()) {
    return NextResponse.json(
      { error: "Email does not match" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase.rpc("schedule_account_deletion", {
    p_days: COOLDOWN_DAYS,
  });

  if (error) {
    console.error("Failed to schedule deletion:", error);
    return NextResponse.json(
      { error: "Failed to schedule deletion" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    effective_at: data,
    cooldown_days: COOLDOWN_DAYS,
  });
}

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase.rpc("cancel_account_deletion");
  if (error) {
    console.error("Failed to cancel deletion:", error);
    return NextResponse.json(
      { error: "Failed to cancel deletion" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("deletion_scheduled_at, deletion_effective_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch status" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    scheduled_at: data?.deletion_scheduled_at ?? null,
    effective_at: data?.deletion_effective_at ?? null,
    cooldown_days: COOLDOWN_DAYS,
  });
}
