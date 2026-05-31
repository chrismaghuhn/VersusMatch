import Link from "next/link";
import { BATTLE_CATEGORIES, type BattleCategory } from "@/lib/categories";
import type { FeedSort } from "@/lib/battles";

type FeedFiltersProps = {
  currentCategory: BattleCategory | "all";
  currentSort: FeedSort;
};

export function FeedFilters({ currentCategory, currentSort }: FeedFiltersProps) {
  function href(category: BattleCategory | "all", sort: FeedSort) {
    const params = new URLSearchParams();
    if (category !== "all") params.set("category", category);
    if (sort !== "new") params.set("sort", sort);
    const query = params.toString();
    return query ? `/feed?${query}` : "/feed";
  }

  const filterClass = (active: boolean) =>
    active
      ? "bg-[#CCFF00] text-black"
      : "border border-white/15 text-white/60 hover:border-white/40 hover:text-white";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1">
        <Link
          href={href("all", currentSort)}
          className={`px-3 py-2 transition ${filterClass(currentCategory === "all")}`}
          style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.15em" }}
        >
          ALL
        </Link>
        {BATTLE_CATEGORIES.map((category) => (
          <Link
            key={category.value}
            href={href(category.value, currentSort)}
            className={`px-3 py-2 transition ${filterClass(currentCategory === category.value)}`}
            style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.15em" }}
          >
            {category.label.toUpperCase()}
          </Link>
        ))}
      </div>
      <div className="flex gap-1">
        <Link
          href={href(currentCategory, "new")}
          className={`px-3 py-2 transition ${filterClass(currentSort === "new")}`}
          style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.15em" }}
        >
          NEWEST
        </Link>
        <Link
          href={href(currentCategory, "votes")}
          className={`px-3 py-2 transition ${filterClass(currentSort === "votes")}`}
          style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.15em" }}
        >
          MOST VOTES
        </Link>
      </div>
    </div>
  );
}
