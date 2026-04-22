interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();
const WINDOW_MS = 60 * 1000; // 1 minute
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// Cleanup expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}, CLEANUP_INTERVAL_MS);

export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number = WINDOW_MS
): { success: true; remaining: number } | { success: false; retryAfter: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: maxRequests - 1 };
  }

  if (entry.count >= maxRequests) {
    return { success: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count++;
  return { success: true, remaining: maxRequests - entry.count };
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
