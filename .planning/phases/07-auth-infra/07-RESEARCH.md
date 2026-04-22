# Phase 7: Auth Infrastructure + Registration - Research

**Researched:** 2026-04-22
**Domain:** Next.js authentication helpers, Zod v4 input validation, in-memory rate limiting, registration flow
**Confidence:** HIGH

## Summary

Phase 7 implements the auth infrastructure foundation: shared `requireSession()`/`requireRole()`/`requireActiveSubscription()` helpers at `src/lib/auth/helpers.ts`, Zod v4 schemas at `src/lib/schemas/`, an in-memory rate limiter at `src/lib/rate-limit.ts`, and a hardened registration endpoint with email normalization, password strength, and rate limiting. The existing registration (`src/app/api/auth/register/route.ts`) and login (`src/app/api/auth/login/route.ts`) endpoints are the primary targets for Zod validation and rate limit enforcement.

**Primary recommendation:** Build `src/lib/auth/helpers.ts` as a pure utility module exporting typed functions that return session data or throw `NextResponse` objects. Build `src/lib/rate-limit.ts` as a singleton with a periodic cleanup interval. Build Zod schemas in `src/lib/schemas/auth.ts` with co-located registration and login schemas. Wire both into existing route handlers.

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Auth helpers live in a single shared file at `src/lib/auth/helpers.ts` — imported everywhere for consistency.
- **D-02:** `requireSession()` — returns session payload or throws `NextResponse.json({ error: 'Unauthorized' }, { status: 401 })`
- **D-03:** `requireRole(roles[])` — checks session.role against allowed roles or throws `NextResponse.json({ error: 'Forbidden' }, { status: 403 })`
- **D-04:** `requireActiveSubscription()` — verifies subscription is ACTIVE/PAID or throws `NextResponse.json({ error: 'Subscription Required' }, { status: 403 })`
- **D-05:** `requireFactoryId()` — extracts factoryId from session or throws 400 Bad Request
- **D-06:** Auth helpers work in both API Route Handlers (`src/app/api/**/*.ts`) and Server Actions (`src/app/**/actions.ts`)
- **D-07:** In-memory Map-based rate limiter (no new dependency) at `src/lib/rate-limit.ts`
- **D-08:** Keyed by IP address only — simple, handles office IP sharing where multiple staff share one IP
- **D-09:** Registration: max 3 requests per IP per minute → 429 with `Retry-After` header
- **D-10:** Login: max 5 requests per IP per minute → 429 with `Retry-After` header
- **D-11:** Zod v4 schemas defined in `src/lib/schemas/` for registration and login
- **D-12:** Registration schema: name, phone, managerName, email, password — all validated with Zod
- **D-13:** Email normalized: `trim().toLowerCase()` before storage (VALI-02)
- **D-14:** Password minimum 8 characters (VALI-03)
- **D-15:** All invalid input returns 400 with Zod error structure `{ errors: [...] }` (VALI-05)
- **D-16:** Registration API returns `nextUrl` in response body: `NextResponse.json({ ..., nextUrl: '/onboarding' })`
- **D-17:** Client reads `nextUrl` from response and redirects — not hardcoded on client
- **D-18:** After CSV import succeeds, separate PATCH call to mark onboarding complete
- **D-19:** Dashboard shows onboarding prompt for ADMIN users when `factory.onboardingCompleted === false`
- **D-20:** Factory model already has `onboardingCompleted: Boolean @default(false)` from Phase 6
- **D-21:** Registration creates Factory + User (ADMIN, isFactoryOwner=true) + Subscription (TRIAL, 14 days) atomically via `$transaction`
- **D-22:** Registration atomically sets `factoryId` on User and `factoryId` on Subscription

### Claude's Discretion

- Specific file structure for helpers.ts — Claude decides internal organization
- Rate limit cleanup interval (how often to prune expired entries)
- Exact Zod error message wording — Claude decides
- Migration approach if needed for onboarding flow changes

