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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Link
          href={href("all", currentSort)}
          className={`rounded-full px-3 py-1 text-sm ${
            currentCategory === "all" ? "bg-primary text-primary-foreground" : "bg-secondary"
          }`}
        >
          Alle
        </Link>
        {BATTLE_CATEGORIES.map((category) => (
          <Link
            key={category.value}
            href={href(category.value, currentSort)}
            className={`rounded-full px-3 py-1 text-sm ${
              currentCategory === category.value ? "bg-primary text-primary-foreground" : "bg-secondary"
            }`}
          >
            {category.label}
          </Link>
        ))}
      </div>
      <div className="flex gap-2">
        <Link
          href={href(currentCategory, "new")}
          className={`rounded-lg px-3 py-1.5 text-sm ${
            currentSort === "new" ? "bg-primary text-primary-foreground" : "bg-secondary"
          }`}
        >
          Neueste
        </Link>
        <Link
          href={href(currentCategory, "votes")}
          className={`rounded-lg px-3 py-1.5 text-sm ${
            currentSort === "votes" ? "bg-primary text-primary-foreground" : "bg-secondary"
          }`}
        >
          Meiste Votes
        </Link>
      </div>
    </div>
  );
}
