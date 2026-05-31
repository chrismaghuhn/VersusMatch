"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  CheckIcon,
  CopyIcon,
  OPTION_COLORS,
  ShareIcon,
  VsSlider,
} from "@/components/battle-vote-ui";
import { isTurnstileEnabled } from "@/lib/turnstile-config";
import type { BattleOption, BattleResult, BattleWithOptions } from "@/lib/database.types";
import { castVote, getOrCreateVoterToken } from "@/lib/votes";
import { formatPercent, getPublicImageUrl } from "@/lib/utils";
import { parseJsonResponse } from "@/lib/parse-json-response";
import {
  buildBattleShareText,
  buildVoteShareText,
  buildVoteShareTextStyle2,
  telegramShareUrl,
  twitterShareUrl,
  whatsAppShareUrl,
} from "@/lib/share-links";
import { hasShareCardStyle2 } from "@/lib/rewards/tiers";
import { EmbedCodeCopyButton } from "@/components/embed-code-copy-button";
import {
  PostVoteRewardsBanner,
  type VoteGrantResult,
} from "@/components/post-vote-rewards-banner";
import type { DramaKind } from "@/lib/rewards/drama";

const TurnstileWidget = dynamic(
  () => import("@/components/turnstile-widget").then((mod) => ({ default: mod.TurnstileWidget })),
  { ssr: false }
);

const BattleReportButton = dynamic(
  () =>
    import("@/components/battle-report-button").then((mod) => ({
      default: mod.BattleReportButton,
    })),
  { ssr: false, loading: () => null }
);

const GRID_ID = "battle-vote-grid";

type BattleVoteControlsProps = {
  battle: BattleWithOptions;
  initialResults: BattleResult[];
  shareUrl: string;
  embed?: boolean;
};

