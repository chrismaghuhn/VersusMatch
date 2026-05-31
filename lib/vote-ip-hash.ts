import { createHash } from "crypto";

export function hashVoteIp(ip: string): string | null {
  const salt = process.env.VOTE_IP_HASH_SALT;

  if (!salt || ip === "unknown") {
    return null;
  }

  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}
