import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServerClient } from "@supabase/ssr";

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

  const admin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  );

  const { error: insertError } = await admin
    .from("deleted_accounts")
    .insert({
      original_user_id: user.id,
      email: user.email!.toLowerCase(),
    });

  if (insertError) {
    console.error("Failed to record deleted account:", insertError);
    return NextResponse.json(
      { error: "Failed to process deletion" },
      { status: 500 },
    );
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);

  if (deleteError) {
    console.error("Failed to delete auth user:", deleteError);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
