# Project Research Summary

**Project:** IceFlow SaaS v3.0 Security Hardening + SaaS Readiness
**Domain:** Multi-tenant SaaS for ice factories — security hardening milestone
**Researched:** 2026-04-22
**Confidence:** MEDIUM-HIGH

## Executive Summary

The v3.0 milestone addresses critical gaps in API security and multi-tenant isolation. The codebase currently operates as single-tenant with `factoryId` on `Subscription` and `User` but absent from core business entities (`Order`, `Customer`, `Driver`, `Product`, `Inventory`). The existing `$extends` Prisma extension auto-injects `factoryId` filters silently, but when `ctx.factoryId` is null, queries return all data across all factories — a critical data leak. Recommended approach: explicit `where: { factoryId }` as primary contract, auth helpers (`requireSession`, `requireFactoryId`, `requireRole`) as fail-closed enforcement, and `$extends` as safety net only.

Auth hardening adds requireSession/requireRole helpers, Zod v4 schemas for registration, email normalization, password strength rules, and rate limiting on auth endpoints. All additions use existing packages — no new dependencies. Onboarding state tracks via `Factory.onboardingCompleted` boolean field rather than a separate table.

## Key Findings

### Recommended Stack

**Core technologies:**
- **Auth helpers** (`src/lib/auth-helpers.ts`) — `requireSession()`, `requireFactoryId()`, `requireRole()`, `requireActiveSubscription()` as fail-closed wrappers. No new deps — uses existing `jose` + `getSession()` pattern.
- **Zod v4** — Already installed (`zod: ^4.0.0`). Replace manual if-checks in register/login with declarative schemas. `z.email()` for validation (Zod v4 syntax).
- **In-memory rate limiting** — `Map`-based rate limiter for auth endpoints. 5 attempts/minute per IP. No new dependency needed.
- **Decimal serialization** — String utilities for Prisma Decimal fields to prevent JSON.stringify issues.

**No new dependencies required.** All additions use existing packages: `zod`, `@prisma/client`, `next`, `jose`.

### Expected Features

**Must have (table stakes):**
- Auth helpers (`requireSession`, `requireRole`, `requireFactoryId`) — eliminates auth inconsistency across ~50 routes, prevents tenant data leaks
- Zod schemas for all auth endpoints — consistent input validation, replaces manual if-checks
- Email normalization utility — prevents account takeover via whitespace/case manipulation
- Password strength enforcement (Zod schema) — 8+ chars with uppercase, lowercase, number, special char
- `factoryId` on all business entities — critical for multi-tenant isolation

**Should have (competitive):**
- Rate limiting on auth endpoints — brute force protection
- Onboarding state tracking (`Factory.onboardingCompleted`) — enables follow-up with incomplete factories

**Defer (v2+):**
- Onboarding gate (redirect to `/onboarding` until completed) — blocks staff during peak season, contradicts "Speed over everything" core value
- Staff invite flow — separate milestone
- RLS at PostgreSQL level — application-layer scoping sufficient for ice factory scale

### Architecture Approach

Two-layer defense architecture:

1. **Auth helpers (primary)** — Enforce session + factoryId presence before any operation. Callers invoke `requireSession()` which returns session payload or throws 401/403. No silent failures.

2. **Prisma `$extends` (safety net)** — Auto-injects `factoryId` filter but only when `ctx.factoryId` is set. Has been silently passing when session is null — the root cause of DATA-01/DATA-02 leaks.

3. **Explicit `where: { factoryId }` (defense-in-depth)** — Makes factory scoping visible in query code. Self-documenting.

SUPER_ADMIN routes (`/api/admin/*`) use `basePrisma` (unscoped) for cross-factory access. Tenant routes use `extendedPrisma` (auto-filtered).

**Major components:**
1. `src/lib/auth-helpers.ts` — Auth helpers, AuthError class
2. `src/lib/db.ts` — Exports `basePrisma` for SUPER_ADMIN, `prisma` (extended) for tenant operations
3. `src/lib/validators/auth.ts` — Zod schemas for register/login
4. `src/lib/rate-limit.ts` — In-memory rate limiter
5. `src/lib/decimal.ts` — Decimal-to-string serialization
6. Database migration — Add `factoryId` to Order, Customer, Driver, Product, Inventory; add `onboardingCompleted`/`setupStep` to Factory

### Critical Pitfalls

1. **Cross-tenant data leakage via Prisma queries** — `prisma.customer.findMany()` with no `factoryId` filter returns ALL customers across ALL factories. Prevention: Add `factoryId` to all business entities; create tenant-scoped query helper; add ESLint rule to detect unfiltered queries.

2. **`factoryId` not enforced in all queries** — Confirmed missing in `GET /api/drivers`, `GET /api/customers`, `GET /api/orders`, `POST /api/drivers`, `POST /api/customers`. Prevention: Codify `factoryId` as required in all Prisma queries; create Prisma middleware that errors if tenant-scoped model query lacks factoryId.

3. **RLS + Prisma bypass** — Prisma `$extends` bypasses RLS if `DIRECT_URL` uses service role credentials. Prevention: Verify `DIRECT_URL` is user-level credential; test cross-tenant access with service vs user role.

4. **Super Admin elevated privilege bypass** — Cross-factory role can bypass `factoryId` checks. Prevention: Never add SUPER_ADMIN role that bypasses tenant checks; use explicit `factoryId` parameter selection.

