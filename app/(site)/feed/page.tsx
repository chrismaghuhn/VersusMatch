import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FeedPageContent } from "@/components/feed-page-content";
import { getActiveBattlesFeed, type FeedSort } from "@/lib/battles";
import { isBattleCategory } from "@/lib/categories";
import { getAppUrl } from "@/lib/utils";
import { createPublicClient } from "@/lib/supabase/public";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Live Feed",
  description: "Browse trending A-vs-B battles on MemeFight and vote live.",
  alternates: {
    canonical: getAppUrl("/feed"),
  },
  openGraph: {
    title: "MemeFight Live Feed",
    description: "Trending fights — pick a side and vote.",
    url: getAppUrl("/feed"),
  },
};

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const sort = (params.sort === "votes" ? "votes" : "new") as FeedSort;

  if (params.category && params.category !== "all" && isBattleCategory(params.category)) {
    const query = sort !== "new" ? `?sort=${sort}` : "";
    redirect(`/feed/${params.category}${query}`);
  }

  const supabase = createPublicClient();
  const battles = await getActiveBattlesFeed(supabase, {
    limit: 24,
    category: "all",
    sort,
  });

  return <FeedPageContent battles={battles} category="all" sort={sort} />;
}
