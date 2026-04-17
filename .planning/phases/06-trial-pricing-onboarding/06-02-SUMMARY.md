---
phase: "06"
plan: "02"
subsystem: billing-ui
tags: [billing, onboarding, csv-import, vietqr, payment, subscription]

# Dependency graph
requires:
  - phase: "06-01a"
    provides: "Subscription model, getFactorySubscription helper, papaparse installed"
  - phase: "06-01b"
    provides: "Middleware subscription enforcement, TrialBanner wired"
provides:
  - "Billing dashboard at /settings/billing with pricing display and payment confirmation"
  - "VietQR content string generator for bank transfer instructions"
  - "POST /api/payments/confirm — extends subscription +30 days, sets planType=PAID"
  - "CSV import wizard at /onboarding (4-step: upload, map, preview, import)"
  - "POST /api/customers/import — bulk customer creation with duplicate skipping"
  - "Dashboard first-run prompt linking ADMIN with 0 customers to /onboarding"
  - "GET /api/billing/subscription — client-safe subscription + driver count endpoint"
affects:
  - "src/app/dashboard/page.tsx"
  - "src/components/dashboard/dashboard-client.tsx"
  - "src/app/api/drivers/route.ts"

# Tech tracking
tech-stack:
  added:
    - "@types/papaparse (TypeScript types for CSV parsing)"
  patterns:
    - "Server API route as client-safe bridge for Prisma data (billing/subscription)"
    - "RSC server session check for conditional dashboard prompts"
    - "Multi-step wizard state machine with Step type union"
    - "Papa.parse with skipEmptyLines for robust CSV handling"

key-files:
  created:
    - "src/app/settings/billing/page.tsx" - Billing dashboard (subscription status, pricing, VietQR, payment confirm)
    - "src/app/api/billing/subscription/route.ts" - Client-safe subscription + driver count API
    - "src/components/billing/PricingDisplay.tsx" - Per-driver pricing table with admin-free calc
    - "src/components/billing/VietQRCode.tsx" - Bank transfer content generator
    - "src/components/billing/PaymentRecorder.tsx" - Payment confirmation UI with success/error feedback
    - "src/app/api/payments/confirm/route.ts" - Payment confirmation API (+30 days, PAID status)
    - "src/app/onboarding/page.tsx" - 4-step CSV import wizard
    - "src/app/api/customers/import/route.ts" - Bulk customer import with deduplication
  modified:
    - "src/app/api/drivers/route.ts" - Added ?active=true count mode for billing
    - "src/app/dashboard/page.tsx" - Added getSession check for onboarding prompt
    - "src/components/dashboard/dashboard-client.tsx" - Added showOnboardingPrompt prop and banner

key-decisions:
  - "Created /api/billing/subscription server route because getFactorySubscription (Prisma) cannot run client-side"
  - "Driver model has no factoryId — billing counts all active drivers system-wide"
  - "Customer.code is globally unique (not per-factory) — deduplication checks code only"
  - "Auth function is getSession() not getServerSession() — plan used non-existent function name"
  - "VietQRCode factoryName optional (auth-provider User has no factoryId or factoryName)"

requirements-completed: [REQ-11, REQ-12]

# Metrics
duration: 25min
completed: 2026-04-17
---

# Phase 06 Plan 02: Billing Dashboard + CSV Onboarding — Summary

**Billing dashboard with per-driver pricing, VietQR bank transfer instructions, admin payment confirmation (+30 days), and 4-step CSV customer import wizard wired to first-run dashboard prompt**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-04-17
- **Tasks:** 8
- **Files created:** 8
- **Files modified:** 3

## Accomplishments

