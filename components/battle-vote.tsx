"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ResultsBar } from "@/components/results-bar";
import { createClient } from "@/lib/supabase/client";
import { getBattleResultsRpc } from "@/lib/supabase/rpc";
import type { BattleResult, BattleWithOptions } from "@/lib/database.types";
import { castVote, getOrCreateVoterToken } from "@/lib/votes";
import { getPublicImageUrl } from "@/lib/utils";
import { Check, Copy, Share2 } from "lucide-react";

type BattleVoteProps = {
  battle: BattleWithOptions;
  initialResults: BattleResult[];
  shareUrl: string;
};

export function BattleVote({ battle, initialResults, shareUrl }: BattleVoteProps) {
  const [results, setResults] = useState(initialResults);
  const [hasVoted, setHasVoted] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const options = useMemo(
    () => [...battle.battle_options].sort((a, b) => a.position - b.position),
    [battle.battle_options]
  );

  const refreshResults = useCallback(async () => {
    const supabase = createClient();
    const { data } = await getBattleResultsRpc(supabase, battle.id);

    if (data) {
      setResults([...data].sort((a, b) => a.position - b.position));
    }
  }, [battle.id]);

  useEffect(() => {
    function pollIfVisible() {
      if (document.visibilityState === "visible") {
        void refreshResults();
      }
    }

    pollIfVisible();
    const intervalId = window.setInterval(pollIfVisible, 4000);

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void refreshResults();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshResults]);

  async function handleVote(optionId: string) {
    if (hasVoted || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    const voterToken = getOrCreateVoterToken();
    const response = await castVote(battle.id, optionId, voterToken);

    if (!response.success) {
      if (response.alreadyVoted) {
        setHasVoted(true);
        await refreshResults();
      } else {
        setError(response.error ?? "Vote fehlgeschlagen");
      }
      setIsSubmitting(false);
      return;
    }

    setSelectedOptionId(optionId);
    setHasVoted(true);
    await refreshResults();
    setIsSubmitting(false);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShare() {
    if (navigator.share) {
      await navigator.share({
        title: battle.title,
        text: `${options[0]?.label} vs ${options[1]?.label}`,
        url: shareUrl,
      });
      return;
    }

    await handleCopy();
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{battle.title}</h1>
        <p className="mt-2 text-muted-foreground">
          {hasVoted ? "Danke für deinen Vote!" : "Wähle deine Option"}
        </p>
      </div>

      {!hasVoted ? (
        <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-stretch">
          {options.map((option, index) => {
            const imageUrl = getPublicImageUrl(option.image_path);

            return (
              <div key={option.id} className="contents">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleVote(option.id)}
                  className="group relative overflow-hidden rounded-2xl border-2 border-border bg-card text-left shadow-sm transition hover:border-primary hover:shadow-md disabled:opacity-60"
                >
                  <div className="relative aspect-square bg-secondary sm:aspect-[4/5]">
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={option.label}
                        fill
                        className="object-cover transition-transform group-hover:scale-[1.03]"
                        sizes="(max-width: 768px) 100vw, 40vw"
                        priority={index === 0}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center p-6 text-center text-2xl font-semibold">
                        {option.label}
                      </div>
                    )}
                  </div>
                  {imageUrl && (
                    <div className="border-t border-border p-4 text-center text-lg font-semibold">
                      {option.label}
                    </div>
                  )}
                </button>
                {index === 0 && (
                  <div className="flex items-center justify-center">
                    <span className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
                      VS
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-6 shadow-sm">
          <ResultsBar results={results} highlightOptionId={selectedOptionId} />
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-destructive/10 px-4 py-3 text-center text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button variant="outline" onClick={handleCopy} className="gap-2">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Kopiert!" : "Link kopieren"}
        </Button>
        <Button onClick={handleShare} className="gap-2">
          <Share2 className="h-4 w-4" />
          Teilen
        </Button>
      </div>
    </div>
  );
}
