import { NextResponse } from "next/server";
import { getBattleResults } from "@/lib/battles";
import { createPublicClient } from "@/lib/supabase/public";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid battle ID" }, { status: 400 });
  }

  const supabase = createPublicClient();
  const results = await getBattleResults(supabase, id);

  return NextResponse.json(results, {
    headers: { "Cache-Control": "no-store" },
  });
}
