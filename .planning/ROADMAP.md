# Roadmap: IceFlow SaaS v3.0

## Milestones

- [v1.0 MVP](milestones/v1.0-ROADMAP.md) - Phases 1-4 (shipped 2026-04-16)
- [v2.0 Multi-tenant Factory Architecture](milestones/v2.0-ROADMAP.md) - Phases 1-5 (shipped 2026-04-21)
- **v3.0 Security Hardening + SaaS Readiness** - Phases 6-10 (in progress)

## Overview

v3.0 fixes critical tenant data leaks, locks down API auth, hardens registration/onboarding, makes the build green, and corrects subscription enforcement. Builds on v2.0's multi-tenant foundation with explicit factoryId enforcement, auth helpers on all endpoints, Zod validation, rate limiting, and proper subscription enforcement.

## Phases

- [ ] **Phase 6: Data Layer Hardening** - Explicit factoryId on all queries, Prisma $extends fail-closed, security baseline
- [ ] **Phase 7: Auth Infrastructure + Registration** - Auth helpers, Zod validation, email normalization, password policy, rate limiting
- [ ] **Phase 7B: RBAC Enforcement** - Role-based access control middleware correctness, route-level enforcement, SUPER_ADMIN bypass audit
- [ ] **Phase 8: API Route Hardening + Subscription Enforcement** - All API routes use auth helpers, subscription enforcement on writes
- [ ] **Phase 9: Super Admin + Integration** - Super Admin dashboard, all v1.0 entities factory-scoped
- [ ] **Phase 10: Build Correctness** - TypeScript clean, build passing, Decimal serialization, seed scripts, React Compiler

## Phase Details

### Phase 6: Data Layer Hardening
**Goal**: All tenant-scoped queries explicitly filter by factoryId; Prisma $extends fails closed when ctx.factoryId is absent
**Depends on**: Phase 5 (v2.0 complete)
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, REG-03, SEC-01, SEC-02, SEC-03, BUILD-04
**Success Criteria** (what must be TRUE):
  1. GET /api/customers returns only records matching session.factoryId
  2. GET /api/drivers returns only records matching session.factoryId
  3. GET /api/orders returns only records matching session.factoryId
  4. POST /api/customers sets factoryId from session on created entity
  5. Prisma $extends returns zero records (not all records) when ctx.factoryId is absent
  6. JWT_SECRET env var is required — app fails to start if missing in production
**Plans**: TBD

### Phase 7: Auth Infrastructure + Registration
**Goal**: All auth endpoints use consistent helpers; registration validates input, normalizes email, enforces password strength, rate limits
**Depends on**: Phase 6
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, VALI-01, VALI-02, VALI-03, VALI-04, VALI-05, RATEL-01, RATEL-02, RATEL-03, REG-01, REG-02, REG-04, REG-05, FACT-01, FACT-02, SUB-01
**Success Criteria** (what must be TRUE):
  1. User can register with phone, name, email, password — invalid input returns 400 with Zod errors
  2. Registration normalizes email (trim, lowercase) before storage
  3. Registration enforces minimum 8-character password
  4. Registration endpoint accepts max 3 requests per IP per minute; excess returns 429
  5. Login endpoint accepts max 5 requests per IP per minute; excess returns 429
  6. requireSession() helper returns session or throws 401 Unauthorized
  7. requireRole(roles[]) helper returns role or throws 403 Forbidden
  8. requireActiveSubscription() helper returns OK or throws 403 Subscription Required
  9. Registration response includes nextUrl (e.g., "/onboarding")
**Plans**: TBD

### Phase 7B: RBAC Enforcement
**Goal**: Correct RBAC middleware behavior; route-level enforcement for ADMIN/ACCOUNTANT/STAFF; SUPER_ADMIN bypass correctness
**Depends on**: Phase 7
**Requirements**: AUTH-05, AUTH-06, SEC-01, SEC-02, SEC-03
**Success Criteria** (what must be TRUE):

  1. All write API endpoints use auth helpers before processing requests
  2. STAFF users can only access /orders and /customers (order entry focus)
  3. ACCOUNTANT users can access /dashboard, /orders, /customers, /settle, /inventory, /vehicles
  4. ADMIN users have full access to /settings
  5. SUPER_ADMIN bypasses factoryId filter only where explicitly needed
  6. Route middleware correctly redirects unauthorized access to /dashboard?error=unauthorized
  7. Adaptive sidebar correctly filters menu items by role

**Plans**: TBD

---

### Phase 8: API Route Hardening + Subscription Enforcement
**Goal**: All write API endpoints use auth helpers; subscription enforcement blocks writes when inactive
**Depends on**: Phase 7
**Requirements**: SUBS-01, SUBS-02, SUBS-03, SUB-02, SUB-03, SUB-04, SUB-05, FACT-04
**Success Criteria** (what must be TRUE):
  1. Middleware reads subscription from /api/billing/subscription response correctly
  2. Middleware blocks request (returns 403) when subscription endpoint returns non-OK
  3. Write operations (POST/PATCH/DELETE) blocked when subscription is TRIAL expired or PAID cancelled
  4. Grace period: write operations allowed during 7 days after cancellation
  5. VietQR payment template configured for manual payment confirmation
**Plans**: TBD

### Phase 9: Super Admin + Integration
**Goal**: Super Admin can manage all factories; all v1.0 entities properly factory-scoped
**Depends on**: Phase 8
**Requirements**: SADM-02, SADM-03, SADM-04, SADM-05, INT-01, INT-02, INT-03, INT-04, INT-05
**Success Criteria** (what must be TRUE):
  1. Super Admin can view list of all factories with subscription status, driver count, days remaining
  2. Super Admin can activate/deactivate tenant subscription
  3. Super Admin can extend trial or subscription period
  4. Super Admin can set price per driver
  5. All v1.0 Customer, Order, Driver, Product entities scoped to factory
  6. Per-customer pricing works within factory scope
  7. RBAC middleware extended with SUPER_ADMIN bypass
  8. Driver web-view filtered by driver.factoryId
**Plans**: TBD

### Phase 10: Build Correctness
**Goal**: TypeScript compiles clean; build passes; Prisma Decimal fields serialized; seed scripts use factoryId; no React Compiler errors
**Depends on**: Phase 9
**Requirements**: BUILD-01, BUILD-02, BUILD-03, BUILD-05
**Success Criteria** (what must be TRUE):
  1. `npx tsc --noEmit -p tsconfig.json` passes with zero errors
  2. `npm run build` completes successfully
  3. Prisma Decimal fields serialized to string before passing to client components
  4. SortIcon in tenant-table.tsx moved out of render (no React Compiler errors)
**Plans**: TBD

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 6. Data Layer Hardening | 0/TBD | Not started | - |
| 7. Auth Infrastructure + Registration | 0/TBD | Not started | - |
| 7B. RBAC Enforcement | 0/TBD | Not started | - |
| 8. API Route Hardening + Subscription | 0/TBD | Not started | - |
| 9. Super Admin + Integration | 0/TBD | Not started | - |
| 10. Build Correctness | 0/TBD | Not started | - |

---

*Roadmap created: 2026-04-22 for v3.0 milestone*