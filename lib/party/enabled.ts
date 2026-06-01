export function isPartyEnabled(): boolean {
  return process.env.PARTY_ENABLED === "true";
}
