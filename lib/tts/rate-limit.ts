import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const limit = Number(process.env.TTS_RATE_LIMIT_PER_MINUTE || 20);
const limiter = url && token && Number.isInteger(limit) && limit > 0
  ? new Ratelimit({ redis: new Redis({ url, token }), limiter: Ratelimit.slidingWindow(limit, "1 m"), prefix: "triviabot:tts" })
  : null;

export async function allowTts(ip: string) {
  if (!limiter) return process.env.NODE_ENV === "production" ? null : { success: true, remaining: Infinity, reset: 0 };
  return limiter.limit(ip);
}
