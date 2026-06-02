import { NextResponse } from "next/server";
import { isBoardBrawlEnabled } from "@/lib/board-brawl/enabled";
import { createClient } from "@/lib/supabase/server";

export async function requireBoardBrawlApi() {
  if (!isBoardBrawlEnabled()) {
    return { error: NextResponse.json({ error: "not_available" }, { status: 503 }) } as const;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) } as const;
  }

  return { supabase, user } as const;
}
