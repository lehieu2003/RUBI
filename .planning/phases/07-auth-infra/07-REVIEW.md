---
phase: 07-auth-infra
reviewed: 2026-04-22T00:00:00Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - src/lib/auth/helpers.ts
  - src/lib/schemas/auth.ts
  - src/lib/rate-limit.ts
  - src/app/api/auth/register/route.ts
  - src/app/api/auth/login/route.ts
  - src/app/api/factory/onboarding/route.ts
  - src/app/onboarding/page.tsx
  - src/app/(auth)/register/page.tsx
  - src/app/dashboard/page.tsx
findings:
  critical: 1
  warning: 3
  info: 2
  total: 6
status: issues_found
---

# Phase 07: Code Review Report

**Reviewed:** 2026-04-22
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found

## Summary

Reviewed all 9 files from Phase 07 (auth infrastructure and onboarding completion). Found 1 critical security issue (account enumeration via error messages), 3 warnings (thrown Response objects, duplicate validation, generic anti-abuse concerns), and 2 info items (memory leak in dev, client-side validation drift).

## Critical Issues

### CR-001: Account enumeration via login error message

**File:** `src/app/api/auth/login/route.ts:33`
**Issue:** When login fails because email does not exist, the same generic error message is returned as when the password is wrong ("Email hoặc mật khẩu không đúng"). However, there is a timing leak: the bcrypt comparison only runs if the user exists, meaning an attacker can probe for valid emails by timing responses. Additionally, an attacker who knows a valid email can confirm its existence from the 401 response.
**Fix:**
```typescript
const user = await prisma.user.findUnique({ where: { email } });
if (!user) {
  // Sleep for consistent timing to prevent timing attacks
  await bcrypt.compare(password, '$2b$12$placeholder.hash.that.is.valid.for.timing');
  return NextResponse.json({ error: 'Email hoặc mật khẩu không đúng' }, { status: 401 });
}
```

## Warnings

### WR-001: Thrown Response objects in auth helpers

**File:** `src/lib/auth/helpers.ts:9,17,25,34,40`
**Issue:** Auth helpers throw `NextResponse.json()` objects directly as exceptions. This is non-standard JavaScript exception behavior (throws non-Error object). While Next.js App Router handles this, it makes error handling fragile. Callers must check `error instanceof Response` to distinguish from actual errors. If any caller catches with a broader pattern (e.g., `catch (e) { return NextResponse.json(...) }`), the thrown Response will be transformed into a 500 instead of the intended status code.
**Fix:** Use a custom error class or Next.js `next/navigation` redirect pattern instead:
```typescript
// Option 1: Custom AuthError
export class AuthError extends Error {
  constructor(public response: NextResponse) {
    super('Auth error');
    this.name = 'AuthError';
  }
}

// Option 2: In route handlers, check session before business logic
// rather than throwing from helpers
```

### WR-002: Duplicate factoryId validation in requireActiveSubscription

**File:** `src/lib/auth/helpers.ts:30-34`
**Issue:** `requireActiveSubscription` calls `requireFactoryId()` first (line 32), which already validates that `session.factoryId` exists. Then immediately after, it checks `if (!session.factoryId)` again (line 33), which is dead code since `requireFactoryId` would have already thrown if factoryId was missing.
**Fix:**
```typescript
export async function requireActiveSubscription() {
  const session = await requireSession();
  // requireSession returns session with factoryId potentially null
  // requireFactoryId would throw if factoryId needed, but here we just check subscription
  if (!session.factoryId) {
    throw NextResponse.json({ error: 'Bad Request: factoryId not found' }, { status: 400 });
  }
  // Remove duplicate requireFactoryId call and merge:
  // const session = await requireFactoryId(); // This already calls requireSession
  const subscription = await prisma.subscription.findFirst({...});
  // ...
}
```

### WR-003: x-forwarded-for header spoofing in rate limiter

**File:** `src/lib/rate-limit.ts:41-47`
**Issue:** `getIpFromRequest` trusts `x-forwarded-for` without validating against a trusted proxy list. Any client can set this header to bypass IP-based rate limiting. While this is a common anti-abuse measure (not a critical security control), it means the rate limiter can be trivially bypassed.
**Fix:**
```typescript
const TRUSTED_PROXIES = process.env.TRUSTED_PROXY_IPS?.split(',') ?? [];
const UNKNOWN_IP = 'unknown';

export function getIpFromRequest(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded && TRUSTED_PROXIES.length > 0) {
    const clientIp = forwarded.split(',')[0]?.trim();
    if (TRUSTED_PROXIES.includes(clientIp)) {
      return clientIp;
    }
  }
  return request.headers.get('x-real-ip') || UNKNOWN_IP;
}
```

## Info

### IN-001: Memory leak potential in development (setInterval)

**File:** `src/lib/rate-limit.ts:11-18`
**Issue:** In Next.js development mode with hot module replacement (HMR), the module is re-evaluated on changes. Each evaluation starts a new `setInterval`. The old interval continues running because the module reference is lost. Over many HMR cycles during development, this accumulates multiple cleanup intervals. This is not a production issue for serverless deployment but causes unnecessary CPU usage in dev.
**Fix:** Use a module-level flag to prevent multiple interval creation:
```typescript
let cleanupIntervalStarted = false;
if (!cleanupIntervalStarted) {
  cleanupIntervalStarted = true;
  setInterval(() => { ... }, CLEANUP_INTERVAL_MS);
}
```

### IN-002: Client-side validation shorter than server-side

**File:** `src/app/(auth)/register/page.tsx:21-29`
**Issue:** Client-side password validation at line 21 checks `password.length < 6`, but the Zod schema enforces `min(8)`. Users can submit the form with 6-7 character passwords, receive a 400 error from the API, and be confused about why. Similarly, client phone validation uses 9-15 range while server schema uses 9-15 but accepts other formats.
**Fix:** Align client validation with server schema or remove client-side validation and rely entirely on server-side Zod validation with client-side feedback.

---

_Reviewed: 2026-04-22_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