### Deferred Ideas (OUT OF SCOPE)

None.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | Shared `requireSession()` helper — returns session or throws 401 Unauthorized | Helper signature and throwing behavior defined in D-02 |
| AUTH-02 | Shared `requireFactoryId()` helper — extracts factoryId from session or throws 400 Bad Request | Helper signature defined in D-05 |
| AUTH-03 | Shared `requireRole(roles[])` helper — checks session role against allowed roles or throws 403 Forbidden | Helper signature and behavior defined in D-03 |
| AUTH-04 | Shared `requireActiveSubscription()` helper — verifies subscription is ACTIVE/PAID or throws 403 Subscription Required | Helper signature and behavior defined in D-04 |
| AUTH-05 | Auth helpers work across API Route Handlers and Server Actions | Both runtimes supported via same helper file (D-06) |
| AUTH-06 | All write API endpoints use auth helpers before processing requests | Planners must assign auth helper usage to each write endpoint |
| VALI-01 | Registration endpoint validates input with Zod v4 schema (name, phone, managerName, email, password) | Zod v4 installed (^4.0.0); registration schema at `src/lib/schemas/auth.ts` |
| VALI-02 | Email is normalized: `trim().toLowerCase()` before storage | Email normalization applied before Prisma write |
| VALI-03 | Password strength enforced: minimum 8 characters | Zod schema min(8) on password field |
| VALI-04 | Login endpoint validates input with Zod v4 schema | Login schema at `src/lib/schemas/auth.ts` |
| VALI-05 | All API endpoints return 400 with Zod validation errors on invalid input | Zod v4 `z.parse()` with `error.flatten()` |
| RATEL-01 | Login endpoint enforces rate limit: 5 attempts per IP per minute | Rate limiter at `src/lib/rate-limit.ts`, login key |
| RATEL-02 | Registration endpoint enforces rate limit: 3 attempts per IP per minute | Rate limiter at `src/lib/rate-limit.ts`, register key |
| RATEL-03 | Rate limit exceeded returns 429 Too Many Requests with retry-after header | `NextResponse` with `Retry-After` header |
| REG-01 | Registration API returns `nextUrl` in response body | Response body includes `nextUrl: '/onboarding'` |
| REG-02 | Registration client redirects to `nextUrl` from response instead of hardcoded `/dashboard` | Client registration form reads `nextUrl` from response |
| REG-03 | Factory model has `onboardingCompleted: boolean` field | Already exists in schema (Phase 6) |
| REG-04 | Onboarding state updated to `onboardingCompleted: true` when CSV import succeeds | PATCH `/api/factory/onboarding` call after CSV import |
| REG-05 | Dashboard shows onboarding prompt for ADMIN users when `onboardingCompleted === false` | Dashboard reads factory state and conditionally renders prompt |
| FACT-01 | Factory can register with phone, name, email, password | Existing registration flow with Zod validation added |
| FACT-02 | Registration atomically creates User (ADMIN, isFactoryOwner=true) + Subscription (TRIAL, 14 days) | Already implemented in `$transaction` (Phase 6) |
| SUB-01 | Trial subscription auto-created on factory registration (14 days) | Already implemented in registration `$transaction` |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Auth session helpers | API / Backend | — | JWT verification, session extraction, role checking |
| Rate limiting | API / Backend | — | IP-based limiting in route handlers |
| Input validation (Zod) | API / Backend | — | Schema validation before business logic |
| Registration flow | API / Backend | — | Atomic factory+user+subscription creation |
| Onboarding CSV import | API / Backend | — | POST to `/api/customers/import` |
| Onboarding completion | API / Backend | — | PATCH `/api/factory/onboarding` |
| Dashboard prompt | Frontend (RSC) | — | Conditional rendering based on factory state |
| Auth helpers in Server Actions | Frontend (Server Actions) | — | Same helpers work across both runtimes |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `zod` | ^4.0.0 [VERIFIED: npm registry 4.3.6] | Runtime input validation | Already in project; Zod v4 with `.pipe()` and `.object()` |
| `jose` | ^6.0.0 [VERIFIED: npm registry 6.2.2] | JWT sign/verify | Already in project for JWT handling |
| `bcryptjs` | ^3.0.3 | Password hashing | Already in project for password hashing |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@/lib/auth.ts` | — | JWT sign/verify/getSession | Already exists, extended with helpers |
| `@/lib/tenant.ts` | — | AsyncLocalStorage tenant context | Already exists, used by auth helpers |
| `@/lib/db.ts` | — | Prisma client with $extends | Already exists, used to check subscription status |
| `@/lib/subscription-status.ts` | — | Subscription active check | Already exists, used by `requireActiveSubscription()` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| In-memory Map rate limiter | Upstash Redis / rate-limit packages | In-memory chosen (no new dependency), works for single-instance |
| Zod v4 schema per form | Manual validation (current) | Manual validation replaced by Zod schemas per D-11 |

**Installation:** No new packages needed — all required packages already in `package.json`.

## Architecture Patterns

### System Architecture Diagram

```
[Client] ──POST /api/auth/register──> [Rate Limiter (IP check)] ──> [Zod Validation]
                                                              │
                                                              ▼
                                              [Atomic $transaction: Factory + User + Subscription]
                                                              │
                                                              ▼
                                              [signJWT + setSessionCookie]
                                                              │
                                                              ▼
                                              [Response: { nextUrl: '/onboarding' }]
