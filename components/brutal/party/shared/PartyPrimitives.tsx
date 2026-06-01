"use client";

import { useEffect, useState } from "react";
import { PartyTemplateFrame } from "@/components/brutal/party/shared/PartyTemplateFrame";
import { Avatar } from "@/components/brutal/party/shared/Avatar";
import { Meta } from "@/components/brutal/party/shared/Shell";
import { decodePartyAvatar } from "@/lib/party/avatar";
import { captionForFrame } from "@/lib/party/caption-rich/legacy-read";
import { PARTY_DESIGN } from "@/lib/party/design";
import type { CaptionDocument, PartySnapshot, TextBox } from "@/lib/party/types";

function useSecondsRemaining(phaseEndsAt: string | null, totalFallback = 60): number {
  const [seconds, setSeconds] = useState(totalFallback);

  useEffect(() => {
    if (!phaseEndsAt) {
      setSeconds(totalFallback);
      return;
    }
    const endsAt = new Date(phaseEndsAt).getTime();
    if (Number.isNaN(endsAt)) {
      setSeconds(totalFallback);
      return;
    }
    function tick() {
      setSeconds(Math.max(0, Math.ceil(Math.max(0, endsAt - Date.now()) / 1000)));
    }
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [phaseEndsAt, totalFallback]);

  return seconds;
}

export function TimerRing({
  phaseEndsAt,
  total = 60,
  accent = PARTY_DESIGN.accent,
  size = 56,
}: {
  phaseEndsAt?: string | null;
  total?: number;
  accent?: string;
  size?: number;
}) {
  const seconds = useSecondsRemaining(phaseEndsAt ?? null, total);
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, seconds / total));
  const low = seconds <= 10;
  const col = low ? "#FF3B3B" : accent;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={4}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={col}
          strokeWidth={4}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          className="transition-[stroke-dashoffset,stroke] duration-300"
        />
      </svg>
      <div
        className="absolute inset-0 grid place-items-center font-mono font-black"
        style={{ fontSize: size * 0.32, color: col }}
      >
        {seconds}
      </div>
    </div>
  );
}

export function RoundDots({
  current,
  total,
  accent = PARTY_DESIGN.accent,
}: {
  current: number;
  total: number;
  accent?: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => {
        const done = i + 1 < current;
        const active = i + 1 === current;
        return (
          <div
            key={i}
            className="h-2.5 transition-all duration-200"
            style={{
              width: active ? 22 : 10,
              background: done
                ? "rgba(255,255,255,0.35)"
                : active
                  ? accent
                  : "rgba(255,255,255,0.12)",
            }}
          />
        );
      })}
    </div>
  );
}

export function Scoreboard({
  players,
  accent = PARTY_DESIGN.accent,
  compact = false,
}: {
  players: PartySnapshot["players"];
  accent?: string;
  compact?: boolean;
}) {
  const ranked = [...players].sort((a, b) => b.score - a.score);
  const top = ranked[0]?.score ?? 0;

  return (
    <div className={"flex flex-col " + (compact ? "gap-0" : "gap-1.5")}>
      {ranked.map((p, i) => {
        const lead = p.score === top && top > 0;
        const avatar = decodePartyAvatar(p.avatarUrl);
        return (
          <div
            key={p.userId}
            className="flex items-center justify-between gap-3"
            style={{
              padding: lead ? "14px 16px" : compact ? "10px 12px" : "12px 14px",
              border: lead ? `2px solid ${accent}` : "1px solid rgba(255,255,255,0.08)",
              background: lead ? `${accent}12` : "#0a0a0a",
            }}
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <span
                className="text-white/40"
                style={{ fontFamily: "ui-monospace, monospace", fontWeight: 900, fontSize: 12 }}
              >
                #{i + 1}
              </span>
              <Avatar id={avatar.id} color={avatar.color} size={compact ? 24 : 28} />
              <span
                className="truncate text-white"
                style={{ fontWeight: 800, fontSize: compact ? 12 : 13 }}
              >
                {p.isYou ? "you" : `@${p.handle}`}
              </span>
            </div>
            <span
              style={{
                fontFamily: "ui-monospace, monospace",
                fontWeight: 900,
                fontSize: compact ? 14 : 16,
                color: lead ? accent : "#fff",
              }}
            >
              {p.score}
            </span>
          </div>
        );
      })}
    </div>
  );
}

type PartyBtnProps = {
  children: React.ReactNode;
  kind?: "primary" | "ghost" | "pink";
  accent?: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
};

