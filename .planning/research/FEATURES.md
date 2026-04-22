# Feature Landscape: v3.0 Security Hardening + SaaS Readiness

**Domain:** SaaS tenant management with security hardening
**Researched:** 2026-04-22
**Overall confidence:** MEDIUM-HIGH

## Executive Summary

The v3.0 milestone addresses critical gaps in API security (no centralized auth helpers), registration validation (manual instead of Zod), email/password handling (no normalization or strength rules), and onboarding state (no completion tracking). These are standard SaaS patterns that the codebase currently handles inconsistently. Implementing centralized `requireSession`/`requireFactoryId`/`requireRole` helpers will eliminate repeated auth boilerplate and reduce the attack surface for tenant data leaks.

---

## 1. Auth Helper Pattern (requireSession / requireFactoryId / requireRole)

### Current State

Each API route independently calls `getSession()` and validates roles via ad-hoc checks:

```typescript
// Current pattern (repeated in every route)
const session = await getSession();
if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
if (session.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
```

The codebase has ~50 API routes with no centralized auth helpers. Some check `session`, some check `session.role`, some call `prisma.user.findUnique` to double-check. This inconsistency is the root cause of DATA-01 and DATA-02 tenant leaks referenced in v3.0 goals.

### Recommended Pattern

```typescript
// src/lib/auth-helpers.ts
import { getSession } from './auth';

export class AuthError extends Error {
  constructor(
    public status: number,
    public message: string,
    public code?: string
  ) { super(message); }
  static unauthorized() { return new AuthError(401, 'Unauthorized'); }
  static forbidden(msg = 'Forbidden') { return new AuthError(403, msg, 'FORBIDDEN'); }
}

export type UserRole = 'ADMIN' | 'ACCOUNTANT' | 'STAFF' | 'SUPER_ADMIN';

export async function requireSession() {
  const session = await getSession();
  if (!session) throw AuthError.unauthorized();
  return session;
}

export async function requireRole(...roles: UserRole[]) {
  const session = await requireSession();
  if (!roles.includes(session.role as UserRole)) throw AuthError.forbidden();
  return session;
}

export async function requireFactoryId(session: JWTPayload): Promise<string> {
  if (!session.factoryId) throw AuthError.forbidden('Factory context required');
  return session.factoryId;
}
```

**Usage in API routes:**
```typescript
export async function POST(req: NextRequest) {
  try {
    const session = await requireRole('ADMIN', 'ACCOUNTANT');
    const factoryId = await requireFactoryId(session);
    // ... proceed with factoryId-scoped logic
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
    throw e;
  }
}
```

**Complexity:** Low. Pattern is well-established. Refactors ~50 route handlers.

**Dependencies:** None (pure refactor, no new deps).

---

## 2. Zod Input Validation on Registration

### Current State

`/api/auth/register` uses manual if-length checks for validation (lines 20-42). No Zod usage. No schema reuse across login/register endpoints.

```typescript
// Current manual validation
if (email.length < registerSchema.email.minLength || email.length > registerSchema.email.maxLength) {
  return NextResponse.json({ error: 'Email không hợp lệ' }, { status: 400 });
}
```

### Recommended Pattern

```typescript
// src/lib/schemas/auth.ts
import { z } from 'zod';

export const RegisterSchema = z.object({
  email: z.string().email().max(100),
  password: z.string().min(8).max(100)
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[a-z]/, 'Must contain lowercase')
    .regex(/[0-9]/, 'Must contain number')
    .regex(/[^a-zA-Z0-9]/, 'Must contain special character'),
  name: z.string().min(2).max(100),
  phone: z.string().min(9).max(15).regex(/^[0-9+\-\s]+$/),
  factoryName: z.string().min(2).max(100),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
```

**Usage:**
```typescript
const parsed = RegisterSchema.safeParse(req.json());
if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
```

**Complexity:** Low-Medium. Zod is already in use (`src/lib/actions/orders.ts`, order status routes). Adding schemas is straightforward.

