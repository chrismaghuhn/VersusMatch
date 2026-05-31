import { renderDefaultOgImage } from "@/lib/og/render-battle-og";

export const runtime = "nodejs";
export const revalidate = 3600;

export default function DefaultOgImage() {
  return renderDefaultOgImage();
}

export const alt = "MemeFight — A vs B Battles";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