export function PartyBtn({
  children,
  kind = "primary",
  accent = PARTY_DESIGN.accent,
  onClick,
  disabled,
  className = "",
  type = "button",
}: PartyBtnProps) {
  const base =
    "inline-flex w-full items-center justify-center gap-2.5 border-none px-5 py-4 text-xs font-black uppercase tracking-widest transition-all disabled:cursor-not-allowed disabled:opacity-40";
  const kinds = {
    primary: "bg-[var(--btn-accent)] text-black hover:bg-white",
    pink: "bg-[#FF2D87] text-white hover:bg-[var(--btn-accent)] hover:text-black",
    ghost:
      "border border-white/20 bg-transparent text-white/70 hover:border-[var(--btn-accent)] hover:text-[var(--btn-accent)]",
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${base} ${kinds[kind]} ${kind === "ghost" ? "border-solid" : ""} ${className}`}
      style={{ ["--btn-accent" as string]: accent }}
    >
      {children}
    </button>
  );
}

export function HeadCluster({
  currentRound,
  roundCount,
  phaseEndsAt,
  showTimer = true,
  label,
  accent = PARTY_DESIGN.accent,
}: {
  currentRound: number;
  roundCount: number;
  phaseEndsAt?: string | null;
  showTimer?: boolean;
  label?: string;
  accent?: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <div className="text-right">
        {label ? (
          <div className="mb-2">
            <Meta>{label}</Meta>
          </div>
        ) : null}
        <RoundDots current={currentRound} total={roundCount} accent={accent} />
      </div>
      {showTimer && PARTY_DESIGN.showTimer ? (
        <TimerRing phaseEndsAt={phaseEndsAt ?? null} accent={accent} size={58} />
      ) : null}
    </div>
  );
}

export function CountChip({
  ready,
  max = 8,
  accent = PARTY_DESIGN.accent,
}: {
  ready: number;
  max?: number;
  accent?: string;
}) {
  return (
    <div
      className="flex items-center gap-2.5 border px-4 py-2.5"
      style={{ borderColor: accent }}
    >
      <span
        className="font-mono font-black"
        style={{ color: accent, fontSize: 20 }}
      >
        {ready}
      </span>
      <span
        className="whitespace-nowrap text-white/50"
        style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em" }}
      >
        / {max} · READY
      </span>
    </div>
  );
}

export type SubmissionCardProps = {
  submissionId?: string;
  caption: string;
  captionRich?: CaptionDocument | null;
  imageUrl?: string | null;
  textBoxes?: TextBox[];
  authorHandle?: string;
  authorAvatarUrl?: string | null;
  authorIsYou?: boolean;
  voteCount?: number;
  voted?: boolean;
  winner?: boolean;
  revealAuthor?: boolean;
  showVotes?: boolean;
  onVote?: () => void;
  accent?: string;
};

export function SubmissionCard({
  caption,
  captionRich = null,
  imageUrl,
  textBoxes,
  authorHandle,
  authorAvatarUrl,
  authorIsYou,
  voteCount = 0,
  voted = false,
  winner = false,
  revealAuthor = false,
  showVotes = false,
  onVote,
  accent = PARTY_DESIGN.accent,
}: SubmissionCardProps) {
  const avatar = decodePartyAvatar(authorAvatarUrl);
  const interactive = Boolean(onVote);
  const frame = captionForFrame({ caption, captionRich });

  return (
    <div
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onVote}
      onKeyDown={(e) => {
        if (interactive && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onVote?.();
        }
      }}
      className={
        "relative bg-[#0a0a0a] transition-all duration-150 " +
        (interactive ? "cursor-pointer hover:-translate-y-0.5 " : "") +
        (winner || voted ? "border-2" : "border-2 border-white/10 hover:border-[var(--card-accent)]")
      }
      style={{
        borderColor: winner || voted ? accent : undefined,
        ["--card-accent" as string]: accent,
      }}
    >
      <PartyTemplateFrame
        caption={"legacy" in frame ? frame.legacy : caption}
        captionRich={"rich" in frame ? frame.rich : null}
        imageUrl={imageUrl}
        textBoxes={textBoxes}
      />
      <div
        className="flex items-center justify-between gap-2 px-3 py-2"
        style={{
          borderTop: `2px solid ${revealAuthor && authorHandle ? avatar.color : "rgba(255,255,255,0.1)"}`,
        }}
      >
        {revealAuthor && authorHandle ? (
          <div className="flex min-w-0 items-center gap-2">
            <Avatar id={avatar.id} color={avatar.color} size={20} />
            <span className="truncate text-xs font-bold text-white">
              {authorIsYou ? "you" : `@${authorHandle}`}
            </span>
          </div>
        ) : (
          <span
            className="text-white/40"
            style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.15em" }}
          >
            ANONYMOUS
          </span>
        )}
        {showVotes ? (
          <span
            className="shrink-0 font-mono font-black"
            style={{ fontSize: 14, color: winner ? accent : "#fff" }}
          >
            {voteCount}
          </span>
        ) : onVote ? (
          <span
            className="shrink-0 font-black uppercase tracking-widest text-white/50"
            style={{ fontSize: 11 }}
          >
            ♥ VOTE
          </span>
        ) : null}
      </div>
      {winner ? (
        <div
          className="absolute left-2.5 top-2.5 px-2 py-1 font-black uppercase tracking-widest text-black"
          style={{ background: accent, fontSize: 9 }}
        >
          ★ WINNER
        </div>
      ) : null}
    </div>
  );
}