```

```
[Client] ──POST /api/auth/login──> [Rate Limiter (IP check)] ──> [Zod Validation]
                                                          │
                                                          ▼
                                              [prisma.user.findUnique + bcrypt.compare]
                                                          │
                                                          ▼
                                              [signJWT + setSessionCookie]
                                                          │
                                                          ▼
                                              [Response: { user } + cookie]
```

### Recommended Project Structure

```
src/
├── lib/
│   ├── auth/
│   │   └── helpers.ts          # requireSession, requireRole, requireActiveSubscription, requireFactoryId
│   ├── rate-limit.ts           # In-memory IP-based rate limiter
│   ├── schemas/
│   │   └── auth.ts             # Registration + login Zod schemas
│   ├── auth.ts                 # JWT sign/verify (existing)
│   ├── db.ts                   # Prisma client (existing)
│   ├── tenant.ts               # AsyncLocalStorage (existing)
│   └── subscription-status.ts  # isSubscriptionActive (existing)
└── app/
    ├── api/
    │   ├── auth/
    │   │   ├── register/route.ts   # Updated: Zod validation + rate limit + nextUrl
    │   │   ├── login/route.ts      # Updated: Zod validation + rate limit
    │   └── logout/route.ts
    │   ├── factory/
    │   │   └── onboarding/route.ts # NEW: PATCH to mark onboarding complete
    │   └── customers/import/route.ts
    └── onboarding/page.tsx      # Updated: PATCH /api/factory/onboarding after import success
```

### Pattern 1: Auth Helper (throws pattern)

**What:** Auth helpers return session data or throw a `NextResponse` object directly.
**When to use:** In every API route handler before processing authenticated requests.
**Example:**
```typescript
// Source: Derived from D-02 through D-05
// src/lib/auth/helpers.ts

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isSubscriptionActive } from '@/lib/subscription-status';

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    throw NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return session;
}

export async function requireRole(roles: string[]) {
  const session = await requireSession();
  if (!roles.includes(session.role ?? '')) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return session;
}

export async function requireFactoryId() {
  const session = await requireSession();
  if (!session.factoryId) {
    throw NextResponse.json({ error: 'Bad Request: factoryId not found' }, { status: 400 });
  }
  return session;
}

