import 'dotenv/config';
import type { RedisOptions } from 'ioredis';

/** BullMQ queue name — MUST match the name the API enqueues to. */
export const QUEUE_NAME = 'webhook-delivery';

function parseRedisUrl(url: string): { host: string; port: number } | undefined {
  try {
    const u = new URL(url);
    return {
      host: u.hostname || 'localhost',
      port: u.port ? Number(u.port) : 6379,
    };
  } catch {
    return undefined;
  }
}

const fromUrl = process.env.REDIS_URL ? parseRedisUrl(process.env.REDIS_URL) : undefined;

/**
 * Redis connection options for BullMQ. Prefers REDIS_HOST / REDIS_PORT and
 * falls back to parsing REDIS_URL. `maxRetriesPerRequest: null` is required by
 * BullMQ for blocking commands.
 */
export const redisConnection: RedisOptions = {
  host: process.env.REDIS_HOST || fromUrl?.host || 'localhost',
  port: process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : fromUrl?.port ?? 6379,
  maxRetriesPerRequest: null,
};

/** Worker concurrency (default 5). */
export const WORKER_CONCURRENCY = process.env.WORKER_CONCURRENCY
  ? Number(process.env.WORKER_CONCURRENCY)
  : 5;

/**
 * CIDR ranges explicitly allowed as webhook targets even though they fall in a
 * normally-blocked private/reserved range. Comma-separated; empty = block all.
 */
export const WEBHOOK_ALLOWED_PRIVATE_CIDRS = (process.env.WEBHOOK_ALLOWED_PRIVATE_CIDRS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