- Billing dashboard at `/settings/billing` fetches subscription status and active driver count, displays pricing breakdown (admin free + drivers × 150,000 VND/month), VietQR bank transfer content, and payment confirmation form
- `PricingDisplay` component computes `Math.max(0, driverCount - 1) * 150000` monthly total, shows "Miễn phí" for solo or no-driver factories
- `VietQRCode` generates the standard `THANH TOAN ICEFLOW [NAME] T[M]/[YYYY]` content string for manual bank transfer with static Vietcombank account info
- `PaymentRecorder` pre-fills expected amount, POSTs to `/api/payments/confirm`, and triggers parent refresh on success
- `POST /api/payments/confirm` verifies ADMIN role + subscription ownership, then sets `planType=PAID`, `status=ACTIVE`, `endDate = now + 30 days`
- 4-step CSV import wizard at `/onboarding`: upload file → map column headers → preview first 8 rows → import; handles skip on duplicate `code` or missing data
- Dashboard RSC checks `session.role === 'ADMIN' && customers.length === 0` and passes `showOnboardingPrompt` to `DashboardClient` which shows an amber banner with link to `/onboarding`
- GET `/api/drivers?active=true` extended to return `{count, drivers}` without breaking existing callers

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Billing Dashboard Page | `e886021` | settings/billing/page.tsx, api/billing/subscription/route.ts |
| 2 | PricingDisplay Component | `f72aa56` | components/billing/PricingDisplay.tsx |
| 3 | VietQR Content Generator | `6f9e0ed` | components/billing/VietQRCode.tsx |
| 4 | Payment Recording UI | `701edda` | components/billing/PaymentRecorder.tsx |
| 5 | Payment Confirm API | `600f6e2` | api/payments/confirm/route.ts |
| 6 | Onboarding Wizard + Dashboard Nav | `c12f5b6` | app/onboarding/page.tsx, dashboard/page.tsx, dashboard-client.tsx |
| 7 | Customer Import API | `b7f04d2` | api/customers/import/route.ts |
| 8 | Driver Count for Billing | `4181a75` | api/drivers/route.ts |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `getServerSession` does not exist — replaced with `getSession`**
- **Found during:** Task 5 (payment confirm API), Task 7 (import API)
- **Issue:** Plan code called `getServerSession()` from `@/lib/auth` but the actual exported function is `getSession()`
- **Fix:** Used `getSession()` in all API routes; also used `prisma` from `@/lib/db` instead of `new PrismaClient()` to follow singleton pattern
- **Files modified:** api/payments/confirm/route.ts, api/customers/import/route.ts, api/billing/subscription/route.ts

**2. [Rule 3 - Blocker] `getFactorySubscription` is Prisma-only, can't run client-side**
- **Found during:** Task 1 (billing dashboard page)
- **Issue:** Plan imports `getFactorySubscription` from `@/lib/subscription-status` in a `'use client'` component. That function uses Prisma directly and would fail at runtime.
- **Fix:** Created `/api/billing/subscription` server route that calls `getFactorySubscription` server-side and returns subscription + driverCount as JSON. Billing page fetches from this endpoint.
- **Files created:** api/billing/subscription/route.ts

**3. [Rule 1 - Bug] `Customer` model has no `factoryId` field**
- **Found during:** Task 7 (customer import API)
- **Issue:** Plan code filters by `{ code, factoryId: session.factoryId }` but the schema shows `Customer` has no `factoryId` column — `code` is globally `@unique`
- **Fix:** Deduplicated by `code` alone using `prisma.customer.findUnique({ where: { code } })`
- **Files modified:** api/customers/import/route.ts

**4. [Rule 1 - Bug] `Driver` model has no `factoryId` field**
- **Found during:** Task 8 (driver count)
- **Issue:** Plan specifies filtering drivers by `?factoryId=xxx` but `Driver` model has no `factoryId` column
- **Fix:** `?active=true` mode counts all active drivers system-wide (correct for single-factory MVP). The `/api/billing/subscription` endpoint uses `prisma.driver.count({ where: { isActive: true } })`
- **Files modified:** api/drivers/route.ts, api/billing/subscription/route.ts

**5. [Rule 1 - Bug] `useAuth()` User type has no `factoryId` or `factoryName`**
- **Found during:** Task 1 (billing page) and Task 3 (VietQRCode)
- **Issue:** `auth-provider.tsx` User interface is `{ id, email, name, role }` only — no `factoryId` or `factoryName`. Plan passed `user?.factoryId` and `user?.name` for factory name
- **Fix:** Billing page fetches all data from `/api/billing/subscription` (session provides factoryId server-side). VietQRCode `factoryName` prop made optional with default placeholder
- **Files modified:** settings/billing/page.tsx, components/billing/VietQRCode.tsx

## Known Stubs

- `VietQRCode` bank account number hardcoded as `1234567890` (Vietcombank) — placeholder pending real IceFlow bank details. Display is correct format; only the account number needs updating with actual credentials.
- Dashboard onboarding prompt uses `href="/onboarding"` (plain anchor, not `<Link>`) since it's in a client component and avoids a Next.js Link import for this single link.

## Threat Surface Scan

No new network trust boundaries beyond those in the plan's threat model:
- `T-06-06`: CSV import uses Prisma parameterized queries (no injection risk)
- `T-06-07`: Payment confirm verifies `subscription.factoryId === session.factoryId` ownership

## Self-Check: PASSED
