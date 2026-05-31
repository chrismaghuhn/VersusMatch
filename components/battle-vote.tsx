"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Share2, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BattleReportButton } from "@/components/battle-report-button";
import { BattleImage } from "@/components/battle-image";
import { Noise } from "@/components/brutal/noise";
import { createClient } from "@/lib/supabase/client";
import { getBattleResultsRpc } from "@/lib/supabase/rpc";
import { isTurnstileEnabled } from "@/lib/turnstile-config";
import type { BattleOption, BattleResult, BattleWithOptions } from "@/lib/database.types";
import { castVote, getOrCreateVoterToken } from "@/lib/votes";
import { formatPercent, getPublicImageUrl } from "@/lib/utils";

const TurnstileWidget = dynamic(
  () => import("@/components/turnstile-widget").then((mod) => ({ default: mod.TurnstileWidget })),
  { ssr: false }
);

const OPTION_COLORS = ["#CCFF00", "#FF2D87"] as const;
const PINK = "#FF2D87";
const GREEN = "#CCFF00";

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
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRequired = isTurnstileEnabled();

  const options = useMemo(
    () => [...battle.battle_options].sort((a, b) => a.position - b.position),
    [battle.battle_options]
  );

  const totalVotes = results.reduce((sum, row) => sum + row.vote_count, 0);

  const resultA = results.find((row) => row.option_id === options[0]?.id);
  const aPct = formatPercent(resultA?.vote_count ?? 0, totalVotes);

  const refreshResults = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data } = await getBattleResultsRpc(supabase, battle.id);

      if (data) {
        setResults([...data].sort((a, b) => a.position - b.position));
      }
    } catch {
      // Polling failure — keep last known results
    }
  }, [battle.id]);

  useEffect(() => {
    let intervalId: number | undefined;

    function pollIfVisible() {
      if (document.visibilityState === "visible") {
        void refreshResults();
      }
    }

    function startPolling() {
      pollIfVisible();
      intervalId = window.setInterval(pollIfVisible, 8000);
    }

    const delayId = window.setTimeout(startPolling, 2000);

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void refreshResults();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearTimeout(delayId);
      if (intervalId) window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshResults]);

  async function handleVote(optionId: string) {
    if (hasVoted || isSubmitting) return;

    if (turnstileRequired && !turnstileToken) {
      setError("Please complete the captcha.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const voterToken = getOrCreateVoterToken();
    const response = await castVote(
      battle.id,
      optionId,
      voterToken,
      turnstileToken || undefined
    );

    if (!response.success) {
      if (response.alreadyVoted) {
        setHasVoted(true);
        await refreshResults();
      } else {
        setError(response.error ?? "Vote failed");
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

  function renderSide(option: BattleOption, index: number) {
    const result = results.find((row) => row.option_id === option.id);
    const pct = formatPercent(result?.vote_count ?? 0, totalVotes);
    const color = OPTION_COLORS[index] ?? OPTION_COLORS[0];
    const otherOptionId = options.find((item) => item.id !== option.id)?.id;
    const otherPicked = hasVoted && selectedOptionId === otherOptionId;
    const picked = hasVoted && selectedOptionId === option.id;
    const leading =
      hasVoted &&
      (result?.vote_count ?? 0) >
        (results.find((row) => row.option_id !== option.id)?.vote_count ?? 0);

    return (
      <BattleSide
        key={option.id}
        title={option.label}
        img={getPublicImageUrl(option.image_path)}
        color={color}
        votes={result?.vote_count ?? 0}
        pct={pct}
        picked={picked}
        otherPicked={otherPicked}
        voted={hasVoted}
        disabled={isSubmitting}
        onClick={() => handleVote(option.id)}
        leading={leading}
        priority={index === 0}
      />
    );
  }

  return (
    <section className="relative overflow-hidden border-b border-white/10 bg-[#0a0a0a]">
      <Noise opacity={0.06} />
      <div className="relative z-10 mx-auto max-w-[1440px] px-4 py-12 sm:px-6 sm:py-20">
        <div className="mb-10 grid grid-cols-12 items-end gap-6">
          <div className="col-span-12 md:col-span-8">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex items-center gap-2 bg-[#FF2D87] px-2.5 py-1 text-white">
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.18em" }}>
                  LIVE BATTLE
                </span>
              </div>
            </div>
            <h1
              className="text-white"
              style={{
                fontWeight: 900,
                fontSize: "clamp(28px, 5vw, 56px)",
                letterSpacing: "-0.045em",
                lineHeight: 0.92,
              }}
            >
              {battle.title}
            </h1>
            <p className="mt-3 text-white/50" style={{ fontSize: 14 }}>
              {hasVoted ? "Thanks for voting!" : "Pick your side — tap to commit."}
            </p>
          </div>
          <div className="col-span-12 grid grid-cols-2 gap-4 md:col-span-4 md:grid-cols-1">
            <Stat label="VOTES" value={totalVotes.toLocaleString("en-US")} />
            <Stat label="OPTIONS" value="2" />
          </div>
        </div>

        {!hasVoted && turnstileRequired && (
          <div className="mb-6 mx-auto max-w-sm">
            <TurnstileWidget onToken={setTurnstileToken} />
          </div>
        )}

        <div className="relative grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto_1fr] md:items-stretch">
          {options[0] && renderSide(options[0], 0)}
          <VsSlider aPct={aPct} totalVotes={totalVotes} />
          {options[1] && renderSide(options[1], 1)}
        </div>

        {error && (
          <p className="mt-6 border border-[#FF2D87]/40 bg-[#FF2D87]/10 px-4 py-3 text-center text-sm text-[#FF2D87]">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6">
          <p className="text-white/40" style={{ fontSize: 12 }}>
            Live results · updates every 8s
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={handleCopy} className="gap-2">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied!" : "Copy link"}
            </Button>
            <Button onClick={handleShare} className="gap-2">
              <Share2 className="h-3.5 w-3.5" />
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em" }}>
                SHARE THIS FIGHT
              </span>
            </Button>
          </div>
        </div>

        <BattleReportButton battleId={battle.id} />
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/10 px-3 py-2">
      <div
        className="text-white/40"
        style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.18em" }}
      >
        {label}
      </div>
      <div
        className="mt-0.5 text-white"
        style={{ fontWeight: 900, fontSize: 20, letterSpacing: "-0.03em", lineHeight: 1.1 }}
      >
        {value}
      </div>
    </div>
  );
}

function VsSlider({
  aPct,
  totalVotes,
}: {
  aPct: number;
  totalVotes: number;
}) {
  // Grün (Option A) = unten/links — VS wandert Richtung führende Seite
  const splitPercent = totalVotes === 0 ? 50 : aPct;
  const pinkPercent = 100 - splitPercent;

  return (
    <>
      {/* Desktop: vertical slider between columns */}
      <div className="relative hidden min-h-[320px] w-16 self-stretch md:block">
        <div className="absolute inset-y-4 left-1/2 w-0.5 -translate-x-1/2 overflow-hidden rounded-full">
          <div
            className="absolute inset-x-0 top-0 transition-[height] duration-700 ease-out"
            style={{ height: `${pinkPercent}%`, background: `${PINK}80` }}
          />
          <div
            className="absolute inset-x-0 bottom-0 transition-[height] duration-700 ease-out"
            style={{ height: `${splitPercent}%`, background: `${GREEN}80` }}
          />
        </div>
        <VsBadge
          className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 transition-[top] duration-700 ease-out"
          style={{ top: `${splitPercent}%` }}
        />
      </div>

      {/* Mobile: horizontal slider between stacked cards */}
      <div className="relative h-16 w-full md:hidden">
        <div className="absolute inset-x-4 top-1/2 h-0.5 -translate-y-1/2 overflow-hidden rounded-full">
          <div
            className="absolute inset-y-0 left-0 transition-[width] duration-700 ease-out"
            style={{ width: `${splitPercent}%`, background: `${GREEN}80` }}
          />
          <div
            className="absolute inset-y-0 right-0 transition-[width] duration-700 ease-out"
            style={{ width: `${pinkPercent}%`, background: `${PINK}80` }}
          />
        </div>
        <VsBadge
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-[left] duration-700 ease-out"
          style={{ left: `${splitPercent}%` }}
        />
      </div>
    </>
  );
}

function VsBadge({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={`relative flex h-20 w-20 items-center justify-center bg-black ${className ?? ""}`} style={style}>
      <span className="text-white" style={{ fontWeight: 900, fontSize: 18, letterSpacing: "0.08em" }}>
        VS
      </span>
      <div className="absolute -inset-px border border-[#CCFF00]/40" />
      <div className="absolute -inset-3 border border-white/10" />
      <div className="absolute -right-2 -top-2 h-3 w-3 rotate-45 bg-[#FF2D87]" />
      <div className="absolute -bottom-2 -left-2 h-3 w-3 rotate-45 bg-[#CCFF00]" />
    </div>
  );
}

function BattleSide({
  title,
  img,
  color,
  votes,
  pct,
  picked,
  otherPicked,
  voted,
  disabled,
  onClick,
  leading,
  priority,
}: {
  title: string;
  img: string | null;
  color: string;
  votes: number;
  pct: number;
  picked: boolean;
  otherPicked: boolean;
  voted: boolean;
  disabled: boolean;
  onClick: () => void;
  leading: boolean;
  priority?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={voted || disabled}
      className="group relative overflow-hidden border border-white/10 bg-black text-left transition hover:border-white/30 disabled:cursor-default"
      style={{ opacity: otherPicked ? 0.45 : 1 }}
    >
      <div className="relative aspect-[16/11] w-full overflow-hidden">
        <BattleImage
          src={img}
          alt={title}
          priority={priority}
          className="transition duration-700 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 40vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute left-5 top-5 flex items-center gap-2">
          <div className="px-2 py-1" style={{ background: color }}>
            <span
              className="text-black"
              style={{ fontWeight: 800, fontSize: 10, letterSpacing: "0.18em" }}
            >
              {title.toUpperCase()}
            </span>
          </div>
          {leading && voted && (
            <div
              className="-rotate-3 border border-black bg-white px-2 py-1 text-black"
              style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.12em" }}
            >
              ★ LEADING
            </div>
          )}
        </div>
        {picked && (
          <div
            className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center shadow-xl"
            style={{ background: color }}
          >
            <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
              <path
                d="M2 7L6 11L12 3"
                stroke="black"
                strokeWidth="2.5"
                strokeLinecap="square"
              />
            </svg>
          </div>
        )}
      </div>

      <div className="p-6">
        <h3
          className="text-white"
          style={{ fontWeight: 900, fontSize: 28, letterSpacing: "-0.035em", lineHeight: 1 }}
        >
          {title}
        </h3>

        {voted ? (
          <div className="mt-5">
            <div className="flex items-baseline justify-between">
              <span
                className="text-white"
                style={{ fontWeight: 900, fontSize: 56, letterSpacing: "-0.05em", lineHeight: 1 }}
              >
                {pct}
                <span style={{ fontSize: 26, color }}>%</span>
              </span>
              <span className="text-white/40" style={{ fontSize: 13 }}>
                {votes.toLocaleString("en-US")} votes
              </span>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden bg-white/10">
              <div
                className="h-full transition-all duration-1000"
                style={{ width: `${pct}%`, background: color }}
              />
            </div>
          </div>
        ) : (
          <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-5">
            <span
              className="text-white/50"
              style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.15em" }}
            >
              TAP TO COMMIT
            </span>
            <span
              className="flex h-7 w-7 items-center justify-center transition group-hover:translate-x-1"
              style={{ background: color, color: "#000" }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6h8M6 2l4 4-4 4" stroke="black" strokeWidth="2" />
              </svg>
            </span>
          </div>
        )}
      </div>
    </button>
  );
}
