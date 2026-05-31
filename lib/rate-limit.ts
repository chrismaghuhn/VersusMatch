import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let voteRateLimit: Ratelimit | null = null;
let battleVoteRateLimit: Ratelimit | null = null;

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    return null;
  }

  return new Redis({ url, token });
}

function getVoteRateLimit(): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;

  if (!voteRateLimit) {
    voteRateLimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, "1 m"),
      prefix: "memefight:vote:ip",
    });
  }

  return voteRateLimit;
}

function getBattleVoteRateLimit(): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;

  if (!battleVoteRateLimit) {
    battleVoteRateLimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "1 m"),
      prefix: "memefight:vote:battle",
    });
  }

  return battleVoteRateLimit;
}

export async function isVoteRateLimited(ip: string, battleId?: string): Promise<boolean> {
  const globalLimiter = getVoteRateLimit();

  if (!globalLimiter) {
    console.warn("[rate-limit] Redis env vars missing — vote rate limit disabled");
    return false;
  }

  const global = await globalLimiter.limit(ip);
  if (!global.success) {
    return true;
  }

  if (!battleId) {
    return false;
  }

  const battleLimiter = getBattleVoteRateLimit();
  if (!battleLimiter) {
    return false;
  }

  const battle = await battleLimiter.limit(`${battleId}:${ip}`);
  return !battle.success;
}
