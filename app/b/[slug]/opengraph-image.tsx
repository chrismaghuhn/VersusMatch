import { getCachedBattleBySlug, getCachedBattleResults } from "@/lib/battles-cache";
import { renderBattleOgImage, renderDefaultOgImage } from "@/lib/og/render-battle-og";

export const runtime = "nodejs";
export const revalidate = 60;

type RouteProps = {
  params: Promise<{ slug: string }>;
};

export default async function BattleOgImage({ params }: RouteProps) {
  const { slug } = await params;
  const battle = await getCachedBattleBySlug(slug);

  if (!battle) {
    return renderDefaultOgImage();
  }

  const results = await getCachedBattleResults(battle.id);
  return renderBattleOgImage({ battle, results });
}

export async function generateImageMetadata({ params }: RouteProps) {
  const { slug } = await params;
  const battle = await getCachedBattleBySlug(slug);

  return [
    {
      id: slug,
      alt: battle?.title ?? "MemeFight Battle",
      size: { width: 1200, height: 630 },
      contentType: "image/png",
    },
  ];
}
