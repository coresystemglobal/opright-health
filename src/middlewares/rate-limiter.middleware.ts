import rateLimit from 'express-rate-limit';
import type { Store, ClientRateLimitInfo } from 'express-rate-limit';
import type Redis from 'ioredis';
import { initializeRedisConnection } from '../core/redis';

// Lazily resolved Redis client shared across all stores
let _redisClient: Redis | null = null;
async function getRedisClient(): Promise<Redis | null> {
  if (_redisClient) return _redisClient;
  try {
    _redisClient = await initializeRedisConnection();
    return _redisClient;
  } catch {
    return null;
  }
}

class RedisRateLimitStore implements Store {
  prefix: string;
  private windowMs: number;

  constructor(windowMs: number, prefix: string) {
    this.windowMs = windowMs;
    this.prefix = prefix;
    getRedisClient().catch(() => {}); // warm up connection
  }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    const client = await getRedisClient();
    if (!client) {
      return { totalHits: 1, resetTime: new Date(Date.now() + this.windowMs) };
    }

    const redisKey = `${this.prefix}${key}`;
    const results = await client.multi().incr(redisKey).pttl(redisKey).exec();

    const totalHits = (results?.[0]?.[1] as number) ?? 1;
    const pttl = (results?.[1]?.[1] as number) ?? -1;

    if (totalHits === 1 || pttl < 0) {
      await client.pexpire(redisKey, this.windowMs);
    }

    const ttlMs = pttl > 0 ? pttl : this.windowMs;
    return { totalHits, resetTime: new Date(Date.now() + ttlMs) };
  }

  async decrement(key: string): Promise<void> {
    const client = await getRedisClient();
    if (!client) return;
    await client.decr(`${this.prefix}${key}`);
  }

  async resetKey(key: string): Promise<void> {
    const client = await getRedisClient();
    if (!client) return;
    await client.del(`${this.prefix}${key}`);
  }
}

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export const generalRateLimit = rateLimit({
  windowMs: WINDOW_MS,
  max: 100,
  store: new RedisRateLimitStore(WINDOW_MS, 'rl:general:'),
  message: { success: false, message: 'Too many requests from this IP, please try again later.', error: 'RATE_LIMIT_EXCEEDED' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRateLimit = rateLimit({
  windowMs: WINDOW_MS,
  max: 5,
  store: new RedisRateLimitStore(WINDOW_MS, 'rl:auth:'),
  message: { success: false, message: 'Too many authentication attempts, please try again later.', error: 'AUTH_RATE_LIMIT_EXCEEDED' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const paymentRateLimit = rateLimit({
  windowMs: WINDOW_MS,
  max: 10,
  store: new RedisRateLimitStore(WINDOW_MS, 'rl:payment:'),
  message: { success: false, message: 'Too many payment requests, please try again later.', error: 'PAYMENT_RATE_LIMIT_EXCEEDED' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiRateLimit = rateLimit({
  windowMs: WINDOW_MS,
  max: 200,
  store: new RedisRateLimitStore(WINDOW_MS, 'rl:api:'),
  message: { success: false, message: 'Too many API requests, please try again later.', error: 'API_RATE_LIMIT_EXCEEDED' },
  standardHeaders: true,
  legacyHeaders: false,
});
