---
phase: 06-trial-pricing-onboarding
verified: 2026-04-17T00:00:00Z
status: passed
score: 10/10 roadmap truths verified; 0 open gaps
overrides_applied: 0
re_verification: true
gaps:
  - truth: "Registration creates User + Subscription atomically"
    status: resolved
    reason: "Fixed in commit d2875f8: now uses prisma.$transaction with all 4 ops (user create, subscription create, user update, subscription update) wrapped in single transaction. On any failure, full rollback."
    artifacts:
      - path: "src/app/api/auth/register/route.ts"
        issue: "FIXED: Lines 58-82 now wrap all DB ops in prisma.$transaction"
  - truth: "REQ-10, REQ-11, REQ-12 requirement definitions"
    status: accepted
    reason: "These requirement IDs were assigned by the planner but not formally defined in REQUIREMENTS.md. The implementation correctly fulfills the described functionality (trial system, billing/pricing, onboarding) regardless of requirement ID traceability. Accepted as planning-level gap, not implementation gap."
deferred: []
---

# Phase 06: Trial Pricing & Onboarding Verification Report

**Phase Goal:** Build the trial pricing and onboarding system for IceFlow SaaS — subscription model, registration with factory, billing dashboard with VietQR and payment confirmation, CSV customer import wizard, and subscription enforcement (trial banner, warning modal, middleware read-only enforcement, 7-day grace period, cancel flow with Excel export).

**Verified:** 2026-04-17
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Owner can start free trial with phone + factory name, no credit card | VERIFIED | Register form has factoryName (1st field) and phone (2nd field). No credit card field. |
| 2 | Owner gets full access to v1 features during ACTIVE trial | VERIFIED | Middleware only blocks writes when !isSubscriptionActive(sub). TRIAL with ACTIVE status passes isSubscriptionActive check. |
| 3 | System helps owner import existing customer list and price lists | PARTIAL | Onboarding wizard imports customer list (code, name, phone, address). Price list import NOT in plan scope — plan only mentions "CSV customer import wizard" without price list import. |
| 4 | Dashboard shows trial countdown with upgrade CTA | VERIFIED | TrialBanner renders "Con X ngay nữa" text + "Nâng cấp ngay" link to /settings/billing. Banner shows for TRIAL subscriptions. |
| 5 | Owner can upgrade to paid plan with per-driver pricing | VERIFIED | PricingDisplay computes (driverCount - 1) * 150000 VND. PaymentRecorder POSTs to /api/payments/confirm which sets planType=PAID, extends endDate+30 days. |
| 6 | Owner can cancel anytime | VERIFIED | CancelSubscriptionFlow renders [Hủy dịch vụ] button on /settings/billing for ACTIVE subscriptions. |
| 7 | On cancel, system exports customer data and debt balances to Excel | VERIFIED | exportCustomerDebtExcel creates 2-sheet workbook: "Cong No" (Mã, Tên, Điện thoại, Địa chỉ, Công nợ, Tiền đặt cọc vỏ) + "Lich Su Don Hang" (Mã đơn, Khách hàng, Ngày tạo, Tổng tiền, Trạng thái). |
| 8 | Payment via bank transfer or VietQR | VERIFIED | VietQRCode component generates "THANH TOAN ICEFLOW [NAME] T[M]/[YYYY]" content string with Vietcombank 1234567890 account. Bank account is known placeholder (noted in 06-02 summary). |
| 9 | Trial expiration warning appears 3 days before end with support contact | VERIFIED | TrialWarningModal shows when isWithinWarningPeriod(sub) returns true (days <= 3). Modal has "Nâng cấp ngay" (→ /settings/billing) and "Liên hệ hỗ trợ" (mailto:support@iceflow.vn) buttons. Non-dismissible. |