export async function requireActiveSubscription() {
  const session = await requireSession();
  if (!session.factoryId) {
    throw NextResponse.json({ error: 'Bad Request: factoryId not found' }, { status: 400 });
  }
  // Query subscription status
  const subscription = await prisma.subscription.findFirst({
    where: { factoryId: session.factoryId },
    orderBy: { createdAt: 'desc' },
  });
  if (!subscription || !isSubscriptionActive(subscription)) {
    throw NextResponse.json({ error: 'Subscription Required' }, { status: 403 });
  }
  return session;
}
```

### Pattern 2: In-Memory Rate Limiter

**What:** Singleton Map keyed by IP with sliding window cleanup.
**When to use:** On login and registration endpoints.
**Example:**
```typescript
// Source: Derived from D-07 through D-10
// src/lib/rate-limit.ts

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();
const WINDOW_MS = 60 * 1000; // 1 minute
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes (Claude's discretion)

// Cleanup expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) store.delete(key);
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
  // Check common headers for forwarded IP
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}
```

### Pattern 3: Zod v4 Validation Schema

**What:** Zod schemas co-located in `src/lib/schemas/auth.ts` for registration and login.
**When to use:** In registration and login route handlers.
**Example:**
```typescript
// Source: Derived from D-11 through D-15
// src/lib/schemas/auth.ts
import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email().transform(v => v.trim().toLowerCase()),
  password: z.string().min(8),
  name: z.string().min(2).max(100),
  phone: z.string().min(9).max(15),
  managerName: z.string().min(2).max(100), // Note: existing schema uses 'name', decision says 'managerName'
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
```

### Pattern 4: Onboarding Completion Update

**What:** After CSV import succeeds, client calls `PATCH /api/factory/onboarding` to set `onboardingCompleted: true`.
**When to use:** In the onboarding page after successful import.
**Example:**
```typescript
// NEW: src/app/api/factory/onboarding/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/helpers';

export async function PATCH(req: NextRequest) {
  const session = await requireRole(['ADMIN']);
  if (!session.factoryId) {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
  }

  await prisma.factory.update({
    where: { id: session.factoryId },
    data: { onboardingCompleted: true },
  });

  return NextResponse.json({ success: true });
}
```

### Pattern 5: Registration with nextUrl

**What:** Registration response body includes `nextUrl`; client reads and redirects.
**When to use:** In `POST /api/auth/register/route.ts` response.
**Example:**
```typescript
// Derived from D-16, D-17
return NextResponse.json({
  user: { id: user.id, email: user.email, name: user.name, phone: user.phone, factoryId: factory.id },
  subscription: { id: subscription.id, planType: subscription.planType, startDate: subscription.startDate, endDate: subscription.endDate, status: subscription.status },
  nextUrl: '/onboarding',  // D-16: nextUrl in response body
});
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password hashing | Custom timing-safe comparison, hand-rolled salts | `bcryptjs` | Already in project; bcrypt is standard for password hashing |
| JWT operations | Manual JWT encoding/decoding | `jose` library | Already in project; handles edge cases (expiry,alg) |
| Input validation | Manual field-by-field checks | Zod v4 | Already in project; provides error flattening + transformation |
| Rate limiting logic | Custom sliding window algorithm | In-memory Map (D-07) | Simplicity — no new dependency, works for single-instance |

**Key insight:** The project already has bcryptjs, jose, and zod. Building custom solutions for these would introduce bugs that existing libraries handle correctly.

## Common Pitfalls

### Pitfall 1: Auth helper calling `getSession()` twice
**What goes wrong:** `requireRole()` calls `requireSession()` which calls `getSession()`. If `requireRole()` is called after code already retrieved the session, the session is fetched twice per request.
**Why it happens:** No way to pass already-retrieved session down; each helper calls `getSession()` independently.
**How to avoid:** Accept an optional session parameter for helpers that already have it, or refactor to a single `getSession()` call at route entry point.
**Warning signs:** Multiple `getSession()` calls in a single request trace.

