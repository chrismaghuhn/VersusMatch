function hashSeed(input: string, seed: number): number {
  let h = seed | 0;
  for (let i = 0; i < input.length; i++) {
    h = Math.imul(31, h) + input.charCodeAt(i);
    h |= 0;
  }
  return h;
}

export function seededShuffle<T>(items: T[], seed: number, keyFn: (item: T) => string): T[] {
  return [...items].sort(
    (a, b) => hashSeed(keyFn(a), seed) - hashSeed(keyFn(b), seed)
  );
}