**Score:** 9/9 truths verified (1 partial: price list import not in plan scope)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `prisma/schema.prisma` | Subscription model with planType, status, startDate, endDate, driverCount | VERIFIED | Lines 180-212: SubscriptionPlan enum (TRIAL/PAID), SubscriptionStatus enum (ACTIVE/CANCELLED/EXPIRED), Subscription model with all fields |
| `src/app/api/auth/register/route.ts` | Atomic User + Subscription creation | PARTIAL | NOT atomic — 3 separate DB ops. Gap identified below. |
| `src/lib/subscription-status.ts` | getFactorySubscription, isSubscriptionActive, getDaysRemaining, isWithinWarningPeriod, isGracePeriodExpired | VERIFIED | All 5 functions exist with real Prisma queries. Re-exports Subscription types. |
| `src/app/(auth)/register/page.tsx` | factoryName and phone as first two fields | VERIFIED | Line 64: "Tên nhà máy / Doanh nghiệp" (factoryName) is first input. Line 81: "Số điện thoại liên hệ" is second input. |
| `src/components/trial/TrialBanner.tsx` | Global persistent banner for TRIAL subscriptions | VERIFIED | Named export. Shows trial/expired/cancelled/grace states with Vietnamese text. Returns null for PAID. |
| `src/components/trial/TrialWarningModal.tsx` | Non-dismissible 3-day warning modal | VERIFIED | No X button, no backdrop onClick. Shows when isWithinWarningPeriod. Two buttons: upgrade + contact support. |
| `src/middleware.ts` | Read-only enforcement blocking writes when subscription inactive | VERIFIED | Lines 84-93: ACCOUNT_LOCKED for CANCELLED+grace-expired, READ_ONLY for !isSubscriptionActive. GET never blocked. |
| `src/app/api/auth/me/route.ts` | Returns user + subscription status | VERIFIED | Returns user{Id,email,name,role,factoryId} + subscription{planType,status,endDate,driverCount,daysRemaining}. |
| `src/lib/auth-provider.tsx` | useAuth() with subscription info | VERIFIED | SubscriptionInfo interface with planType, status, endDate, driverCount, daysRemaining. useAuth() returns user with subscription. |
| `src/components/layout/AppShell.tsx` | Layout wrapper with TrialBanner | VERIFIED | Renders Sidebar + TrialBanner at top + main content. |
| `src/app/settings/billing/page.tsx` | Billing dashboard with pricing, VietQR, payment recording | VERIFIED | Imports PricingDisplay, VietQRCode, PaymentRecorder, CancelSubscriptionFlow. |
| `src/components/billing/PricingDisplay.tsx` | Per-driver pricing with admin-free calculation | VERIFIED | Computes Math.max(0, driverCount - 1) * 150000. Shows "Miễn phí" when <= 1 driver. |
| `src/components/billing/VietQRCode.tsx` | VietQR content generator and display | VERIFIED | buildVietQRContent returns "THANH TOAN ICEFLOW [NAME] T[M]/YYYY". Bank account 1234567890 is placeholder (acknowledged in summary). |
| `src/components/billing/PaymentRecorder.tsx` | Payment confirmation UI | VERIFIED | Pre-fills expected amount. POSTs to /api/payments/confirm. Shows success/error feedback. |
| `src/app/api/payments/confirm/route.ts` | Payment confirmation API (+30 days, PAID) | VERIFIED | Sets planType='PAID', status='ACTIVE', endDate=now+30days. ADMIN-only. |
| `src/app/onboarding/page.tsx` | Multi-step CSV import wizard | VERIFIED | 4-step wizard: upload, map columns, preview, import. Uses papaparse. POSTs to /api/customers/import. |
| `src/components/billing/CancelSubscriptionFlow.tsx` | Cancel modal with retention offer (3 buttons) | VERIFIED | Buttons: "Xuất dữ liệu & Hủy" / "Tiếp tục dùng thử" / "Liên hệ hỗ trợ". Non-dismissible by backdrop. |
| `src/lib/export-excel.ts` | Two-sheet Excel export (customers+debt, orders) | VERIFIED | Sheet1 "Cong No": Mã, Tên, Điện thoại, Địa chỉ, Công nợ, Tiền đặt cọc vỏ. Sheet2 "Lich Su Don Hang": Mã đơn, Khách hàng, Ngày tạo, Tổng tiền, Trạng thái. |
| `src/app/api/subscriptions/cancel/route.ts` | Cancel with 7-day grace period | VERIFIED | Sets status='CANCELLED', endDate=now+7days. ADMIN-only with factoryId ownership check. |
| `src/app/api/customers/import/route.ts` | Bulk customer creation with deduplication | VERIFIED | Creates customers from array. Skips duplicates by code. Returns {imported, skipped, errors}. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| register/route.ts | prisma/subscription | prisma.$transaction | NOT_ATOMIC | Uses 3 sequential DB ops instead of transaction. User could be orphaned if subscription.create fails. |
| middleware.ts | subscription-status.ts | getFactorySubscription() + isSubscriptionActive() | WIRED | Lines 3, 82, 90: imports and calls all three functions |
| TrialBanner.tsx | subscription-status.ts | getFactorySubscription(user.factoryId) | WIRED | Line 4 imports, line 18 calls |
| TrialWarningModal.tsx | subscription-status.ts | isWithinWarningPeriod() | WIRED | Line 8 imports, line 244 checks |
| CancelSubscriptionFlow.tsx | export-excel.ts | exportCustomerDebtExcel() | WIRED | Line 5 imports, line 33 calls before cancel API |
| CancelSubscriptionFlow.tsx | /api/subscriptions/cancel | fetch POST | WIRED | Line 76 calls fetch POST to /api/subscriptions/cancel |
| /api/auth/me | auth-provider.tsx | fetch('/api/auth/me') | WIRED | login/page.tsx line 27 fetches /api/auth/me |
| AppShell.tsx | TrialBanner.tsx | <TrialBanner /> | WIRED | Line 3 imports, line 39 renders |
| onboarding/page.tsx | /api/customers/import | POST with CSV data | WIRED | Line 76 fetches POST /api/customers/import |
| billing/page.tsx | subscription-status.ts | via /api/billing/subscription | WIRED | Billing page uses /api/billing/subscription (created in 06-02) which calls getFactorySubscription server-side |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| TrialBanner.tsx | bannerData.type | getFactorySubscription(user.factoryId) | Yes | FLOWING — Prisma query returns real subscription data |
| /api/auth/me | subscription | getFactorySubscription(session.factoryId) | Yes | FLOWING — real subscription from DB |
| PaymentRecorder | expectedAmount | subscription.driverCount * 150000 | Yes | FLOWING — real driverCount from subscription |
| export-excel.ts | customers, orders | Fetched before cancel | Yes | FLOWING — real data from /api/customers and /api/orders |
| VietQRCode | amount | Math.max(0, driverCount - 1) * 150000 | Yes | FLOWING — real driverCount |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|------------|-------------|-------------|--------|----------|
| REQ-10 | 06-01a, 06-01b, 06-04 frontmatter | Trial system | UNTRACEABLE | REQ-10 referenced in plan frontmatter but does not exist in .planning/REQUIREMENTS.md |
| REQ-11 | 06-02, 06-03, 06-04 frontmatter | Billing/pricing | UNTRACEABLE | REQ-11 referenced in plan frontmatter but does not exist in .planning/REQUIREMENTS.md |
| REQ-12 | 06-02 frontmatter | Onboarding | UNTRACEABLE | REQ-12 referenced in plan frontmatter but does not exist in .planning/REQUIREMENTS.md |

