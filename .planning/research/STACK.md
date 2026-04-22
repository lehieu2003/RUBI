# Technology Stack Additions

**Project:** IceFlow SaaS v3.0 Security Hardening
**Researched:** 2026-04-22
**Confidence:** MEDIUM-HIGH (versions confirmed via package.json, patterns verified via codebase analysis)

---

## Summary

This milestone adds security hardening, auth helpers, registration improvements, and build fixes. Existing stack is sound. Additions are targeted: Zod v4 schemas, an in-memory rate limiter, Decimal serialization utilities, and three server-side auth helper functions.

---

## Recommended Stack Additions

### Auth Helpers (Server-Side)

**No new dependencies needed.** Build using existing `jose` + `getSession()` pattern.

```typescript
// src/lib/auth-helpers.ts (new file)

import { NextResponse } from 'next/server';
import { getSession, type JWTPayload } from './auth';

export type UserRole = 'ADMIN' | 'ACCOUNTANT' | 'STAFF' | 'SUPER_ADMIN';

/** Returns session payload or throws 401 */
export async function requireSession(): Promise<JWTPayload> {
  const session = await getSession();
  if (!session) {
    throw new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'application/json' }
    });
  }
  return session;
}

/** Returns session with factoryId, throws 401 if missing */
export async function requireFactoryId(): Promise<JWTPayload> {
  const session = await requireSession();
  if (!session.factoryId) {
    throw new Response(JSON.stringify({ error: 'Factory context required' }), {
      status: 403, headers: { 'Content-Type': 'application/json' }
    });
  }
  return session;
}

/** Returns session, throws 401 if role not in allowed list */
export async function requireRole(...allowed: UserRole[]): Promise<JWTPayload> {
  const session = await requireSession();
  if (!session.role || !allowed.includes(session.role as UserRole)) {
    throw new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
      status: 403, headers: { 'Content-Type': 'application/json' }
    });
  }
  return session;
}
```

**Why no library needed:** JWT verification already exists in `auth.ts`. Auth helpers are thin wrappers that add fail-closed behavior. Adding a library like `next-auth` or `clerk` would be overkill for this use case and conflict with the existing JWT cookie pattern.

**Integration:** Each API route handler replaces `getSession()` + manual null checks with `await requireSession()`. Example:

```typescript
// Before
const session = await getSession();
if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

// After
const session = await requireSession();
```

---

### Zod v4 Schema Validation (Registration)

**Dependency already present:** `zod: ^4.0.0`

Zod v4 is installed. Use it to replace the manual if-checks in `src/app/api/auth/register/route.ts` with a declarative schema.

```typescript
// src/lib/validators/auth.ts (new file)
import { z } from 'zod/v4';

export const registerSchema = z.object({
  email: z.email().min(5).max(100),
  password: z.string().min(6).max(100),
  name: z.string().min(2).max(100),
  phone: z.string().regex(/^[0-9]{9,15}$/, 'Số điện thoại không hợp lệ'),
  factoryName: z.string().min(2).max(100),
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});
```

**Why Zod v4 over manual validation:**
- Single source of truth for schema (can reuse on client with same types)
- Type inference: `z.infer<typeof registerSchema>` gives TypeScript types
- Built-in email validation (not in current manual checks)
- Consistent error messages with `z.error()` shape

**Integration:** Replace manual field validation with `registerSchema.parse()` in a try/catch:

```typescript
const result = registerSchema.safeParse(await req.json());
if (!result.success) {
  return NextResponse.json({ error: result.error.message }, { status: 400 });
}
```

Note: `z.email()` is the Zod v4 way to validate emails. Zod v3 used `z.string().email()`.

---

### Rate Limiting (Auth Endpoints)

**No new dependencies.** Use an in-memory `Map` with IP tracking.

```typescript
// src/lib/rate-limit.ts (new file)

type RateLimitEntry = { count: number; resetAt: number };

const store = new Map<string, RateLimitEntry>();

export function rateLimit(
  key: string,
  limit: number = 5,
  windowMs: number = 60 * 1000
): { success: boolean; remaining: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0 };
  }

  entry.count++;
  return { success: true, remaining: limit - entry.count };
}

export function getClientIP(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('cf-connecting-ip') ?? 'unknown';
}
```

**Why in-memory over Redis (Upstash):**
- Solo dev, single-instance deployment likely
- Auth endpoints (login/register) are low-traffic
- Vercel free tier does not preserve in-memory across cold starts, but this is acceptable for rate limiting auth endpoints (legitimate users retry after cooldown)
- If traffic grows, migrate to Upstash Redis later with minimal code changes

**Integration:** Apply to login and register routes:

