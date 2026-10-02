import Redis from 'ioredis';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const WINDOW_MS = 60 * 1000; // 1 minute
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// In-memory store — used when REDIS_URL is not configured. Per-process only:
// with more than one instance the limits are enforced per instance.
const store = new Map<string, RateLimitEntry>();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}, CLEANUP_INTERVAL_MS);

// Shared Redis store — used when REDIS_URL is set, so limits hold across
// every instance of the deployment.
let redisClient: Redis | null = null;
let redisDisabled = false;

function getRedis(): Redis | null {
  if (!process.env.REDIS_URL) return null;
  if (redisDisabled) return null;
  if (!redisClient) {
    try {
      redisClient = new Redis(process.env.REDIS_URL, {
        lazyConnect: false,
        maxRetriesPerRequest: 1,
      });
      redisClient.on('error', () => {
        // Connection problems fall back to the in-memory limiter silently —
        // partial protection beats failing every request with a 500.
        if (!redisDisabled) {
          redisDisabled = true;
          console.warn('[rate-limit] Redis unavailable, falling back to in-memory limiter');
        }
      });
    } catch {
      redisDisabled = true;
      return null;
    }
  }
  return redisClient;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  retryAfter: number;
}

function memoryLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: maxRequests - 1, retryAfter: 0 };
  }

  if (entry.count >= maxRequests) {
    return {
      success: false,
      remaining: 0,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count++;
  return { success: true, remaining: maxRequests - entry.count, retryAfter: 0 };
}

async function redisLimit(
  redis: Redis,
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<RateLimitResult> {
  const redisKey = `ratelimit:${key}`;
  const count = await redis.incr(redisKey);
  if (count === 1) {
    await redis.pexpire(redisKey, windowMs);
  }

  if (count > maxRequests) {
    const ttl = await redis.pttl(redisKey);
    return {
      success: false,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil((ttl > 0 ? ttl : windowMs) / 1000)),
    };
  }

  return { success: true, remaining: maxRequests - count, retryAfter: 0 };
}

/**
 * Fixed-window rate limiter. Backed by Redis when REDIS_URL is configured
 * (holds across every instance), otherwise by a per-process in-memory store.
 */
export async function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number = WINDOW_MS
): Promise<RateLimitResult> {
  const redis = getRedis();
  if (redis) {
    try {
      return await redisLimit(redis, key, maxRequests, windowMs);
    } catch {
      // Redis hiccup: degrade to in-memory instead of rejecting traffic.
    }
  }
  return memoryLimit(key, maxRequests, windowMs);
}

export function getIpFromRequest(request: Request): string {
  const TRUSTED_PROXIES = process.env.TRUSTED_PROXY_IPS?.split(',') ?? [];
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded && TRUSTED_PROXIES.length > 0) {
    const clientIp = forwarded.split(',')[0]?.trim();
    if (TRUSTED_PROXIES.includes(clientIp)) {
      return clientIp;
    }
  }
  return request.headers.get('x-real-ip') || 'unknown';
}
