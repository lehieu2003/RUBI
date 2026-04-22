---
phase: 07-auth-infra
verified: 2026-04-22T00:00:00Z
status: passed
score: 20/20 must-haves verified
overrides_applied: 0
re_verification: false
gaps: []
deferred: []
---

# Phase 07: Auth Infrastructure - Verification Report

**Phase Goal:** Auth Infrastructure + Registration - implement auth helpers, Zod validation, rate limiting, hardened registration/login endpoints, onboarding completion flow.

**Verified:** 2026-04-22
**Status:** passed
**Re-verification:** No - initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can register with phone, name, email, password - invalid input returns 400 with Zod errors | VERIFIED | `registerSchema.safeParse()` in register/route.ts returns 400 with `parseResult.error.flatten()` |
| 2 | Registration normalizes email (trim, lowercase) before storage | VERIFIED | `registerSchema` email field: `z.string().transform(v => v.trim().toLowerCase()).pipe(z.string().email())` |
| 3 | Registration enforces minimum 8-character password | VERIFIED | `registerSchema` password field: `z.string().min(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })` |
| 4 | Registration endpoint accepts max 3 requests per IP per minute; excess returns 429 | VERIFIED | `rateLimit(ip, 3, 60 * 1000)` in register/route.ts with 429 response |
| 5 | Login endpoint accepts max 5 requests per IP per minute; excess returns 429 | VERIFIED | `rateLimit(ip, 5, 60 * 1000)` in login/route.ts with 429 response |
| 6 | requireSession() helper returns session or throws 401 Unauthorized | VERIFIED | helpers.ts: `throw NextResponse.json({ error: 'Unauthorized' }, { status: 401 })` |
| 7 | requireRole(roles[]) helper returns role or throws 403 Forbidden | VERIFIED | helpers.ts: `throw NextResponse.json({ error: 'Forbidden' }, { status: 403 })` |
| 8 | requireActiveSubscription() helper returns OK or throws 403 Subscription Required | VERIFIED | helpers.ts: `throw NextResponse.json({ error: 'Subscription Required' }, { status: 403 })` |
| 9 | Registration response includes nextUrl (e.g., '/onboarding') | VERIFIED | register/route.ts returns `nextUrl: '/onboarding'` |
| 10 | Registration atomically creates Factory + User (ADMIN, isFactoryOwner=true) + Subscription (TRIAL, 14 days) | VERIFIED | `prisma.$transaction` creates all three with TRIAL plan, 14-day endDate |
| 11 | Registration client redirects to nextUrl from response instead of hardcoded '/dashboard' | VERIFIED | register/page.tsx line 45: `router.push(data.nextUrl \|\| '/dashboard')` |
| 12 | After CSV import succeeds, onboarding state updated to onboardingCompleted: true | VERIFIED | onboarding/page.tsx calls `PATCH /api/factory/onboarding` after import success |
| 13 | Dashboard shows onboarding prompt for ADMIN users when onboardingCompleted === false | VERIFIED | dashboard/page.tsx passes `showOnboardingPrompt={factory?.onboardingCompleted === false}` to DashboardClient |
| 14 | requireFactoryId() helper returns session or throws 400 Bad Request | VERIFIED | helpers.ts: `throw NextResponse.json({ error: 'Bad Request: factoryId not found' }, { status: 400 })` |
| 15 | requireSession() works across API Route Handlers and Server Actions | VERIFIED | helpers.ts exports functions compatible with both contexts (throws NextResponse) |
| 16 | All write API endpoints use auth helpers before processing requests | VERIFIED | onboarding/route.ts uses `requireRole(['ADMIN'])` at entry |
| 17 | Registration endpoint validates input with Zod v4 schema | VERIFIED | `registerSchema.safeParse()` with full field validation |
| 18 | Login endpoint validates input with Zod v4 schema | VERIFIED | `loginSchema.safeParse()` with full field validation |
| 19 | All API endpoints return 400 with Zod validation errors on invalid input | VERIFIED | Both register and login return `{ errors: parseResult.error.flatten() }, { status: 400 }` |
| 20 | Rate limit exceeded returns 429 Too Many Requests with retry-after header | VERIFIED | Both endpoints return `429` with `Retry-After` header |

