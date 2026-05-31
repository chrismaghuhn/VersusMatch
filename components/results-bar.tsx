"use client";

import { cn, formatPercent } from "@/lib/utils";
import type { BattleResult } from "@/lib/database.types";

const OPTION_COLORS = ["#CCFF00", "#FF2D87"] as const;

type ResultsBarProps = {
  results: BattleResult[];
  highlightOptionId?: string | null;
};

export function ResultsBar({ results, highlightOptionId }: ResultsBarProps) {
  const total = results.reduce((sum, row) => sum + row.vote_count, 0);

  return (
    <div className="space-y-4">
      {results.map((result, index) => {
        const percent = formatPercent(result.vote_count, total);
        const isHighlighted = highlightOptionId === result.option_id;
        const color = OPTION_COLORS[index] ?? OPTION_COLORS[0];

        return (
          <div key={result.option_id} className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span
                className={cn("font-bold text-white", isHighlighted && "text-[#CCFF00]")}
              >
                {result.label}
              </span>
              <span className="tabular-nums text-white/50">
                {percent}% · {result.vote_count}
              </span>
            </div>
            <div className="h-2 overflow-hidden bg-white/10">
              <div
                className="h-full transition-all duration-700 ease-out"
                style={{ width: `${percent}%`, background: color }}
              />
            </div>
          </div>
        );
      })}
      <p className="text-center text-xs text-white/40">{total} votes total</p>
    </div>
  );
}
