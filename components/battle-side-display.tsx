import Image from "next/image";
import { OPTION_COLORS } from "@/components/battle-vote-ui";
import type { BattleOption } from "@/lib/database.types";
import { getPublicImageUrl } from "@/lib/utils";

type BattleSideDisplayProps = {
  option: BattleOption;
  index: number;
  priority?: boolean;
};

export function BattleSideDisplay({
  option,
  index,
  priority = false,
}: BattleSideDisplayProps) {
  const color = OPTION_COLORS[index] ?? OPTION_COLORS[0];
  const img = getPublicImageUrl(option.image_path);
  const eager = priority;

  return (
    <article
      data-vote-side={option.id}
      className="group relative overflow-hidden border border-white/10 bg-black text-left transition hover:border-white/30"
    >
      <div className="relative aspect-[16/11] w-full overflow-hidden">
        {img ? (
          <Image
            src={img}
            alt={option.label}
            fill
            priority={eager}
            fetchPriority={eager ? "high" : "auto"}
            loading={eager ? undefined : "lazy"}
            className="object-cover transition duration-700 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 40vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-[#141414] p-6 text-center text-2xl font-black text-white">
            {option.label}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute left-5 top-5 flex items-center gap-2">
          <div className="px-2 py-1" style={{ background: color }}>
            <span
              className="text-black"
              style={{ fontWeight: 800, fontSize: 10, letterSpacing: "0.18em" }}
            >
              {option.label.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      <div className="p-6">
        <h3
          className="text-white"
          style={{ fontWeight: 900, fontSize: 28, letterSpacing: "-0.035em", lineHeight: 1 }}
        >
          {option.label}
        </h3>
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
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path d="M2 6h8M6 2l4 4-4 4" stroke="black" strokeWidth="2" />
            </svg>
          </span>
        </div>
      </div>
    </article>
  );
}
