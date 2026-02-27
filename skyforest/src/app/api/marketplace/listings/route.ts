import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_marketplace_listings");

  if (error) {
    console.error("Marketplace listings error:", error);
    return NextResponse.json({ error: "Ошибка загрузки" }, { status: 500 });
  }

  return NextResponse.json({ listings: data ?? [] });
}
