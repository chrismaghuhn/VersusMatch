/** Roll W1–W10 uniformly. Optional rng inject for tests. */
export function rollStandardDice(rng: () => number = Math.random): number {
  return Math.floor(rng() * 10) + 1;
}

/** Golden dice: W6–W10. */
export function rollGoldenDice(rng: () => number = Math.random): number {
  return Math.floor(rng() * 5) + 6;
}

export function applyTripwire(roll: number): number {
  return Math.max(1, roll - 3);
}
