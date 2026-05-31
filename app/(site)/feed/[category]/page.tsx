import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FeedPageContent } from "@/components/feed-page-content";
import { getActiveBattlesFeed, type FeedSort } from "@/lib/battles";
import {
  BATTLE_CATEGORIES,
  getCategorySeo,
  isBattleCategory,
  type BattleCategory,
} from "@/lib/categories";
import { getAppUrl } from "@/lib/utils";
import { createPublicClient } from "@/lib/supabase/public";

export const revalidate = 60;

type PageProps = {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ sort?: string }>;
};

export function generateStaticParams() {
  return BATTLE_CATEGORIES.map((category) => ({ category: category.value }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category: categoryParam } = await params;

  if (!isBattleCategory(categoryParam)) {
    return { title: "Feed not found" };
  }

  const seo = getCategorySeo(categoryParam);
  const url = getAppUrl(`/feed/${categoryParam}`);

  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: url },
    openGraph: {
      title: `${seo.title} | MemeFight`,
      description: seo.description,
      url,
    },
  };
}

export default async function CategoryFeedPage({ params, searchParams }: PageProps) {
  const { category: categoryParam } = await params;
  const { sort: sortParam } = await searchParams;

  if (!isBattleCategory(categoryParam)) {
    notFound();
  }

  const category = categoryParam as BattleCategory;
  const sort = (sortParam === "votes" ? "votes" : "new") as FeedSort;
  const seo = getCategorySeo(category);

  const supabase = createPublicClient();
  const battles = await getActiveBattlesFeed(supabase, {
    limit: 24,
    category,
    sort,
  });

  return (
    <FeedPageContent battles={battles} category={category} sort={sort} intro={seo.intro} />
  );
}
