import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let voteRateLimit: Ratelimit | null = null;

function getVoteRateLimit(): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    return null;
  }

  if (!voteRateLimit) {
    voteRateLimit = new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(20, "1 m"),
      prefix: "memefight:vote",
    });
  }

  return voteRateLimit;
}

export async function isVoteRateLimited(key: string): Promise<boolean> {
  const limiter = getVoteRateLimit();

  if (!limiter) {
    console.warn("[rate-limit] Redis env vars missing — vote rate limit disabled");
    return false;
  }

  const { success } = await limiter.limit(key);
  return !success;
}
