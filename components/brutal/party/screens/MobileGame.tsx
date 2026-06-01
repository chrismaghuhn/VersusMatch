import { Shell, Meta } from "@/components/brutal/party/shared/Shell";
import { PartyMobileCaption } from "@/components/brutal/party/mobile/PartyMobileCaption";
import { PartyMobileReveal } from "@/components/brutal/party/mobile/PartyMobileReveal";
import { PartyMobileVoting } from "@/components/brutal/party/mobile/PartyMobileVoting";
import { PhoneFrame } from "@/components/brutal/party/mobile/PhoneFrame";
import type { PartySnapshot } from "@/lib/party/types";

const mockVotingSnapshot: PartySnapshot = {
  room: {
    id: "preview",
    code: "ABC123",
    status: "in_progress",
    phase: "voting",
    currentRound: 3,
    roundCount: 7,
    phaseEndsAt: new Date(Date.now() + 22_000).toISOString(),
    template: null,
  },
  players: [
    {
      userId: "1",
      handle: "PettyQueen",
      avatarUrl: "party:crown:#FF2D87",
      score: 1840,
      isHost: true,
      isYou: false,
    },
    {
      userId: "2",
      handle: "you",
      avatarUrl: "party:gremlin:#CCFF00",
      score: 1310,
      isHost: false,
      isYou: true,
    },
  ],
  submissions: [
    {
      id: "s1",
      userId: "1",
      caption: "MEIN PRODUKTIVITÄTS-APP|TWITTER 47× ÖFFNEN",
    },
    {
      id: "s2",
      userId: "2",
      caption: "EIN LEBEN HABEN|DIESES MEME MACHEN",
    },
  ],
  captionCount: 2,
  votesCastCount: 1,
  mySubmission: null,
  myVote: null,
  recentReactions: [],
};

const mockRevealSnapshot: PartySnapshot = {
  ...mockVotingSnapshot,
  room: {
    ...mockVotingSnapshot.room,
    phase: "reveal",
    phaseEndsAt: new Date(Date.now() + 10_000).toISOString(),
  },
  submissions: mockVotingSnapshot.submissions.map((s, i) => ({
    ...s,
    voteCount: i === 0 ? 4 : 1,
  })),
};

export function MobileGame() {
  return (
    <Shell>
      <div className="mx-auto max-w-[1280px] px-6 py-12">
        <div className="mb-8 text-center">
          <Meta>━━ MOBILE-FIRST</Meta>
          <h1
            className="mt-2 text-white"
            style={{
              fontWeight: 900,
              fontSize: "clamp(40px, 6vw, 72px)",
              letterSpacing: "-0.04em",
              lineHeight: 0.9,
            }}
          >
            90% play on a <span className="italic text-[#CCFF00]">phone</span>.
          </h1>
          <p className="mt-3 text-white/50" style={{ fontSize: 14 }}>
            Designed for one thumb, vertical, in bed at 2am.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <PhoneFrame label="CAPTION PHASE">
            <PartyMobileCaption
              embedded
              round={3}
              roundCount={7}
              phaseEndsAt={new Date(Date.now() + 42_000).toISOString()}
              allReady={false}
              captionCount={1}
              playerCount={4}
              value="EIN LEBEN HABEN"
              onChange={() => {}}
              onSubmit={() => {}}
              template={null}
            />
          </PhoneFrame>

          <PhoneFrame label="VOTING · SWIPE">
            <PartyMobileVoting
              embedded
              snapshot={mockVotingSnapshot}
              onVote={async () => {}}
            />
          </PhoneFrame>

          <PhoneFrame label="RESULTS">
            <PartyMobileReveal embedded snapshot={mockRevealSnapshot} />
          </PhoneFrame>
        </div>

        <div className="mt-10 border border-white/10 bg-[#0a0a0a] p-6">
          <Meta color="#CCFF00">━━ MOBILE PRINCIPLES</Meta>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <Principle title="ONE-THUMB ZONE" body="Primary action always bottom 25% of screen. No top-bar taps to start a turn." />
            <Principle title="SWIPE TO VOTE" body="Tinder-style stack. Skip → / Vote ♥. Beats grid for one-handed play." />
            <Principle title="MEME FILLS SCREEN" body="On phone the meme is the page. Captions overlay it. No precious whitespace." />
          </div>
        </div>
      </div>
    </Shell>
  );
}

function Principle({ title, body }: { title: string; body: string }) {
  return (
    <div className="border-l-2 border-[#CCFF00] pl-4">
      <div className="text-white" style={{ fontWeight: 900, fontSize: 14, letterSpacing: "-0.02em" }}>
        {title}
      </div>
      <p className="mt-1 text-white/60" style={{ fontSize: 13, lineHeight: 1.5 }}>
        {body}
      </p>
    </div>
  );
}