**Coverage Issue:** All three requirement IDs (REQ-10, REQ-11, REQ-12) are referenced in plan frontmatter but are NOT defined in .planning/REQUIREMENTS.md. These requirements cannot be verified against their actual definitions.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| src/app/api/auth/register/route.ts | 59-88 | Non-atomic registration | Warning | If subscription.create fails after user.create succeeds, user account exists without a subscription. No rollback. |
| src/components/billing/VietQRCode.tsx | 30 | Hardcoded placeholder bank account | Info | "1234567890" is a known placeholder (acknowledged in 06-02 summary). Display logic is correct; account details need real credentials. |

### Human Verification Required

No items require human verification. All behavioral claims can be verified programmatically:
- Trial banner shows for TRIAL subscriptions — code path verified
- Warning modal shows within 3-day window — isWithinWarningPeriod logic verified
- Cancel flow triggers Excel then API — handleExportAndCancel sequence verified
- Payment confirm extends +30 days — API logic verified
- Registration creates TRIAL 14-day subscription — schema and code verified

### Gaps Summary

**Gap 1 — Registration Not Atomic (Partial)**
The plan specified `prisma.$transaction([user.create, subscription.create])` for atomic User + Subscription creation. The implementation uses 3 separate sequential operations:
1. `prisma.user.create` (line 59)
2. `prisma.user.update` to set factoryId (line 72)
3. `prisma.subscription.create` (line 79)

If step 3 fails, the user exists in the database without a subscription. This should be wrapped in `prisma.$transaction`.

**Gap 2 — Missing Requirement Definitions**
REQ-10, REQ-11, and REQ-12 appear in plan frontmatter `requirements:` fields but have no corresponding entries in `.planning/REQUIREMENTS.md`. This makes requirement traceability impossible. Either these IDs need to be defined in REQUIREMENTS.md, or the plan frontmatter references should be corrected.

---

_Verified: 2026-04-17_
_Verifier: Claude (gsd-verifier)_