```typescript
export async function POST(req: NextRequest) {
  const ip = getClientIP(req);
  const { success, remaining } = rateLimit(`auth:${ip}`, 5, 60 * 1000);

  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests. Try again later.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }

  // ... rest of handler
  // Add header: X-RateLimit-Remaining: ${remaining}
}
```

**Limits chosen:** 5 attempts per minute per IP. This prevents brute force without locking out legitimate users who mistype once.

---

### Prisma Decimal Serialization

**No new dependencies.** Build a utility using `Decimal` from `@prisma/client/runtime/library`.

```typescript
// src/lib/decimal.ts (new file)
import { Decimal } from '@prisma/client/runtime/library';

// Convert Prisma Decimal to string for JSON serialization
export function decimalToString(value: unknown): string {
  if (value instanceof Decimal) return value.toFixed(2);
  if (typeof value === 'number') return value.toFixed(2);
  return String(value ?? '0.00');
}

// Convert Prisma Decimal to number for calculations (use carefully)
export function decimalToNumber(value: unknown): number {
  if (value instanceof Decimal) return value.toNumber();
  return Number(value ?? 0);
}

// JSON serializer replacer for use in JSON.stringify
export function decimalReplacer(_key: string, value: unknown): unknown {
  if (value instanceof Decimal) return value.toFixed(2);
  return value;
}
```

**Why string over number for JSON:**
- `Decimal` has higher precision than IEEE 754 float (53 bits). Converting to `number` risks rounding errors on financial data like prices and totals.
- String preserves exact value. Client can parse with `parseFloat()` or a Decimal library.
- Vietnamese Dong amounts (50,000 - 500,000) fit in safe integer range, but prices per unit (e.g., 12,345.67) exceed two decimal places in float.

**Integration:** Two options:

**Option A - Per-response (simpler, recommended for v3.0):**
```typescript
return NextResponse.json({
  order: { ...order, total: decimalToString(order.total) }
});
```

**Option B - Global serializer in NextResponse (better for large responses):**
```typescript
const response = NextResponse.json({ order });
response.headers.set('Content-Type', 'application/json');
// Apply decimalReplacer to body...
```

**Recommendation:** Option A for now (surgical fix per endpoint), expand to Option B if Decimal issues become widespread.

---

## Alternative Considerations

| Area | Recommended | Alternative | Why Not |
|------|-------------|-------------|---------|
| Rate limiting | In-memory Map | Upstash Redis | Overkill for low-traffic auth endpoints, adds cost and complexity |
| Auth helpers | Custom functions | next-auth, clerk, Lucia | Conflicts with existing JWT cookie pattern, requires major refactor |
| Decimal serialization | String utility | Global toJSON hook | Prisma version compatibility issues, surgical fix is safer |
| Registration validation | Zod v4 | Valibot | Already using Zod, Valibot is similar but adds another dep |

---

## Integration Points

| New File | Replaces | Benefit |
|----------|----------|---------|
| `src/lib/auth-helpers.ts` | Manual `getSession()` + null checks in API routes | Consistent fail-closed auth across all endpoints |
| `src/lib/validators/auth.ts` | Manual if-checks in register/login routes | Declarative schemas, type inference, email validation |
| `src/lib/rate-limit.ts` | No existing rate limiting | Brute force protection on auth endpoints |
| `src/lib/decimal.ts` | Implicit Decimal serialization | Fixes JSON.stringify issues with Prisma Decimal fields |

---

## No New Dependencies Required

All additions use existing packages:

| Package | Version | Used For |
|---------|---------|---------|
| `zod` | `^4.0.0` | Registration schemas (`src/lib/validators/auth.ts`) |
| `@prisma/client` | `^6.0.0` | Decimal utilities (`src/lib/decimal.ts`) |
| `next` | `^15.1.0` | Auth helpers pattern (NextResponse, route handlers) |
| `jose` | `^6.2.2` | Already used in `src/lib/auth.ts` for JWT operations |

Existing Prisma $extends pattern (`src/lib/db.ts`) remains unchanged. The tenant filtering via `getTenantContext()` continues to work as-is.

---

## Sources

- [Zod v4 Documentation](https://zod.dev) (confirmed via package.json `zod: ^4.0.0`)
- [Prisma Decimal Handling](https://www.prisma.io/docs/orm/prisma-client/special-fields#decimals) (existing schema uses `@db.Decimal`)
- [Next.js Middleware Pattern](https://nextjs.org/docs/app/building-your-application/routing/middleware) (existing middleware.ts shows pattern)
- [Rate Limiting Strategies](https://vercel.com/docs/concepts/nextjs/rate-limiting) (Next.js documented approach)

---

*Generated: 2026-04-22*
*Downstream: gsd-planner — requires auth helper signatures, Zod schema patterns, rate limit configuration*