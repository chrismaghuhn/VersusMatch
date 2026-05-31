import Link from "next/link";
import { Flame, Medal, Star, Target, Trophy, Zap } from "lucide-react";
import { PASS_TIERS } from "@/lib/rewards/constants";
import type { RewardsMe } from "@/lib/rewards/types";

type MilestoneProgressCardsProps = {
  data: RewardsMe;
};

type MilestoneCard = {
  icon: React.ReactNode;
  title: string;
  desc: string;
  current: number;
  goal: number;
  label: string;
  color: string;
  badgeKey?: string;
  href?: string;
};

function buildMilestones(data: RewardsMe): MilestoneCard[] {
  const tierStart = PASS_TIERS.find((row) => row.tier === data.tier)?.xp ?? 0;
  const nextTierXp = data.nextTierXp;

  const cards: MilestoneCard[] = [
    {
      icon: <Flame className="h-5 w-5" />,
      title: "FIGHT STREAK",
      desc: "Active streak toward Week Warrior.",
      current: data.streak,
      goal: 7,
      label: "STREAK",
      color: "#CCFF00",
      badgeKey: "week_warrior",
    },
    {
      icon: <Star className="h-5 w-5" />,
      title: "PERSONAL BEST",
      desc: "Your longest run this season — never drops when the streak breaks.",
      current: data.longestStreak,
      goal: 30,
      label: "RECORD",
      color: "#FFB800",
    },
    {
      icon: <Trophy className="h-5 w-5" />,
      title: "VOTES THIS SEASON",
      desc: "Rewarded votes toward Fight Fanatic.",
      current: data.seasonVoteCount,
      goal: 50,
      label: "SEASON",
      color: "#FF2D87",
      badgeKey: "fight_fanatic",
    },
    {
      icon: <Medal className="h-5 w-5" />,
      title: "UNDERDOG PICKS",
      desc: "Votes on the minority side.",
      current: data.underdogCount,
      goal: 5,
      label: "BADGE",
      color: "#00E1FF",
      badgeKey: "underdog",
    },
  ];

  if (nextTierXp != null && nextTierXp > tierStart) {
    cards.push({
      icon: <Target className="h-5 w-5" />,
      title: "NEXT TIER",
      desc: `Progress toward tier ${data.tier + 1}.`,
      current: data.xp - tierStart,
      goal: nextTierXp - tierStart,
      label: "PASS",
      color: "#CCFF00",
    });
  }

  cards.push({
    icon: <Zap className="h-5 w-5" />,
    title: "FIGHT OF THE DAY",
    desc: data.fotdClaimedToday
      ? "+25 XP claimed today."
      : "Vote on today's featured battle for a bonus.",
    current: data.fotdClaimedToday ? 1 : 0,
    goal: 1,
    label: "TODAY",
    color: "#FF2D87",
    href: "/",
  });

  return cards;
}

export function MilestoneProgressCards({ data }: MilestoneProgressCardsProps) {
  const milestones = buildMilestones(data);

  return (
    <section className="border-b border-white/10 bg-black">
      <div className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 sm:py-20">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div
              className="mb-3 text-white/40"
              style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.22em" }}
            >
              ━━ YOUR GRIND
            </div>
            <h2
              className="text-white"
              style={{
                fontWeight: 900,
                fontSize: "clamp(44px, 6.5vw, 88px)",
                letterSpacing: "-0.05em",
                lineHeight: 0.9,
              }}
            >
              Badge & pass <span className="text-[#FF2D87]">milestones</span>.
            </h2>
            <p className="mt-3 max-w-xl text-white/50" style={{ fontSize: 14, lineHeight: 1.5 }}>
              Real progress from your votes — not purchasable quests. Rewards land automatically
              when you hit each goal.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {milestones.map((card) => (
            <MilestoneCard key={card.title} card={card} badges={data.badges} />
          ))}
        </div>
      </div>
    </section>
  );
}

function MilestoneCard({
  card,
  badges,
}: {
  card: MilestoneCard;
  badges: string[];
}) {
  const badgeComplete = card.badgeKey ? badges.includes(card.badgeKey) : false;
  const numericComplete = card.current >= card.goal;
  const done = badgeComplete || numericComplete;
  const pct = done ? 100 : Math.min(100, Math.round((card.current / card.goal) * 100));

  const inner = (
    <div
      className={
        "group relative border bg-[#0a0a0a] p-5 transition hover:-translate-y-1 " +
        (done ? "border-[#CCFF00]" : "border-white/10 hover:border-white/30")
      }
    >
      <div className="absolute left-0 top-0 h-1 w-full" style={{ background: card.color }} />

      <div className="flex items-start justify-between">
        <div
          className="flex h-12 w-12 items-center justify-center border"
          style={{
            borderColor: card.color,
            color: card.color,
            background: `${card.color}10`,
          }}
        >
          {card.icon}
        </div>
        <div className="flex items-center gap-2">
          <span
            className="px-2 py-1 text-black"
            style={{
              background: card.color,
              fontSize: 9,
              fontWeight: 900,
              letterSpacing: "0.15em",
            }}
          >
            {card.label}
          </span>
        </div>
      </div>

      <h3
        className="mt-5 text-white"
        style={{ fontWeight: 900, fontSize: 18, letterSpacing: "-0.02em", lineHeight: 1.1 }}
      >
        {card.title}
      </h3>
      <p className="mt-1 text-white/50" style={{ fontSize: 12 }}>
        {card.desc}
      </p>

      <div className="mt-5">
        <div
          className="mb-1.5 flex justify-between text-white/60"
          style={{ fontSize: 11, fontWeight: 700 }}
        >
          <span>
            {Math.min(card.current, card.goal)} / {card.goal}
          </span>
          <span style={{ color: done ? "#CCFF00" : "rgba(255,255,255,0.4)" }}>
            {done ? "COMPLETE ✓" : `${pct}%`}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden border border-white/10 bg-black">
          <div
            className="h-full transition-all"
            style={{ width: `${pct}%`, background: card.color }}
          />
        </div>
      </div>
    </div>
  );

  if (card.href && !done) {
    return (
      <Link href={card.href} className="block">
        {inner}
      </Link>
    );
  }

  return inner;
}