**Dependencies:** `zod` already installed.

---

## 3. Email Normalization

### Current State

Registration accepts email as-is. No case folding, no whitespace trimming, no domain standardization.

### Recommended Pattern

```typescript
// src/lib/utils/email.ts
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase().replace(/\.\+/g, '.');
}
```

Also handle Vietnamese input edge cases:
```typescript
email.trim().toLowerCase().normalize('NFC').replace(/[​-‍﻿]/g, '')
```

**Usage in register/login:** `const email = normalizeEmail(body.email);`

**Complexity:** Low. A single utility function.

---

## 4. Password Strength Validation

### Current State

Registration only checks `password.length < 6`. No complexity requirements.

### Recommended Pattern

Enforced via Zod `RegisterSchema` (above): 8+ chars with uppercase, lowercase, number, special character.

**Complexity:** Low. Enforced at schema level.

---

## 5. Onboarding State Tracking

### Current State

`/onboarding` page (CSV customer import) exists but has no completion tracking. A factory that registers but never visits `/onboarding` has no record of being "incomplete."

### Recommended Pattern (Soft Banner)

```typescript
// 1. Add field to Factory model via migration
// onboardingCompleted: boolean @default(false)
// onboardingCompletedAt: DateTime?

// 2. On successful CSV import, update flag
await prisma.factory.update({
  where: { id: factoryId },
  data: { onboardingCompleted: true, onboardingCompletedAt: new Date() }
});

// 3. Dashboard shows banner if !factory.onboardingCompleted
// (Non-blocking: speed over onboarding enforcement)
```

**Option B (Full Gate):** Redirect to `/onboarding` until completed. Not recommended — blocks office staff during peak season, contradicts "Speed over everything" core value.

**Complexity:** Medium. One DB field + one update call.

---

## Feature Summary Table

| Feature | Category | Complexity | Notes |
|---------|----------|------------|-------|
| requireSession / requireRole helpers | Table stakes | Low | Eliminates auth inconsistency across ~50 routes |
| requireFactoryId helper | Table stakes | Low | Prevents tenant data leaks |
| Zod schemas for all auth endpoints | Table stakes | Low | Consistent input validation |
| Email normalization utility | Table stakes | Low | Prevents account takeover via whitespace/case |
| Password strength enforcement | Table stakes | Low | Basic security requirement |
| Onboarding state (Factory.onboardingCompleted) | Table stakes | Medium | Enables follow-up with incomplete factories |

---

## Feature Dependencies

```
Auth helpers (requireSession)
    └── requireRole helper (uses requireSession internally)
    └── requireFactoryId helper (uses requireSession internally)

Zod schemas (auth)
    └── Email normalization utility (shared between register/login)

Onboarding state
    └── Factory model migration (add onboardingCompleted field)
    └── /onboarding route: set flag after CSV import success
```

---

## MVP Priority Order

1. **Auth helpers** — highest impact on security, lowest complexity. Refactors existing boilerplate across ~50 routes.
2. **Zod schemas** — eliminates manual validation in register/login endpoints.
3. **Email normalization** — one utility function, applied at every auth entry point.
4. **Password strength** — Zod schema change only, minimal effort.
5. **Onboarding flag** — one DB field + one update call.

**Defer:** Onboarding gate (blocks staff, contradicts "speed over everything")

---

## Sources

- Context7: `zod` library (schema validation patterns)
- Codebase: `src/app/api/auth/register/route.ts` (manual validation — needs Zod)
- Codebase: `src/app/api/auth/login/route.ts` (manual validation — needs Zod)
- Codebase: `src/lib/actions/orders.ts` (Zod usage example, MEDIUM confidence)
- Codebase: `src/app/api/orders/[id]/status/route.ts` (Zod usage example)
- Codebase: `src/middleware.ts` (session verification pattern — getSession, verifyJWT)
- Codebase: `src/lib/tenant.ts` (AsyncLocalStorage tenant context)