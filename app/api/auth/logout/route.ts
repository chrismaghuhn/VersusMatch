import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAppUrl } from "@/lib/utils";

export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(getAppUrl("/"), { status: 303 });
}