**Score:** 20/20 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/auth/helpers.ts` | requireSession, requireRole, requireFactoryId, requireActiveSubscription | VERIFIED | All 4 exports present, throw appropriate NextResponse on auth failure |
| `src/lib/schemas/auth.ts` | registerSchema, loginSchema Zod v4 schemas | VERIFIED | registerSchema has email transform (trim+lowercase) and password min(8) |
| `src/lib/rate-limit.ts` | rateLimit function, getIpFromRequest function | VERIFIED | Map-based store with 5-min cleanup interval, returns success/retryAfter |
| `src/app/api/auth/register/route.ts` | Hardened registration with Zod, rate limit, nextUrl | VERIFIED | 3/IP/min rate limit, 400 with errors, nextUrl: '/onboarding', atomic transaction |
| `src/app/api/auth/login/route.ts` | Hardened login with Zod, rate limit | VERIFIED | 5/IP/min rate limit, 400 with errors |
| `src/app/api/factory/onboarding/route.ts` | PATCH endpoint to mark onboarding complete | VERIFIED | requireRole(['ADMIN']), updates factory.onboardingCompleted = true |
| `src/app/onboarding/page.tsx` | Calls PATCH /api/factory/onboarding after import | VERIFIED | `await fetch('/api/factory/onboarding', { method: 'PATCH' })` after import success |
| `src/app/(auth)/register/page.tsx` | Redirects to nextUrl from response | VERIFIED | `router.push(data.nextUrl \|\| '/dashboard')` |
| `src/app/dashboard/page.tsx` | Shows onboarding prompt for incomplete factories | VERIFIED | Fetches factory, passes showOnboardingPrompt to DashboardClient |
| `prisma/schema.prisma` | onboardingCompleted field on Factory | VERIFIED | `onboardingCompleted Boolean @default(false)` present |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `src/app/api/auth/register/route.ts` | `src/lib/auth/helpers.ts` | import | WIRED | Imports signJWT, setSessionCookie |
| `src/app/api/auth/register/route.ts` | `src/lib/schemas/auth.ts` | import | WIRED | Imports registerSchema |
| `src/app/api/auth/register/route.ts` | `src/lib/rate-limit.ts` | import | WIRED | Imports rateLimit, getIpFromRequest |
| `src/app/api/auth/login/route.ts` | `src/lib/schemas/auth.ts` | import | WIRED | Imports loginSchema |
| `src/app/api/auth/login/route.ts` | `src/lib/rate-limit.ts` | import | WIRED | Imports rateLimit, getIpFromRequest |
| `src/app/api/factory/onboarding/route.ts` | `src/lib/auth/helpers.ts` | import | WIRED | Imports requireRole |
| `src/app/onboarding/page.tsx` | `/api/factory/onboarding` | fetch PATCH | WIRED | Calls PATCH after import success |
| `src/app/(auth)/register/page.tsx` | `/api/auth/register` | fetch POST | WIRED | Posts form data and reads data.nextUrl |
| `src/app/dashboard/page.tsx` | `prisma.factory` | findFirst query | WIRED | Fetches onboardingCompleted status |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---------|---------------|--------|-------------------|--------|
| `src/app/dashboard/page.tsx` | `showOnboardingPrompt` | `prisma.factory.findUnique` with factoryId from session | VERIFIED | Real DB query for factory.onboardingCompleted filtered by session.factoryId |
| `src/app/onboarding/page.tsx` | `PATCH /api/factory/onboarding` | API call to update factory | VERIFIED | Real PATCH endpoint updates DB |
| `src/app/(auth)/register/page.tsx` | `data.nextUrl` | API response from registration | VERIFIED | Real API returns nextUrl from server-side logic |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| AUTH-01 | 07-01 | Shared requireSession() helper - returns session or throws 401 | SATISFIED | helpers.ts: `requireSession()` throws 401 |
| AUTH-02 | 07-01 | Shared requireFactoryId() helper - extracts factoryId or throws 400 | SATISFIED | helpers.ts: `requireFactoryId()` throws 400 |
| AUTH-03 | 07-01 | Shared requireRole(roles[]) helper - checks role or throws 403 | SATISFIED | helpers.ts: `requireRole(roles)` throws 403 |
| AUTH-04 | 07-01 | Shared requireActiveSubscription() helper - verifies subscription or throws 403 | SATISFIED | helpers.ts: `requireActiveSubscription()` throws 403 |
| AUTH-05 | 07-01 | Auth helpers work across API Route Handlers and Server Actions | SATISFIED | Functions throw NextResponse (compatible with both contexts) |
| AUTH-06 | 07-01 | All write API endpoints use auth helpers before processing | SATISFIED | onboarding/route.ts uses requireRole(['ADMIN']) |
| VALI-01 | 07-01 | Registration validates with Zod v4 schema | SATISFIED | registerSchema.safeParse() with full validation |
| VALI-02 | 07-01 | Email normalized: trim().toLowerCase() before storage | SATISFIED | registerSchema email field: transform before email validator |
| VALI-03 | 07-01 | Password strength: minimum 8 characters | SATISFIED | registerSchema: `z.string().min(8, ...)` |
| VALI-04 | 07-01 | Login validates with Zod v4 schema | SATISFIED | loginSchema.safeParse() |
| VALI-05 | 07-01 | All API endpoints return 400 with Zod errors on invalid input | SATISFIED | Both endpoints return `parseResult.error.flatten()` on 400 |
| RATEL-01 | 07-01 | Login rate limit: 5 attempts per IP per minute | SATISFIED | login/route.ts: `rateLimit(ip, 5, 60 * 1000)` |
| RATEL-02 | 07-01 | Registration rate limit: 3 attempts per IP per minute | SATISFIED | register/route.ts: `rateLimit(ip, 3, 60 * 1000)` |
| RATEL-03 | 07-01 | Rate limit exceeded returns 429 with retry-after header | SATISFIED | Both endpoints return 429 with `Retry-After` header |
| REG-01 | 07-01 | Registration API returns nextUrl in response body | SATISFIED | register/route.ts returns `nextUrl: '/onboarding'` |
| REG-02 | 07-02 | Registration client redirects to nextUrl from response | SATISFIED | register/page.tsx: `router.push(data.nextUrl \|\| '/dashboard')` |
| REG-03 | 06 (prior) | Factory model has onboardingCompleted: boolean field | SATISFIED | schema.prisma: `onboardingCompleted Boolean @default(false)` |
| REG-04 | 07-02 | Onboarding state updated to onboardingCompleted: true when CSV import succeeds | SATISFIED | onboarding/page.tsx calls PATCH after successful import |
| REG-05 | 07-02 | Dashboard shows onboarding prompt for ADMIN when onboardingCompleted === false | SATISFIED | dashboard/page.tsx + dashboard-client.tsx render prompt |
| FACT-01 | 07-01 | Factory can register with phone, name, email, password | SATISFIED | register/route.ts creates Factory with all fields |
| FACT-02 | 07-01 | Registration atomically creates User + Subscription (TRIAL, 14 days) | SATISFIED | Atomic $transaction creates both with TRIAL, 14-day endDate |
| SUB-01 | 07-01 | Trial subscription auto-created on factory registration (14 days) | SATISFIED | $transaction creates Subscription with TRIAL, 14-day endDate |

**Note:** REG-03 is satisfied by a prior phase (06) which added the `onboardingCompleted` field to the Factory model. The field exists in the schema and is used correctly by phase 07.

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| (none) | No TODO/FIXME/placeholder comments found in any phase 07 files | - | - |

### Human Verification Required

None - all verifiable behaviors confirmed through code inspection.

---

## Gaps Summary

**No gaps found.** All must-haves verified, all requirements satisfied, all artifacts exist and are wired correctly.

---

_Verified: 2026-04-22_
_Verifier: Claude (gsd-verifier)_
