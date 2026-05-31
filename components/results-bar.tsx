"use client";

import { cn, formatPercent } from "@/lib/utils";
import type { BattleResult } from "@/lib/database.types";

type ResultsBarProps = {
  results: BattleResult[];
  highlightOptionId?: string | null;
};

export function ResultsBar({ results, highlightOptionId }: ResultsBarProps) {
  const total = results.reduce((sum, row) => sum + row.vote_count, 0);

  return (
    <div className="space-y-4">
      {results.map((result) => {
        const percent = formatPercent(result.vote_count, total);
        const isHighlighted = highlightOptionId === result.option_id;

        return (
          <div key={result.option_id} className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className={cn("font-medium", isHighlighted && "text-primary")}>
                {result.label}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {percent}% · {result.vote_count}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-secondary">
              <div
                className={cn(
                  "h-full rounded-full bg-primary transition-all duration-700 ease-out",
                  isHighlighted && "bg-primary"
                )}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      })}
      <p className="text-center text-xs text-muted-foreground">{total} Stimmen insgesamt</p>
    </div>
  );
}
