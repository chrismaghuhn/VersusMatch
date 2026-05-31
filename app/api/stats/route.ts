import { NextResponse } from "next/server";
import { getSiteStats } from "@/lib/stats";
import { captureServerError } from "@/lib/observability";

export async function GET() {
  try {
    const stats = await getSiteStats();

    return NextResponse.json(stats, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    captureServerError("stats", error);
    return NextResponse.json(
      { activeBattles: 0, totalVotes: 0, votesLast24h: 0 },
      { status: 500 }
    );
  }
}
