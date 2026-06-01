export function fitMemeFontSize(
  text: string,
  basePx: number,
  maxLines: number,
  minPx = 10
): number {
  const lines = text.split("\n").length;
  const longest = Math.max(...text.split("\n").map((l) => l.length), 1);
  let size = basePx;
  if (lines > maxLines) size = Math.max(minPx, basePx * (maxLines / lines));
  if (longest > 28) size = Math.max(minPx, size * (28 / longest));
  return Math.round(size);
}
