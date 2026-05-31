import type { MetadataRoute } from "next";
import { getActiveBattleSlugsForSitemap } from "@/lib/battles";
import { BATTLE_CATEGORIES } from "@/lib/categories";
import { createPublicClient } from "@/lib/supabase/public";
import { getAppUrl } from "@/lib/utils";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getAppUrl();
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: getAppUrl("/feed"),
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.9,
    },
    ...BATTLE_CATEGORIES.map((category) => ({
      url: getAppUrl(`/feed/${category.value}`),
      lastModified: new Date(),
      changeFrequency: "hourly" as const,
      priority: 0.85,
    })),
  ];

  try {
    const supabase = createPublicClient();
    const battles = await getActiveBattleSlugsForSitemap(supabase);

    const battleRoutes: MetadataRoute.Sitemap = battles.map((battle) => ({
      url: getAppUrl(`/b/${battle.slug}`),
      lastModified: new Date(battle.created_at),
      changeFrequency: "daily" as const,
      priority: 0.8,
    }));

    return [...staticRoutes, ...battleRoutes];
  } catch {
    return staticRoutes;
  }
}
