import { BattleSideDisplay } from "@/components/battle-side-display";
import { BattleVoteControls } from "@/components/battle-vote-controls";
import { VsSlider } from "@/components/battle-vote-ui";
import type { BattleResult, BattleWithOptions } from "@/lib/database.types";
import { formatPercent } from "@/lib/utils";

type BattleEmbedSectionProps = {
  battle: BattleWithOptions;
  initialResults: BattleResult[];
  battleUrl: string;
};

export function BattleEmbedSection({
  battle,
  initialResults,
  battleUrl,
}: BattleEmbedSectionProps) {
  const options = [...battle.battle_options].sort((a, b) => a.position - b.position);
  const totalVotes = initialResults.reduce((sum, row) => sum + row.vote_count, 0);
  const resultA = initialResults.find((row) => row.option_id === options[0]?.id);
  const aPct = formatPercent(resultA?.vote_count ?? 0, totalVotes);

  return (
    <section className="px-4 py-6 sm:px-6 sm:py-8">
      <h1
        className="mb-6 text-white"
        style={{
          fontWeight: 900,
          fontSize: "clamp(22px, 4vw, 36px)",
          letterSpacing: "-0.04em",
          lineHeight: 0.95,
        }}
      >
        {battle.title}
      </h1>

      <div
        id="battle-vote-grid"
        className="relative grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_1fr] md:items-stretch"
      >
        {options[0] ? <BattleSideDisplay option={options[0]} index={0} priority /> : null}
        <VsSlider aPct={aPct} totalVotes={totalVotes} />
        {options[1] ? <BattleSideDisplay option={options[1]} index={1} eager /> : null}
      </div>

      <BattleVoteControls
        battle={battle}
        initialResults={initialResults}
        shareUrl={battleUrl}
        embed
      />
    </section>
  );
}
