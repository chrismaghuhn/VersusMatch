import { Noise } from "@/components/brutal/noise";
import { Stat, VsSlider } from "@/components/battle-vote-ui";
import { BattleSideDisplay } from "@/components/battle-side-display";
import { BattleVoteControls } from "@/components/battle-vote-controls";
import type { BattleResult, BattleWithOptions } from "@/lib/database.types";
import { formatPercent } from "@/lib/utils";

type BattleVoteSectionProps = {
  battle: BattleWithOptions;
  initialResults: BattleResult[];
  shareUrl: string;
};

export function BattleVoteSection({ battle, initialResults, shareUrl }: BattleVoteSectionProps) {
  const options = [...battle.battle_options].sort((a, b) => a.position - b.position);
  const totalVotes = initialResults.reduce((sum, row) => sum + row.vote_count, 0);
  const resultA = initialResults.find((row) => row.option_id === options[0]?.id);
  const aPct = formatPercent(resultA?.vote_count ?? 0, totalVotes);

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
              Pick your side — tap to commit.
            </p>
          </div>
          <div className="col-span-12 grid grid-cols-2 gap-4 md:col-span-4 md:grid-cols-1">
            <Stat label="VOTES" value={totalVotes.toLocaleString("en-US")} />
            <Stat label="OPTIONS" value="2" />
          </div>
        </div>

        <div
          id="battle-vote-grid"
          className="relative grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto_1fr] md:items-stretch"
        >
          {options[0] ? (
            <BattleSideDisplay option={options[0]} index={0} priority />
          ) : null}
          <VsSlider aPct={aPct} totalVotes={totalVotes} />
          {options[1] ? <BattleSideDisplay option={options[1]} index={1} priority /> : null}
        </div>

        <BattleVoteControls
          battle={battle}
          initialResults={initialResults}
          shareUrl={shareUrl}
        />
      </div>
    </section>
  );
}