5. **Subscription expiry not enforced on write operations** — Middleware only catches HTTP requests through Edge; Server Actions, background jobs, direct DB calls bypass this. Prevention: Two-layer enforcement — edge middleware + per-route subscription guard.

6. **Onboarding flow edge cases** — CSV import partial failure, trial expires mid-onboarding, duplicate customer codes. Prevention: Transaction-wrapped import, trial extension on onboarding start, checkpoint resume.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Data Layer Hardening
**Rationale:** Critical data leaks confirmed in PITFALLS.md. `factoryId` missing from Order, Customer, Driver, Product, Inventory. Must be fixed before any multi-tenant feature work.

**Delivers:**
- Database migration: Add `factoryId` to all business entities
- Database migration: Add `onboardingCompleted`/`setupStep` to Factory
- Export `basePrisma` from `src/lib/db.ts` for SUPER_ADMIN use
- Prisma tenant middleware (optional safety net)
- Integration tests for cross-tenant isolation

**Avoids:** PITFALL 1 (cross-tenant leakage), PITFALL 3 (factoryId not enforced)

**Research Flags:** Standard pattern — can proceed without deeper research

### Phase 2: Auth Infrastructure
**Rationale:** Auth helpers are highest impact (secures ~50 routes), lowest complexity. Build before touching API routes.

**Delivers:**
- `src/lib/auth-helpers.ts` — requireSession, requireFactoryId, requireRole, requireActiveSubscription, AuthError
- `src/lib/validators/auth.ts` — Zod v4 schemas for register/login
- `src/lib/rate-limit.ts` — In-memory rate limiter
- `src/lib/decimal.ts` — Decimal serialization utilities
- Auth helper applied to registration route (email normalization, password strength)

**Uses:** Stack additions from STACK.md

**Research Flags:** Standard pattern — can proceed without deeper research

### Phase 3: API Route Hardening
**Rationale:** API routes must use auth helpers and explicit factoryId filters. Apply to all tenant-scoped endpoints.

**Delivers:**
- All `GET /api/*` routes with auth helpers + explicit factoryId filter
- All `POST/PATCH/DELETE /api/*` routes with auth helpers + subscription guard + explicit factoryId
- Confirmed routes needing fixes: drivers, customers, orders, prices

**Implements:** Architecture from ARCHITECTURE.md section 1

**Research Flags:** Some routes may need deeper research if complex business logic

### Phase 4: Onboarding + Registration Hardening
**Rationale:** Onboarding state update and registration flow improvements depend on Phase 1 (Factory model changes).

**Delivers:**
- Registration route: Zod validation, email normalization, `nextUrl` response
- Onboarding state update on CSV import success
- Dashboard prompt using `onboardingCompleted` flag
- Rate limiting applied to login/register

**Uses:** Onboarding state architecture from ARCHITECTURE.md section 2

**Research Flags:** Standard pattern — can proceed without deeper research

### Phase Ordering Rationale

- **Phase 1 before 2:** Data layer fixes are foundational; auth helpers use existing DB pattern unchanged
- **Phase 2 before 3:** Auth helpers must exist before API routes can use them
- **Phase 3 before 4:** API hardening must be complete before onboarding flow depends on it
- **Dependency:** Auth helpers depend on `getSession` from `auth.ts` (no DB deps) — safe to build before Phase 1 migration
- **Parallelization:** Auth helpers can be built in parallel with Phase 1 migration

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Versions confirmed via package.json; patterns verified via codebase analysis |
| Features | MEDIUM-HIGH | Based on Phase 6 research + known SaaS patterns; implementation gaps documented |
| Architecture | MEDIUM-HIGH | Auth helpers pattern is standard; $extends + explicit query integration verified |
| Pitfalls | HIGH | Based on schema analysis + codebase review; cross-tenant leaks confirmed |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **DIRECT_URL credential level:** Not verified if `DIRECT_URL` in schema.prisma is service role or user-level. Must verify before Phase 1 — potential RLS bypass.
- **Seed scripts factoryId:** Seed scripts may be using unscoped Prisma — audit before Phase 1.
- **Middleware subscription response parsing:** ARCHITECTURE.md notes `middleware.ts` reads `data.subscription` not top-level `sub` — needs verification.

## Sources

### Primary (HIGH confidence)
- `prisma/schema.prisma` — Verified no `factoryId` on Order, Customer, Driver, Product, Inventory
- `src/middleware.ts` — Verified partial subscription enforcement only on write methods
- `src/app/api/drivers/route.ts` — Verified no `factoryId` filter on `GET /api/drivers`
- `src/app/api/orders/route.ts` — Verified no `factoryId` filter on `GET /api/orders`
- `src/app/api/customers/route.ts` — Verified no `factoryId` filter on `GET /api/customers`
- package.json — Confirmed `zod: ^4.0.0` installed

### Secondary (MEDIUM-HIGH confidence)
- STACK.md — Zod v4 patterns, rate limiting strategy, auth helper signatures
- ARCHITECTURE.md — $extends + explicit query integration, onboarding state decision
- PITFALLS.md — Multi-tenant retrofit patterns, RLS considerations

### Tertiary (MEDIUM confidence)
- Context7 Zod documentation — schema patterns (needs code verification)
- Prisma Decimal handling — documentation (needs implementation verification)

---
*Research completed: 2026-04-22*
*Ready for roadmap: yes*