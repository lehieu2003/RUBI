---
phase: "07-auth-infra"
plan: "01"
subsystem: auth-infrastructure
tags:
  - auth
  - security
  - rate-limiting
  - zod
  - registration
  - login
dependency_graph:
  requires: []
  provides:
    - src/lib/auth/helpers.ts: requireSession, requireRole, requireFactoryId, requireActiveSubscription
    - src/lib/schemas/auth.ts: registerSchema, loginSchema
    - src/lib/rate-limit.ts: rateLimit, getIpFromRequest
  affects:
    - src/app/api/auth/register/route.ts
    - src/app/api/auth/login/route.ts
tech_stack:
  added:
    - zod (validation)
    - in-memory Map (rate limiting)
  patterns:
    - Zod v4 transform for email normalization
    - IP-based in-memory rate limiting with sliding window
    - Atomic factory+user+subscription creation via $transaction
key_files:
  created:
    - src/lib/auth/helpers.ts
    - src/lib/schemas/auth.ts
    - src/lib/rate-limit.ts
  modified:
    - src/app/api/auth/register/route.ts
    - src/app/api/auth/login/route.ts
decisions:
  - "Auth helpers throw NextResponse rather than returning errors for consistent API Route usage"
  - "Rate limiter keyed by IP only (per D-08) — handles office IP sharing"
  - "5-minute cleanup interval for expired rate limit entries (per D-52)"
  - "Email normalized via Zod transform (trim + lowercase) before validation"
metrics:
  duration: "~10 min"
  tasks_completed: 5
  files_changed: 5
  commits: 5
  completed_date: "2026-04-22"
---

# Phase 07 Plan 01: Auth Infrastructure - Summary

## One-liner

JWT auth hardening with Zod v4 validation, in-memory IP rate limiting, and atomic factory+user+subscription registration.

## What Was Built

### Auth Helpers (`src/lib/auth/helpers.ts`)

Four session helper functions exported for consistent use across API routes and Server Actions:

- `requireSession()` — returns session or throws 401 Unauthorized
- `requireRole(roles[])` — returns session or throws 403 Forbidden
- `requireFactoryId()` — returns session or throws 400 Bad Request
- `requireActiveSubscription()` — returns session or throws 403 Subscription Required (queries most recent subscription via `findFirst` ordered by `createdAt: 'desc'`)

### Zod Schemas (`src/lib/schemas/auth.ts`)

Two schemas with full type inference:

- `registerSchema` — email with transform (trim + lowercase), password min 8, name/phone/factoryName validation
- `loginSchema` — email and password with min validation
- Exported `RegisterInput` and `LoginInput` types via `z.infer`

### In-Memory Rate Limiter (`src/lib/rate-limit.ts`)

- `rateLimit(key, maxRequests, windowMs)` — returns `{ success: true, remaining: number }` or `{ success: false, retryAfter: number }`
- `getIpFromRequest(request)` — extracts IP from `x-forwarded-for` or `x-real-ip` header
- Map-based in-memory store with 5-minute cleanup interval for expired entries
- No external dependencies

### Hardened Registration (`src/app/api/auth/register/route.ts`)

- Rate limit: 3/IP/min, returns 429 with `Retry-After` header on excess
- Zod validation via `registerSchema.safeParse()` with flattened errors on 400
- Email already normalized by Zod transform — no manual normalization needed
- Password min 8 enforced via Zod schema
- Atomic `$transaction` creates Factory + User (ADMIN, isFactoryOwner=true) + Subscription (TRIAL, 14 days)
- Response includes `nextUrl: '/onboarding'`

### Hardened Login (`src/app/api/auth/login/route.ts`)

- Rate limit: 5/IP/min, returns 429 with `Retry-After` header on excess
- Zod validation via `loginSchema.safeParse()` with flattened errors on 400
- Existing bcrypt verify, JWT sign, and cookie set logic preserved

## Commits

| Hash | Message |
|------|---------|
| e1daee8 | feat(07-01): add auth helpers for session/role/factoryId/subscription checks |
| ecfd8e5 | feat(07-01): add Zod v4 auth schemas for registration and login |
| a6ca9dd | feat(07-01): add in-memory rate limiter with IP-based keying |
| 5e73be8 | feat(07-01): harden registration endpoint with Zod validation and rate limit |
| 734b85b | feat(07-01): harden login endpoint with Zod validation and rate limit |

## Success Criteria

| Criterion | Status |
|-----------|--------|
| `src/lib/auth/helpers.ts` exports requireSession, requireRole, requireFactoryId, requireActiveSubscription | PASS |
| `src/lib/schemas/auth.ts` exports registerSchema (with email transform + password min 8) and loginSchema | PASS |
| `src/lib/rate-limit.ts` exports rateLimit and getIpFromRequest; Map-based in-memory store with 5-min cleanup | PASS |
| Registration endpoint uses Zod validation, returns 400 with flattened errors on invalid input | PASS |
| Registration endpoint rate-limited to 3/IP/min, returns 429 with Retry-After on excess | PASS |
| Registration endpoint returns `nextUrl: '/onboarding'` in response body | PASS |
| Registration atomically creates Factory + User (ADMIN, isFactoryOwner=true) + Subscription (TRIAL, 14 days) | PASS |
| Login endpoint uses Zod validation, returns 400 with flattened errors on invalid input | PASS |
| Login endpoint rate-limited to 5/IP/min, returns 429 with Retry-After on excess | PASS |

## Deviations from Plan

None — plan executed exactly as written.

## Threat Flags

None — all threat mitigations (rate limiting, Zod validation, email normalization) were implemented as specified in the plan's threat model.

## Self-Check

- [PASS] All 4 auth helpers present in `src/lib/auth/helpers.ts`
- [PASS] `registerSchema` with email transform and password min 8 in `src/lib/schemas/auth.ts`
- [PASS] `loginSchema` present in `src/lib/schemas/auth.ts`
- [PASS] `rateLimit` and `getIpFromRequest` present in `src/lib/rate-limit.ts`
- [PASS] Registration rate limit 3/IP/min wired in `src/app/api/auth/register/route.ts`
- [PASS] Login rate limit 5/IP/min wired in `src/app/api/auth/login/route.ts`
- [PASS] `nextUrl: '/onboarding'` present in registration response
- [PASS] All 5 commits verified in git log
