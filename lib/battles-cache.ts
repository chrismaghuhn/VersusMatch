import "server-only";

import { cache } from "react";
import {
  getBattleBySlug,
  getBattleResults,
  resolveBattleSlugRedirect,
} from "@/lib/battles";
import { createPublicClient } from "@/lib/supabase/public";

export const getCachedBattleBySlug = cache(async (slug: string) => {
  const supabase = createPublicClient();
  return getBattleBySlug(supabase, slug);
});

export const getCachedBattleResults = cache(async (battleId: string) => {
  const supabase = createPublicClient();
  return getBattleResults(supabase, battleId);
});

export const getCachedBattleSlugRedirect = cache(async (oldSlug: string) => {
  const supabase = createPublicClient();
  return resolveBattleSlugRedirect(supabase, oldSlug);
});
