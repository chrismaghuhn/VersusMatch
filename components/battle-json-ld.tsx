import type { BattleWithOptions } from "@/lib/database.types";
import { getAppUrl } from "@/lib/utils";

type BattleJsonLdProps = {
  battle: BattleWithOptions;
  shareUrl: string;
};

export function BattleJsonLd({ battle, shareUrl }: BattleJsonLdProps) {
  const options = [...battle.battle_options].sort((a, b) => a.position - b.position);
  const optionA = options[0]?.label ?? "Option A";
  const optionB = options[1]?.label ?? "Option B";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: battle.title,
    url: shareUrl,
    description: `${optionA} vs ${optionB} — vote on MemeFight!`,
    isPartOf: {
      "@type": "WebSite",
      name: "MemeFight",
      url: getAppUrl("/"),
    },
    mainEntity: {
      "@type": "Question",
      name: battle.title,
      text: `${optionA} vs ${optionB}`,
      suggestedAnswer: [
        { "@type": "Answer", text: optionA },
        { "@type": "Answer", text: optionB },
      ],
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