export function BattleVoteControls({
  battle,
  initialResults,
  shareUrl,
  embed = false,
}: BattleVoteControlsProps) {
  const [results, setResults] = useState(initialResults);
  const [hasVoted, setHasVoted] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [sharePromptDismissed, setSharePromptDismissed] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userTier, setUserTier] = useState<number | null>(null);
  const [postVoteDrama, setPostVoteDrama] = useState<{
    kind: DramaKind;
    message: string;
  } | null>(null);
  const [voteGrantResult, setVoteGrantResult] = useState<VoteGrantResult | null>(null);
  const pathname = usePathname();
  const turnstileRequired = isTurnstileEnabled() && !embed;

  const options = useMemo(
    () => [...battle.battle_options].sort((a, b) => a.position - b.position),
    [battle.battle_options]
  );

  const totalVotes = results.reduce((sum, row) => sum + row.vote_count, 0);
  const resultA = results.find((row) => row.option_id === options[0]?.id);
  const aPct = formatPercent(resultA?.vote_count ?? 0, totalVotes);
  const votedSideLabel =
    options.find((option) => option.id === selectedOptionId)?.label ?? "my pick";
  const otherSideLabel =
    options.find((option) => option.id !== selectedOptionId)?.label ?? "the other side";
  const effectiveTier = voteGrantResult?.tier ?? userTier ?? 0;
  const useStyle2Share = !embed && isLoggedIn && hasVoted && hasShareCardStyle2(effectiveTier);
  const voteShareText = useStyle2Share
    ? buildVoteShareTextStyle2(battle.title, votedSideLabel, otherSideLabel, shareUrl)
    : buildVoteShareText(battle.title, votedSideLabel, shareUrl);
  const genericShareText = buildBattleShareText(
    battle.title,
    options[0]?.label ?? "Option A",
    options[1]?.label ?? "Option B",
    shareUrl
  );
  const shareText = hasVoted ? voteShareText : genericShareText;

  const refreshResults = useCallback(async () => {
    try {
      const response = await fetch(`/api/battle/${battle.id}/results`);
      const data = await parseJsonResponse<BattleResult[]>(response);

      if (response.ok && Array.isArray(data)) {
        setResults([...data].sort((a, b) => a.position - b.position));
      }
    } catch {
      // Polling failure — keep last known results
    }
  }, [battle.id]);

  const handleVote = useCallback(
    async (optionId: string) => {
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
      if (!embed && response.drama) {
        setPostVoteDrama(response.drama);
        setVoteGrantResult(response.rewards ?? null);
      }
      await refreshResults();
      setIsSubmitting(false);
    },
    [
      battle.id,
      embed,
      hasVoted,
      isSubmitting,
      refreshResults,
      turnstileRequired,
      turnstileToken,
    ]
  );

  useEffect(() => {
    if (embed) return;

    fetch("/api/me")
      .then((res) => res.json())
      .then((data: { user: { id: string } | null }) => setIsLoggedIn(!!data.user))
      .catch(() => setIsLoggedIn(false));
  }, [embed]);

  useEffect(() => {
    if (embed || !isLoggedIn) return;

    fetch("/api/rewards/me")
      .then((res) => parseJsonResponse<{ tier: number }>(res))
      .then((data) => {
        if (data && "tier" in data) setUserTier(data.tier);
      })
      .catch(() => setUserTier(null));
  }, [embed, isLoggedIn, voteGrantResult?.tier]);

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

  useEffect(() => {
    const grid = document.getElementById(GRID_ID);
    if (!grid) return;

    if (hasVoted) {
      grid.hidden = true;
      return;
    }

    function onGridClick(event: MouseEvent) {
      const side = (event.target as HTMLElement).closest("[data-vote-side]");
      const optionId = side?.getAttribute("data-vote-side");
      if (optionId) {
        void handleVote(optionId);
      }
    }

    grid.hidden = false;
    grid.classList.add("cursor-pointer");
    grid.addEventListener("click", onGridClick);

    return () => {
      grid.classList.remove("cursor-pointer");
      grid.removeEventListener("click", onGridClick);
    };
  }, [hasVoted, handleVote]);

  async function handleCopy() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShare() {
    if (navigator.share) {
      await navigator.share({
        title: battle.title,
        text: hasVoted ? voteShareText : `${options[0]?.label} vs ${options[1]?.label}`,
        url: shareUrl,
      });
      return;
    }

    await handleCopy();
  }

  function renderInteractiveSide(option: BattleOption, index: number) {
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
      <BattleSideInteractive
        key={option.id}
        title={option.label}
        img={getPublicImageUrl(option.image_path)}
        color={color}
        votes={result?.vote_count ?? 0}
        pct={pct}
        picked={picked}
        otherPicked={otherPicked}
        leading={leading}
        priority={index === 0}
      />
    );
  }

  return (
    <>
      {hasVoted && (
        <div
          className="relative grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto_1fr] md:items-stretch"
          aria-live="polite"
        >
          {options[0] && renderInteractiveSide(options[0], 0)}
          <VsSlider aPct={aPct} totalVotes={totalVotes} />
          {options[1] && renderInteractiveSide(options[1], 1)}
        </div>
      )}

      {!hasVoted && turnstileRequired && (
        <div className="mb-6 mx-auto max-w-sm mt-6">
          <TurnstileWidget onToken={setTurnstileToken} />
        </div>
      )}

      {hasVoted && !embed && postVoteDrama && (
        <PostVoteRewardsBanner
          drama={postVoteDrama}
          isLoggedIn={isLoggedIn}
          returnTo={pathname}
          grantResult={voteGrantResult}
        />
      )}

      {hasVoted && !sharePromptDismissed && (
        useStyle2Share ? (
          <div className="relative mt-6 overflow-hidden border-2 border-[#FF2D87] bg-gradient-to-br from-[#FF2D87]/20 via-black to-[#CCFF00]/10 px-6 py-5">
            <div
              className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rotate-12 bg-[#CCFF00]/15"
              aria-hidden
            />
            <div className="relative flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p
                  className="text-[#FF2D87]"
                  style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.18em" }}
                >
                  FLEX YOUR PICK
                </p>
                <p
                  className="mt-2 text-white"
                  style={{ fontWeight: 900, fontSize: 20, letterSpacing: "-0.03em", lineHeight: 1.15 }}
                >
                  {battle.title}
                </p>
                <p className="mt-2 text-[#CCFF00]" style={{ fontSize: 16, fontWeight: 800 }}>
                  Team {votedSideLabel}
                  <span className="text-white/50" style={{ fontWeight: 600 }}>
                    {" "}
                    vs {otherSideLabel}
                  </span>
                </p>
                <p
                  className="mt-3 border-l-2 border-[#CCFF00]/60 pl-3 text-white/70 italic"
                  style={{ fontSize: 13, lineHeight: 1.5 }}
                >
                  {voteShareText}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSharePromptDismissed(true)}
                className="text-sm text-white/40 underline underline-offset-4 hover:text-white"
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6 border border-[#CCFF00]/30 bg-[#CCFF00]/5 px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p
                  className="text-[#CCFF00]"
                  style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.15em" }}
                >
                  SHARE YOUR PICK
                </p>
                <p className="mt-1 text-white" style={{ fontSize: 14 }}>
                  You voted for <strong>{votedSideLabel}</strong> — rally your group chat.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSharePromptDismissed(true)}
                className="text-sm text-white/40 underline underline-offset-4 hover:text-white"
              >
                Dismiss
              </button>
            </div>
          </div>
        )
      )}

      {error && (
        <p className="mt-6 border border-[#FF2D87]/40 bg-[#FF2D87]/10 px-4 py-3 text-center text-sm text-[#FF2D87]">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6">
        <p className="text-white/40" style={{ fontSize: 12 }}>
          Live results · updates every 8s
          {hasVoted ? " · Thanks for voting!" : null}
        </p>
        {!embed ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={handleCopy} className="gap-2">
              {copied ? <CheckIcon /> : <CopyIcon />}
              {copied ? "Copied!" : "Copy link"}
            </Button>
            <EmbedCodeCopyButton slug={battle.slug} />
            <Button onClick={handleShare} className="gap-2">
              <ShareIcon />
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em" }}>
                SHARE
              </span>
            </Button>
            <Button variant="outline" asChild>
              <a href={whatsAppShareUrl(shareText)} target="_blank" rel="noopener noreferrer">
                WhatsApp
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a
                href={twitterShareUrl(shareText, shareUrl)}
                target="_blank"
                rel="noopener noreferrer"
              >
                X
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a
                href={telegramShareUrl(shareText, shareUrl)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Telegram
              </a>
            </Button>
          </div>
        ) : null}
      </div>

      {!embed ? <BattleReportButton battleId={battle.id} /> : null}
    </>
  );
}

function BattleSideInteractive({
  title,
  img,
  color,
  votes,
  pct,
  picked,
  otherPicked,
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
  leading: boolean;
  priority?: boolean;
}) {
  return (
    <div
      className="relative overflow-hidden border border-white/10 bg-black text-left"
      style={{ opacity: otherPicked ? 0.45 : 1 }}
    >
      <div className="relative aspect-[16/11] w-full overflow-hidden">
        {img ? (
          <Image
            src={img}
            alt={title}
            fill
            priority={priority}
            fetchPriority={priority ? "high" : "auto"}
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 40vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-[#141414] p-6 text-center text-2xl font-black text-white">
            {title}
          </div>
        )}
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
          {leading && (
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
            <svg width="16" height="16" viewBox="0 0 14 14" fill="none" aria-hidden>
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
      </div>
    </div>
  );
}
