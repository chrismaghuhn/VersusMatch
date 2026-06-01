import { NextResponse } from "next/server";
import { isPartyEnabled } from "@/lib/party/enabled";
import { createClient } from "@/lib/supabase/server";

export async function requirePartyApi() {
  if (!isPartyEnabled()) {
    return { error: NextResponse.json({ error: "Not available" }, { status: 503 }) } as const;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  }

  return { supabase, user } as const;
}
