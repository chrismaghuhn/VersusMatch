export function isBoardBrawlEnabled(): boolean {
  return process.env.BOARD_BRAWL_ENABLED === "true";
}
