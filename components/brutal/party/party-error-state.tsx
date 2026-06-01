"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Shell } from "@/components/brutal/party/shared/Shell";
import {
  normalizePartyErrorCode,
  PARTY_ERROR_DEFINITIONS,
} from "@/lib/party/copy-de";

type PartyErrorStateProps = {
  code: string;
  roomCode?: string;
  onRetry?: () => void;
  compact?: boolean;
};

export function PartyErrorState({
  code,
  roomCode,
  onRetry,
  compact = false,
}: PartyErrorStateProps) {
  const normalized = normalizePartyErrorCode(code);
  const def = PARTY_ERROR_DEFINITIONS[normalized];
  const Icon = def.icon;

  const body = roomCode
    ? def.body.replace(/FIGHT-42K/g, roomCode)
    : def.body;

  const ctaContent = (
    <>
      {def.cta} <ArrowRight className="h-3 w-3" />
    </>
  );

  function renderCta() {
    if (normalized === "disconnected") {
      return (
        <button
          type="button"
          disabled
          className="mt-5 flex w-full cursor-wait items-center justify-between border px-4 py-2.5 text-white opacity-80"
          style={{ borderColor: def.color, fontSize: 11, fontWeight: 800, letterSpacing: "0.18em" }}
        >
          {ctaContent}
        </button>
      );
    }

    if (onRetry && (normalized === "bad_code" || normalized === "join_failed" || normalized === "network_error" || normalized === "not_found")) {
      return (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 flex w-full items-center justify-between border px-4 py-2.5 text-white transition hover:bg-white hover:text-black"
          style={{ borderColor: def.color, fontSize: 11, fontWeight: 800, letterSpacing: "0.18em" }}
        >
          {ctaContent}
        </button>
      );
    }

    const href =
      normalized === "everyone_left" || normalized === "room_full"
        ? "/party"
        : "/party";

    return (
      <Link
        href={href}
        className="mt-5 flex w-full items-center justify-between border px-4 py-2.5 text-white transition hover:bg-white hover:text-black"
        style={{ borderColor: def.color, fontSize: 11, fontWeight: 800, letterSpacing: "0.18em" }}
      >
        {ctaContent}
      </Link>
    );
  }

  const card = (
    <div
      className={
        compact
          ? "relative mx-auto max-w-md overflow-hidden border border-white/10 bg-[#0a0a0a] p-6"
          : "relative mx-auto max-w-lg overflow-hidden border border-white/10 bg-[#0a0a0a] p-8"
      }
    >
      <div
        className="absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-20 blur-2xl"
        style={{ background: def.color }}
      />
      <div className="absolute left-0 top-0 h-1 w-full" style={{ background: def.color }} />

      <div className="relative">
        <div className="flex items-start justify-between">
          <div
            className="flex h-14 w-14 items-center justify-center border"
            style={{ borderColor: def.color, color: def.color, background: `${def.color}10` }}
          >
            <Icon className="h-8 w-8" />
          </div>
          <span
            className="border px-2 py-1"
            style={{
              borderColor: def.color,
              color: def.color,
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: "0.18em",
            }}
          >
            {def.label}
          </span>
        </div>

        <h3
          className="mt-5 text-white"
          style={{ fontWeight: 900, fontSize: 22, letterSpacing: "-0.03em", lineHeight: 1.1 }}
        >
          {def.title}
        </h3>
        <p className="mt-2 text-white/60" style={{ fontSize: 13, lineHeight: 1.5 }}>
          {body}
        </p>

        {def.progress !== undefined ? (
          <div className="mt-4 h-1 w-full overflow-hidden bg-white/10">
            <div
              className="h-full animate-pulse"
              style={{ width: `${def.progress}%`, background: def.color }}
            />
          </div>
        ) : null}

        {renderCta()}
      </div>
    </div>
  );

  if (compact) {
    return card;
  }

  return (
    <Shell>
      <div className="px-6 py-16">{card}</div>
    </Shell>
  );
}