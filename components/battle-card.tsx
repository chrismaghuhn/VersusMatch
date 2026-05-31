"use client";

import Link from "next/link";
import { Clock, Flame, Users } from "lucide-react";
import { BattleImage } from "@/components/battle-image";
import type { FeedBattle } from "@/lib/database.types";
import { getCategoryLabel } from "@/lib/categories";
import { formatPercent, getPublicImageUrl } from "@/lib/utils";

type BattleCardProps = {
  battle: FeedBattle;
};

const OPTION_COLORS = ["#CCFF00", "#FF2D87"] as const;

export function BattleCard({ battle }: BattleCardProps) {
  const optionA = battle.battle_options[0];
  const optionB = battle.battle_options[1];
  const imageA = getPublicImageUrl(optionA?.image_path);
  const imageB = getPublicImageUrl(optionB?.image_path);
  const resultA = battle.results.find((row) => row.option_id === optionA?.id);
  const resultB = battle.results.find((row) => row.option_id === optionB?.id);
  const aPct = formatPercent(resultA?.vote_count ?? 0, battle.total_votes);
  const bPct = formatPercent(resultB?.vote_count ?? 0, battle.total_votes);
  const isHot = battle.total_votes >= 10;

  return (
    <Link
      href={`/b/${battle.slug}`}
      className="group relative block border border-white/10 bg-[#0a0a0a] transition hover:-translate-y-1 hover:border-white/30 hover:shadow-2xl"
    >
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span
            className="text-white/40"
            style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em" }}
          >
            #{getCategoryLabel(battle.category).toUpperCase()}
          </span>
          {isHot && (
            <span
              className="flex items-center gap-1 bg-[#FF2D87] px-1.5 py-0.5 text-white"
              style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.1em" }}
            >
              <Flame className="h-2.5 w-2.5 fill-white" /> HOT
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-white/40" style={{ fontSize: 10 }}>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {battle.total_votes >= 1000
              ? `${(battle.total_votes / 1000).toFixed(1)}k`
              : battle.total_votes}
          </span>
        </div>
      </div>

      <div className="relative grid grid-cols-2">
        <CardSide
          img={imageA}
          label={optionA?.label ?? "A"}
          pct={aPct}
          color={OPTION_COLORS[0]}
          leading={aPct >= bPct}
        />
        <CardSide
          img={imageB}
          label={optionB?.label ?? "B"}
          pct={bPct}
          color={OPTION_COLORS[1]}
          leading={bPct > aPct}
        />
        <div className="absolute left-1/2 top-1/2 z-10 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center bg-black">
          <span className="text-white" style={{ fontWeight: 900, fontSize: 12, letterSpacing: "0.05em" }}>
            VS
          </span>
          <div className="absolute -inset-px border border-white/30" />
        </div>
      </div>

      <div className="border-t border-white/10 px-4 py-4">
        <p
          className="line-clamp-2 text-white"
          style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.3, letterSpacing: "-0.01em" }}
        >
          {battle.title}
        </p>
        <div className="mt-3 flex items-center justify-between">
          <span className="flex items-center gap-1 text-white/40" style={{ fontSize: 11 }}>
            <Clock className="h-3 w-3" />
            Live
          </span>
          <span
            className="text-[#CCFF00] opacity-0 transition group-hover:opacity-100"
            style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em" }}
          >
            VOTE NOW →
          </span>
        </div>
      </div>
    </Link>
  );
}

function CardSide({
  img,
  label,
  pct,
  color,
  leading,
}: {
  img: string | null;
  label: string;
  pct: number;
  color: string;
  leading: boolean;
}) {
  return (
    <div className="relative aspect-square overflow-hidden">
      <BattleImage
        src={img}
        alt={label}
        sizes="(max-width: 768px) 50vw, 20vw"
        className="transition duration-500 group-hover:scale-105"
        placeholderClassName="px-2 text-sm text-white/60"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-3">
        <div className="flex items-baseline justify-between">
          <span
            className="truncate text-white"
            style={{ fontWeight: 800, fontSize: 14, letterSpacing: "-0.01em" }}
          >
            {label}
          </span>
          <span
            style={{
              color: leading ? color : "rgba(255,255,255,0.45)",
              fontWeight: 900,
              fontSize: 18,
              letterSpacing: "-0.03em",
            }}
          >
            {pct}%
          </span>
        </div>
        <div className="mt-1.5 h-1 w-full bg-white/15">
          <div
            className="h-full transition-all"
            style={{
              width: `${pct}%`,
              background: leading ? color : "rgba(255,255,255,0.5)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

export function CreateBattleCard() {
  return (
    <Link
      href="/create"
      className="group relative flex min-h-[360px] flex-col items-center justify-center overflow-hidden border-2 border-dashed border-white/20 bg-[#0a0a0a] p-8 transition hover:border-[#CCFF00] hover:bg-[#CCFF00]/5"
    >
      <div
        className="absolute inset-0 opacity-0 transition group-hover:opacity-100"
        style={{
          backgroundImage:
            "linear-gradient(rgba(204,255,0,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(204,255,0,0.15) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />
      <div className="relative flex h-16 w-16 items-center justify-center bg-[#CCFF00] text-black transition group-hover:rotate-90">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 4v16M4 12h16" stroke="black" strokeWidth="3" />
        </svg>
      </div>
      <div
        className="relative mt-6 text-center text-white"
        style={{ fontWeight: 900, fontSize: 26, letterSpacing: "-0.03em", lineHeight: 1 }}
      >
        Start your
        <br />
        own fight
      </div>
      <p
        className="relative mt-3 max-w-[220px] text-center text-white/50"
        style={{ fontSize: 13, lineHeight: 1.4 }}
      >
        Zwei Optionen. Link teilen. Chaos beobachten.
      </p>
      <div
        className="relative mt-6 inline-flex items-center gap-1.5 text-[#CCFF00]"
        style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.15em" }}
      >
        TAKES 60 SECONDS →
      </div>
    </Link>
  );
}
