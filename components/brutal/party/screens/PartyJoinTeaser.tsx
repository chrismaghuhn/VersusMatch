import Link from "next/link";
import { ArrowRight, Clock3 } from "lucide-react";
import { Shell, Meta } from "@/components/brutal/party/shared/Shell";
import { PARTY_COPY } from "@/lib/party/copy";
import type { PartyPeekResult } from "@/lib/party/peek";

type PartyJoinTeaserProps = {
  peek: PartyPeekResult;
  code: string;
  isLoggedIn: boolean;
};

export function PartyJoinTeaser({ peek, code, isLoggedIn }: PartyJoinTeaserProps) {
  const returnTo = `/party/join/${code}`;
  const loginHref = `/auth/login?returnTo=${encodeURIComponent(returnTo)}`;

  return (
    <Shell>
      <div className="mx-auto max-w-[920px] px-6 py-14">
        <div className="border border-white/10 bg-[#0a0a0a] p-6 md:p-8">
          <Meta color="#CCFF00">━━ PARTY INVITE</Meta>
          <h1
            className="mt-4 text-white"
            style={{ fontWeight: 900, fontSize: "clamp(42px, 8vw, 82px)", letterSpacing: "-0.05em", lineHeight: 0.9 }}
          >
            JOIN
            <br />
            <span className="italic text-[#CCFF00]">TEASER</span>
            <span className="text-[#FF2D87]">.</span>
          </h1>

          {!peek.ok ? (
            <NotFoundVariant code={code} error={peek.error} />
          ) : peek.isFinished ? (
            <FinishedVariant code={code} hostHandle={peek.hostHandle} />
          ) : peek.inGame ? (
            <InGameVariant
              code={code}
              hostHandle={peek.hostHandle}
              playerCount={peek.playerCount}
              maxPlayers={peek.maxPlayers}
              isLoggedIn={isLoggedIn}
              loginHref={loginHref}
            />
          ) : (
            <LobbyOpenAnonVariant
              code={code}
              hostHandle={peek.hostHandle}
              playerCount={peek.playerCount}
              maxPlayers={peek.maxPlayers}
              isLoggedIn={isLoggedIn}
              loginHref={loginHref}
            />
          )}
        </div>
      </div>
    </Shell>
  );
}

function NotFoundVariant({ code, error }: { code: string; error: string }) {
  const message =
    error === "room_closed" ? PARTY_COPY.joinTeaserClosed : PARTY_COPY.joinTeaserNotFound;
  return (
    <div className="mt-8">
      <div className="inline-flex border border-[#FF2D87] px-3 py-1 text-[#FF2D87]" style={tagStyle}>
        {code}
      </div>
      <h2 className="mt-4 text-white" style={titleStyle}>
        {message}
      </h2>
      <p className="mt-2 text-white/60" style={bodyStyle}>
        {PARTY_COPY.joinTeaserTagline}
      </p>
      <Link href="/party" className="mt-6 inline-flex items-center gap-2 bg-[#CCFF00] px-4 py-3 text-black transition hover:bg-white" style={ctaStyle}>
        {PARTY_COPY.joinButton} <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function FinishedVariant({ code, hostHandle }: { code: string; hostHandle: string }) {
  return (
    <div className="mt-8">
      <p className="text-white/65" style={bodyStyle}>
        {PARTY_COPY.joinTeaserHosting(hostHandle)}
      </p>
      <h2 className="mt-3 text-white" style={titleStyle}>
        {PARTY_COPY.joinTeaserFinished}
      </h2>
      <div className="mt-3 border border-white/10 bg-black px-3 py-2 text-white/80" style={monoStyle}>
        {code}
      </div>
      <Link href={`/party/recap/${code}`} className="mt-6 inline-flex items-center gap-2 bg-[#00E1FF] px-4 py-3 text-black transition hover:bg-white" style={ctaStyle}>
        {PARTY_COPY.joinTeaserFinishedRecap} <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function InGameVariant({
  code,
  hostHandle,
  playerCount,
  maxPlayers,
  isLoggedIn,
  loginHref,
}: {
  code: string;
  hostHandle: string;
  playerCount: number;
  maxPlayers: number;
  isLoggedIn: boolean;
  loginHref: string;
}) {
  return (
    <div className="mt-8">
      <p className="text-white/65" style={bodyStyle}>
        {PARTY_COPY.joinTeaserHosting(hostHandle)}
      </p>
      <h2 className="mt-3 text-white" style={titleStyle}>
        {PARTY_COPY.joinTeaserInGameTitle(hostHandle)}
      </h2>
      <p className="mt-3 text-white/70" style={bodyStyle}>
        {PARTY_COPY.joinTeaserInGameBody(playerCount, maxPlayers)}
      </p>
      <div className="mt-3 border border-white/10 bg-black px-3 py-2 text-white/80" style={monoStyle}>
        {code} · {PARTY_COPY.joinTeaserPlayers(playerCount, maxPlayers)}
      </div>
      <button
        type="button"
        disabled
        className="mt-6 inline-flex cursor-not-allowed items-center gap-2 border border-[#FF2D87] px-4 py-3 text-[#FF2D87] opacity-80"
        style={ctaStyle}
      >
        <Clock3 className="h-4 w-4" /> {PARTY_COPY.joinTeaserInGameCta}
      </button>
      {!isLoggedIn ? (
        <p className="mt-3 text-white/45" style={smallStyle}>
          <Link href={loginHref} className="underline underline-offset-4 hover:text-white">
            Login
          </Link>{" "}
          to be ready when the lobby opens again.
        </p>
      ) : null}
    </div>
  );
}

function LobbyOpenAnonVariant({
  code,
  hostHandle,
  playerCount,
  maxPlayers,
  isLoggedIn,
  loginHref,
}: {
  code: string;
  hostHandle: string;
  playerCount: number;
  maxPlayers: number;
  isLoggedIn: boolean;
  loginHref: string;
}) {
  return (
    <div className="mt-8">
      <p className="text-white/65" style={bodyStyle}>
        {PARTY_COPY.joinTeaserHosting(hostHandle)}
      </p>
      <h2 className="mt-3 text-white" style={titleStyle}>
        {PARTY_COPY.joinTeaserTagline}
      </h2>
      <p className="mt-3 text-white/70" style={bodyStyle}>
        {PARTY_COPY.joinTeaserPlayers(playerCount, maxPlayers)}
      </p>
      <div className="mt-3 border border-white/10 bg-black px-3 py-2 text-white/80" style={monoStyle}>
        {code}
      </div>
      {isLoggedIn ? null : (
        <Link href={loginHref} className="mt-6 inline-flex items-center gap-2 bg-[#CCFF00] px-4 py-3 text-black transition hover:bg-white" style={ctaStyle}>
          {PARTY_COPY.joinTeaserCta} <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

const titleStyle = {
  fontWeight: 900,
  fontSize: "clamp(24px, 5vw, 40px)",
  letterSpacing: "-0.03em",
  lineHeight: 1.05,
} as const;

const bodyStyle = {
  fontSize: 14,
  lineHeight: 1.5,
} as const;

const tagStyle = {
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.18em",
} as const;

const ctaStyle = {
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: "0.12em",
} as const;

const monoStyle = {
  fontFamily: "ui-monospace, monospace",
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: "0.08em",
} as const;

const smallStyle = {
  fontSize: 12,
  lineHeight: 1.4,
} as const;