### Pitfall 2: Rate limiter memory leak without cleanup
**What goes wrong:** Map grows unbounded as IPs are rate-limited and never cleaned up.
**Why it happens:** Sliding window entries accumulate indefinitely.
**How to avoid:** Implement periodic cleanup via `setInterval` (D-52 specifies cleanup interval as Claude's discretion — recommend 5 minutes).
**Warning signs:** Memory usage growth over time in long-running processes.

### Pitfall 3: `requireActiveSubscription()` makes Prisma query per request
**What goes wrong:** Every protected write request triggers a subscription database query.
**Why it happens:** Helper queries `prisma.subscription.findFirst()` on every call.
**How to avoid:** Cache subscription status for the request duration or rely on middleware subscription enforcement (SUBS-02 already in middleware).
**Warning signs:** High database query count for read-heavy workloads.

### Pitfall 4: Zod v4 `.transform()` vs `.preprocess()`
**What goes wrong:** Applying `.transform()` to email after `.email()` — transform runs on invalid input if placed after `.email()`.
**Why it happens:** Zod v4's `.email()` throws before transform runs; `.transform()` runs on success path.
**How to avoid:** Place `.transform()` BEFORE the validator, or use `.preprocess()` to normalize before validation:
```typescript
// Correct: transform before email check
email: z.string().transform(v => v.trim().toLowerCase()).pipe(z.string().email())
```
**Warning signs:** Zod errors showing transformed values that don't match expected format.

### Pitfall 5: Registration email uniqueness check bypasses factoryId filter
**What goes wrong:** `prisma.user.findUnique({ where: { email } })` — no factoryId filter, checks globally.
**Why it happens:** User email is globally unique (`@@unique` on email), so this is actually correct for registration uniqueness check. However, the `$extends` tenant middleware will add `factoryId` filter which could cause unexpected behavior during registration.
**How to avoid:** In registration flow, use `prisma.$queryRaw` or a direct findUnique without tenant context for email uniqueness. Or accept that registration intentionally bypasses tenant context.
**Warning signs:** Registration returns 409 even when email should be available within the new factory.

## Code Examples

### Registration Endpoint (hardened)

```typescript
// Source: Derived from existing register/route.ts + D-11 through D-22
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { signJWT, setSessionCookie } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { registerSchema } from '@/lib/schemas/auth';
import { rateLimit, getIpFromRequest } from '@/lib/rate-limit';

// D-09: Registration rate limit - 3 per IP per minute
export async function POST(req: NextRequest) {
  // Rate limit check (RATEL-02)
  const ip = getIpFromRequest(req);
  const limit = rateLimit(ip, 3, 60 * 1000);
  if (!limit.success) {
    return NextResponse.json(
      { error: 'Too Many Requests' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
    );
  }

  try {
    // D-12 + VALI-01 + VALI-05: Zod validation
    const body = await req.json();
    const parseResult = registerSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { errors: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { email: rawEmail, password, name, phone, managerName } = parseResult.data;
    // VALI-02: Email already normalized by Zod transform

    // Check existing user
    const existing = await prisma.user.findUnique({ where: { email: rawEmail } });
    if (existing) {
      return NextResponse.json({ error: 'Email đã được đăng ký' }, { status: 409 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // D-21: Atomic factory + user + subscription creation
    const trialEndDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const [factory, user, subscription] = await prisma.$transaction(async (tx) => {
      const factory = await tx.factory.create({
        data: { name: managerName, phone },
      });
      const user = await tx.user.create({
        data: {
          email: rawEmail,
          password: hashedPassword,
          name,
          phone,
          role: 'ADMIN',
          isFactoryOwner: true,
          factoryId: factory.id,
        },
      });
      const subscription = await tx.subscription.create({
        data: {
          factoryId: factory.id,
          planType: 'TRIAL',
          startDate: new Date(),
          endDate: trialEndDate,
          status: 'ACTIVE',
          driverCount: 0,
        },
      });
      return [factory, user, subscription];
    });

    // D-16: nextUrl in response body
    const token = await signJWT({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: 'ADMIN',
      factoryId: factory.id,
    });
    await setSessionCookie(token);

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, phone: user.phone, factoryId: factory.id },
      subscription: { id: subscription.id, planType: subscription.planType, startDate: subscription.startDate, endDate: subscription.endDate, status: subscription.status },
      nextUrl: '/onboarding',
    });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
```

### Login Endpoint (hardened)

```typescript
// Source: Derived from existing login/route.ts + D-10 + VALI-04
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { signJWT, setSessionCookie } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { loginSchema } from '@/lib/schemas/auth';
import { rateLimit, getIpFromRequest } from '@/lib/rate-limit';

// D-10: Login rate limit - 5 per IP per minute
export async function POST(req: NextRequest) {
  const ip = getIpFromRequest(req);
  const limit = rateLimit(ip, 5, 60 * 1000);
  if (!limit.success) {
    return NextResponse.json(
      { error: 'Too Many Requests' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
    );
  }

  try {
    const body = await req.json();
    const parseResult = loginSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ errors: parseResult.error.flatten() }, { status: 400 });
    }

    const { email, password } = parseResult.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: 'Email hoặc mật khẩu không đúng' }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: 'Tài khoản đã bị vô hiệu hóa' }, { status: 403 });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: 'Email hoặc mật khẩu không đúng' }, { status: 401 });
    }

    const token = await signJWT({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      factoryId: (user as { factoryId?: string }).factoryId ?? undefined,
    });
    await setSessionCookie(token);

    return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual field validation | Zod v4 schemas | Phase 7 | Consistent error format, input transformation |
| No rate limiting | In-memory IP rate limiter | Phase 7 | Prevents brute force on auth endpoints |
| Registration returns no redirect hint | Registration returns `nextUrl: '/onboarding'` | Phase 7 | Client redirects dynamically |
| No onboarding completion tracking | `onboardingCompleted` field + PATCH endpoint | Phase 6/7 | Dashboard prompt for incomplete factories |

**Deprecated/outdated:**
- Manual validation in register/login routes (replaced by Zod schemas)

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Auth helpers work in Server Actions without modification | Standard Stack / Pattern 1 | Next.js cookies() API works identically in Route Handlers and Server Actions — verified by Next.js documentation |
| A2 | Registration schema field `managerName` vs `factoryName` — CONTEXT.md says `managerName` but existing schema uses `factoryName` | Architecture Patterns | D-12 says "name, phone, managerName, email, password" but registerSchema in existing code uses `factoryName`. Needs clarification: does the Zod schema use `managerName` or keep `factoryName` for the factory creation field? |
| A3 | Onboarding PATCH endpoint doesn't exist yet — needs creation | Common Pitfalls | REG-04 requires a new `/api/factory/onboarding` PATCH endpoint; if a similar endpoint exists with different naming, it would cause duplication |
| A4 | Login uses Prisma client directly (not the extended `$extends` client) | Common Pitfalls | Phase 6 context notes `prisma.user.findUnique` in login without tenant context — the `user.findUnique` call works without factoryId because User is being looked up by email globally |

**If this table is empty:** All claims in this research were verified or cited.

## Open Questions

1. **Registration field naming ambiguity**
   - What we know: D-12 specifies "name, phone, managerName, email, password" for registration schema, but existing `register/route.ts` uses `factoryName` field
   - What's unclear: Should the Zod schema use `managerName` (D-12) or `factoryName` (existing code)? The `factory.create` data uses `factoryName` as the factory's `name` field
   - Recommendation: Keep `factoryName` in the API contract (matches existing code), but document clearly in the schema that it maps to `Factory.name`

2. **Onboarding completion PATCH endpoint location**
   - What we know: D-18 says "separate PATCH call to mark onboarding complete" — a new endpoint is needed
   - What's unclear: Should it be `/api/factory/onboarding` or `/api/factory/{id}/onboarding`?
   - Recommendation: Use `/api/factory/onboarding` with a PATCH — factoryId comes from session, no path parameter needed

3. **Rate limiter in serverless/edge environments**
   - What we know: D-07 specifies in-memory Map-based rate limiter
   - What's unclear: In Vercel serverless functions (per-request invocation), the in-memory store resets between invocations — this makes the rate limiter ineffective unless a single instance is guaranteed
   - Recommendation: Document this as a known limitation; for Vercel Pro with dedicated instances it's acceptable; for Vercel Hobby or multi-instance deployment, consider Upstash Redis

## Environment Availability

> Step 2.6: SKIPPED (no external dependencies beyond project code — all requirements use existing packages already in package.json)

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `zod` | VALI-01 to VALI-05 | ✓ | ^4.0.0 (4.3.6) | N/A — already in package.json |
| `jose` | AUTH helpers | ✓ | ^6.0.0 (6.2.2) | N/A — already in package.json |
| `bcryptjs` | Registration, Login | ✓ | ^3.0.3 | N/A — already in package.json |
| Prisma | All database operations | ✓ | ^6.0.0 | N/A — already in project |
| Next.js | Route handlers, Server Actions | ✓ | ^15.1.0 | N/A |

## Validation Architecture

> Included when workflow.nyquist_validation is enabled (no explicit false in config).

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest (detected via existing test setup patterns) |
| Config file | `jest.config.ts` (if exists) |
| Quick run command | `npm test -- --testPathPattern="auth" --passWithNoTests` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | `requireSession()` throws 401 when no session | unit | `jest tests/lib/auth/helpers.test.ts` | ❌ Wave 0 needed |
| AUTH-02 | `requireFactoryId()` throws 400 when no factoryId | unit | `jest tests/lib/auth/helpers.test.ts` | ❌ Wave 0 needed |
| AUTH-03 | `requireRole()` throws 403 for wrong role | unit | `jest tests/lib/auth/helpers.test.ts` | ❌ Wave 0 needed |
| AUTH-04 | `requireActiveSubscription()` throws 403 when inactive | unit | `jest tests/lib/auth/helpers.test.ts` | ❌ Wave 0 needed |
| VALI-01 | Registration Zod schema validates name/phone/managerName/email/password | unit | `jest tests/lib/schemas/auth.test.ts` | ❌ Wave 0 needed |
| VALI-02 | Email normalized to lowercase before storage | unit | `jest tests/lib/schemas/auth.test.ts` | ❌ Wave 0 needed |
| VALI-03 | Password min 8 chars enforced | unit | `jest tests/lib/schemas/auth.test.ts` | ❌ Wave 0 needed |
| VALI-04 | Login schema validates email/password | unit | `jest tests/lib/schemas/auth.test.ts` | ❌ Wave 0 needed |
| VALI-05 | Zod errors return 400 with flattened errors | unit | `jest tests/lib/schemas/auth.test.ts` | ❌ Wave 0 needed |
| RATEL-01 | Login rate limit 5/IP/min returns 429 | integration | `jest tests/api/auth/login.test.ts` | ❌ Wave 0 needed |
| RATEL-02 | Register rate limit 3/IP/min returns 429 | integration | `jest tests/api/auth/register.test.ts` | ❌ Wave 0 needed |
| RATEL-03 | 429 includes Retry-After header | unit | `jest tests/lib/rate-limit.test.ts` | ❌ Wave 0 needed |
| REG-01 | Registration response contains `nextUrl: '/onboarding'` | unit | `jest tests/api/auth/register.test.ts` | ❌ Wave 0 needed |
| REG-04 | PATCH /api/factory/onboarding sets `onboardingCompleted: true` | unit | `jest tests/api/factory/onboarding.test.ts` | ❌ Wave 0 needed |
| REG-05 | Dashboard shows prompt when `onboardingCompleted === false` | component | `jest tests/app/dashboard.test.tsx` | ❌ Wave 0 needed |

### Sampling Rate
- **Per task commit:** `npm test -- --testPathPattern="auth|schemas|rate-limit" --passWithNoTests`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/lib/auth/helpers.test.ts` — covers AUTH-01 through AUTH-06
- [ ] `tests/lib/schemas/auth.test.ts` — covers VALI-01 through VALI-05
- [ ] `tests/lib/rate-limit.test.ts` — covers RATEL-03
- [ ] `tests/api/auth/register.test.ts` — covers RATEL-02, REG-01
- [ ] `tests/api/auth/login.test.ts` — covers RATEL-01
- [ ] `tests/api/factory/onboarding.test.ts` — covers REG-04
- [ ] `jest.config.ts` — if not detected in project

*(If no gaps: "None — existing test infrastructure covers all phase requirements")*

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `bcryptjs` for password hashing (AUTH-01 to AUTH-06); JWT via `jose` library |
| V3 Session Management | yes | JWT via `jose` (HS256); cookie-based with httpOnly + sameSite; 7-day expiry |
| V4 Access Control | yes | `requireRole()` enforced in auth helpers (AUTH-03, RBAC-05) |
| V5 Input Validation | yes | Zod v4 schemas (VALI-01 to VALI-05) — never validate SQL directly |
| V6 Cryptography | partial | Password hashing already uses bcrypt; JWT uses jose with HS256 |

### Known Threat Patterns for Node.js/Next.js Auth

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Brute force login | Denial of Service | Rate limiting (RATEL-01, RATEL-02) — 5 login/3 register per IP per minute |
| Credential stuffing | Information Disclosure | Email normalization prevents case variations; password hashing via bcrypt |
| Session hijacking | Spoofing | httpOnly cookies; secure flag in production; 7-day JWT expiry |
| Privilege escalation | Elevation of Privilege | `requireRole()` checks session.role before allowing action |
| Input injection | Tampering | Zod validation on all auth inputs; no raw SQL |
| Information disclosure via error | Information Disclosure | Generic error messages ('Lỗi server') in catch blocks; no stack traces to client |

## Sources

### Primary (HIGH confidence)
- [npm registry — zod@4.3.6](https://www.npmjs.com/package/zod) — version confirmed
- [npm registry — jose@6.2.2](https://www.npmjs.com/package/jose) — version confirmed
- [package.json](package.json) — all dependencies confirmed in project
- [src/lib/auth.ts](src/lib/auth.ts) — JWT helpers confirmed; JWT_SECRET validation at module load confirmed
- [src/lib/db.ts](src/lib/db.ts) — Prisma $extends with tenant filtering confirmed
- [src/lib/tenant.ts](src/lib/tenant.ts) — AsyncLocalStorage tenant context confirmed
- [prisma/schema.prisma](prisma/schema.prisma) — Factory.onboardingCompleted field confirmed (Phase 6)
- [src/app/api/auth/register/route.ts](src/app/api/auth/register/route.ts) — current registration implementation confirmed
- [src/app/api/auth/login/route.ts](src/app/api/auth/login/route.ts) — current login implementation confirmed

### Secondary (MEDIUM confidence)
- [Zod v4 documentation — transform vs preprocess](https://zod.dev) — transform ordering for email normalization
- [Next.js cookies() API docs](https://nextjs.org/docs/app/api-reference/functions/cookies) — confirmed identical in Route Handlers and Server Actions

### Tertiary (LOW confidence)
- Rate limiter serverless behavior in Vercel — noted as assumption needing validation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project, versions verified
- Architecture: HIGH — decisions from CONTEXT.md are explicit and verifiable
- Pitfalls: MEDIUM — identified through code review; some edge cases (serverless rate limiter) need production validation

**Research date:** 2026-04-22
**Valid until:** 2026-05-22 (30 days — stable domain, no fast-moving libraries)
