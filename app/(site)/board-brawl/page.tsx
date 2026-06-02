import type { Metadata } from "next";
import { Suspense } from "react";
import { BoardBrawlPageClient } from "@/components/brutal/board-brawl/board-brawl-page-client";
import { BB_COPY } from "@/lib/board-brawl/copy";

export const metadata: Metadata = {
  title: "Board Brawl · MemeFight",
  description: "3D party board game on MemeFight.",
};

export default function BoardBrawlPage() {
  if (process.env.BOARD_BRAWL_ENABLED !== "true") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center bg-black px-6 text-center text-white">
        <p className="text-[#CCFF00]" style={{ fontWeight: 900, fontSize: 14, letterSpacing: "0.2em" }}>
          COMING SOON
        </p>
        <p className="mt-3 max-w-md text-white/50" style={{ fontSize: 15 }}>
          {BB_COPY.comingSoon}
        </p>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-lg px-6 py-16 text-white">
          <div className="h-10 w-48 animate-pulse bg-white/10" />
        </div>
      }
    >
      <BoardBrawlPageClient />
    </Suspense>
  );
}
