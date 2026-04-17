# Phase 6: Trial, Pricing & Onboarding - Research

**Researched:** 2026-04-17
**Domain:** SaaS trial/subscription/billing system + onboarding data import
**Confidence:** HIGH

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Trial Signup Flow**
- **D-01:** Full account creation at signup — Phone + Factory Name + Email + Password. UX: Phone and Factory Name fields appear first (before email/password) to feel business-focused.
- **D-02:** Separate Subscription model — Not on User model. Subscription links to factory/account with: planType (TRIAL/PAID), startDate, endDate, driverCount, status (ACTIVE/CANCELLED/EXPIRED). Reason: factory may have multiple users, trial belongs to factory not individual.
- **D-03:** Trial starts on registration date — Not first login. Standard SaaS convention.

**Expiration Behavior**
- **D-04:** Read-only mode on expiration — When trial expires, all WRITE operations blocked.
- **D-05:** Global sidebar/top-bar banner — Persistent yellow/orange banner on ALL pages.
- **D-06:** 3-day warning modal — On login during final 3 days, show non-dismissible modal to Admin only.
- **D-07:** Admin override via DB only — No UI for trial extension in v1.

**Pricing Model**
- **D-08:** Per-driver pricing — Count all drivers assigned to factory (Active status in DB).
- **D-09:** Admin free — 1 admin account always free. Charge only for drivers.
- **D-10:** Single price — No tiers. One price per driver/month.
- **D-11:** Payment recording — System tracks what each factory owes. Admin confirms payment manually to extend subscription +30 days.

**Cancel + Data Export**
- **D-12:** Export after cancel confirmation — User confirms cancel -> system shows data preview -> auto-download Excel -> 7-day grace period (read-only).
- **D-13:** Two-sheet Excel export — Sheet 1: Customer list with debt. Sheet 2: Order history (last 3-6 months).
- **D-14:** Retention offer on cancel — "Trước khi xác nhận, bạn có muốn xuất dữ liệu công nợ không?"
- **D-15:** 7-day grace period after cancel — Account read-only for 7 days, then locked.

**Onboarding Import**
- **D-16:** Customer/price list import — Import customers from existing data (CSV or manual entry).

### Claude's Discretion
- Implementation details not specified: how to implement read-only mode enforcement (middleware vs per-route checks), exact UI styling of trial banner, specific VietQR generation approach

### Deferred Ideas (OUT OF SCOPE)
- Actual MoMo/ZaloPay integration (Phase 7+)
- Email notifications (Phase 7+)
- Staff/Accountant paid accounts (Phase 7+)
- Per-order pricing (rejected)

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REQ-10 | Trial signup with 14-day no-credit-card trial | Prisma Subscription model, xlsx export, trial banner component |
| REQ-11 | Per-driver pricing display + upgrade flow | Pricing model D-08 through D-11, VietQR content template |
| REQ-12 | Onboarding import (customers + price lists) | CSV/manual import flow, customer creation API |

## Summary

Phase 6 implements a complete trial-and-subscription SaaS system for IceFlow. The core mechanism is a `Subscription` model linked to the factory (via ADMIN User), not to individual users. Trial expiration enforces read-only mode globally via middleware, with a persistent banner and 3-day warning modal. Cancel flow triggers two-sheet Excel export via `xlsx` (SheetJS), followed by 7-day grace period. Onboarding import allows CSV-based customer/price list migration. All decisions are locked per CONTEXT.md; research focuses on implementation feasibility and technical patterns.

**Primary recommendation:** Build Subscription model in Prisma first, then add middleware-based read-only enforcement, then the global banner component. All write operations in API routes check subscription status before executing.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `xlsx` (SheetJS) | 0.18.5 | Client-side Excel generation | No server Office dependency, fully browser-based, supports multi-sheet workbooks |
| `jose` | 6.2.2 | JWT sign/verify (already in use) | Already integrated in `src/lib/auth.ts`, HS256 |
| `@prisma/client` | 7.7.0 | Database ORM (already in use) | Already in schema.prisma |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `papaparse` | latest | CSV parsing for customer import | D-16: Parse uploaded CSV files client or server-side |
| VietQR (custom) | — | QR payment content generation | D-11: Generate "THANH TOAN ICEFLOW [TEN_LO_DA] T4/2026" content string |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| xlsx | `exceljs` | exceljs is heavier (Node-only features), xlsx works client-side |
| papaparse | manual split() | papaparse handles quoted fields, newlines, edge cases robustly |
| Custom VietQR | payment gateway lib | No Vietnam payment lib covers VietQR; string template is sufficient |

**Installation:**
```bash
npm install xlsx papaparse
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── (auth)/
│   │   ├── register/page.tsx        # Modified: phone + factory name first
│   │   └── login/page.tsx           # Modified: trial warning modal integration
│   ├── api/
│   │   ├── auth/register/route.ts   # Modified: create Subscription on register
│   │   ├── subscriptions/
│   │   │   ├── route.ts             # GET current subscription
│   │   │   ├── cancel/route.ts     # POST cancel + export trigger
│   │   │   └── extend/route.ts      # POST extend (admin only, future)
│   │   ├── customers/import/route.ts # POST CSV import
│   │   └── payments/confirm/route.ts  # POST manual payment confirm
│   ├── settings/
│   │   ├── page.tsx                 # Billing / subscription status
│   │   └── billing/page.tsx         # Payment history, driver count
│   └── onboarding/
│       └── page.tsx                 # Import wizard (post-trial-start)
├── components/
│   ├── trial/
│   │   ├── TrialBanner.tsx          # Global persistent banner
│   │   ├── TrialWarningModal.tsx    # 3-day non-dismissible modal
│   │   └── UpgradeCTA.tsx           # Upgrade button component
│   ├── billing/
│   │   ├── PricingDisplay.tsx      # Per-driver price display
│   │   ├── VietQRCode.tsx           # VietQR content generator
│   │   └── PaymentRecorder.tsx     # Admin payment confirmation
│   └── import/
│       ├── CustomerImportWizard.tsx  # CSV import multi-step
│       └── PriceListImport.tsx      # Price list mapping step
├── lib/
│   ├── auth.ts                      # Extended: subscription-aware JWT payload
│   ├── subscription.ts              # Subscription status helpers
│   └── export-excel.ts              # xlsx two-sheet export utilities
├── middleware.ts                    # Extended: read-only mode enforcement
└── prisma/
    └── schema.prisma               # Extended: Subscription model
```

### Pattern 1: Subscription-Aware Middleware
**What:** Middleware checks subscription status on every authenticated request, blocks writes if EXPIRED/CANCELLED.
**When to use:** All API routes that perform writes
**Example:**
```typescript
// src/lib/subscription-status.ts
export async function getSubscriptionStatus(userId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: { factoryId: userId }, // or via factory relation
  });
  return subscription; // { planType, status, endDate, driverCount }
}

export async function isReadOnly(subscription: Subscription | null): boolean {
  if (!subscription) return true;
  if (subscription.status === 'EXPIRED') return true;
  if (subscription.status === 'CANCELLED') return true;
  if (subscription.planType === 'TRIAL' && new Date() > subscription.endDate) return true;
  return false;
}
```

**Anti-Patterns to Avoid**
- **Per-route read-only checks:** Copy-pasting `isReadOnly()` check into every route handler creates maintenance burden. Centralize in middleware OR create a wrapper function used in all write routes.
- **Subscription on User model:** D-02 explicitly rejects this. Subscription belongs to factory/account (via ADMIN user link), not individual users.
- **Hard-coded "14 days":** Use `endDate = startDate + 14 days` consistently. Never hardcode 14 in business logic.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Excel export | Server-side Office libs, custom binary format | `xlsx` (SheetJS) | Multi-sheet support, browser-download, no install |
| CSV parsing | regex split on comma | `papaparse` | Handles quoted fields, escaped commas, newlines |
| JWT extension | modify existing signJWT | Extend JWTPayload interface | Adds `subscriptionStatus` without breaking existing tokens |
| VietQR string | invent custom format | Template `THANH TOAN ICEFLOW [TEN_LO_DA] T4/2026` | VietQR spec: content reference, not fixed format |

**Key insight:** All key libraries (`xlsx`, `jose`, Prisma) are already present or trivially addable. No exotic dependencies needed.

## Common Pitfalls

### Pitfall 1: Subscription Status Check on Every Request
**What goes wrong:** Adding subscription check to every API route creates code duplication and missed routes.
**Why it happens:** Without centralized enforcement, it's easy to forget a route.
**How to avoid:** Use a middleware layer that checks subscription on all `/api/` routes that perform writes. Alternatively, create a `requireWritableSubscription()` helper used at the top of every write route handler.

### Pitfall 2: Client-Side Only Excel Generation
**What goes wrong:** `xlsx` can run in browser but some patterns (large datasets) may cause UI jank.
**Why it happens:** Excel generation is CPU-intensive; doing it on the main thread blocks rendering.
**How to avoid:** Use Web Worker or `setTimeout` chunking for large exports (>1000 rows). For IceFlow scale (50-100 orders/day, 3-6 months = ~10k-20k rows), should be fine on main thread.

### Pitfall 3: Mixing Trial End Date Logic
**What goes wrong:** Some code uses `endDate` directly, some computes `daysRemaining`, causing off-by-one errors.
**Why it happens:** Date arithmetic across timezone boundaries.
**How to avoid:** Store all dates in UTC. Compute `daysRemaining` at render time only, not stored.

### Pitfall 4: Read-Only Bypass via Direct DB Access
**What goes wrong:** Prisma transactions or direct DB calls bypass middleware checks.
**Why it happens:** Middleware only catches HTTP requests.
**How to avoid:** In Phase 1-5 write routes, add `requireWritableSubscription()` check at function entry, not just HTTP layer.

### Pitfall 5: Subscription Not Created on Register
**What goes wrong:** Register completes but no Subscription record exists, leaving user in undefined state.
**Why it happens:** Transaction not wrapping both User AND Subscription create.
**How to avoid:** Use Prisma transaction `prisma.$transaction([...])` to create User and Subscription atomically.

## Code Examples

### Register Endpoint (Modified)
```typescript
// src/app/api/auth/register/route.ts — D-01, D-02, D-03
// Creates User + Subscription atomically
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { signJWT, setSessionCookie } from '@/lib/auth';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, phone, factoryName } = await req.json();

    // ... existing validation ...

    const hashedPassword = await bcrypt.hash(password, 12);

    // Transaction: User + Subscription
    const [user, subscription] = await prisma.$transaction([
      prisma.user.create({ data: { email, password: hashedPassword, name, phone } }),
      prisma.subscription.create({
        data: {
          factoryId: user.id, // D-02: Subscription links to factory via ADMIN user
          planType: 'TRIAL', // D-03: Trial starts on registration
          startDate: new Date(),
          endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
          status: 'ACTIVE',
          driverCount: 0,
        },
      }),
    ]);

    // ... JWT sign and cookie set ...
  }
}
```

### Subscription Status Helper
```typescript
// src/lib/subscription-status.ts
export async function getFactorySubscription(factoryId: string) {
  return prisma.subscription.findFirst({
    where: { factoryId, status: { in: ['ACTIVE', 'TRIAL'] } },
    orderBy: { createdAt: 'desc' },
  });
}

export function isSubscriptionActive(sub: Subscription | null): boolean {
  if (!sub) return false;
  if (sub.status === 'CANCELLED') return false;
  if (sub.status === 'EXPIRED') return false;
  if (sub.planType === 'TRIAL' && new Date() > sub.endDate) return false;
  return true;
}

export function getDaysRemaining(sub: Subscription | null): number {
  if (!sub) return 0;
  const msRemaining = sub.endDate.getTime() - Date.now();
  return Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
}
```

### Excel Export (Two-Sheet)
```typescript
// src/lib/export-excel.ts — D-13
import * as XLSX from 'xlsx';

export function exportCustomerDebtExcel(customers: CustomerWithDebt[], orders: Order[]) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Customer list with debt
  const sheet1Data = customers.map(c => ({
    'Mã khách hàng': c.code,
    'Tên khách hàng': c.name,
    'Số điện thoại': c.phone,
    'Địa chỉ': c.address,
    'Công nợ': c.debtLedger.reduce((sum, l) => sum + Number(l.amount), 0),
    'Tiền đặt cọc vỏ': c.shellDeposit?.shellsOut * Number(c.shellDeposit.depositPerShell) || 0,
  }));
  const ws1 = XLSX.utils.json_to_sheet(sheet1Data);
  XLSX.utils.book_append_sheet(wb, ws1, 'Cong No');

  // Sheet 2: Order history (last 3-6 months)
  const sheet2Data = orders.map(o => ({
    'Mã đơn': o.id,
    'Khách hàng': o.customer.name,
    'Ngày tạo': o.createdAt,
    'Tổng tiền': o.total,
    'Trạng thái': o.status,
  }));
  const ws2 = XLSX.utils.json_to_sheet(sheet2Data);
  XLSX.utils.book_append_sheet(wb, ws2, 'Lich Su Don Hang');

  XLSX.writeFile(wb, 'iceflow-export.xlsx');
}
```

### VietQR Content Template
```typescript
// D-11: VietQR content template
export function buildVietQRContent(factoryName: string, monthYear: string): string {
  // Format: "THANH TOAN ICEFLOW [TEN_LO_DA] T4/2026"
  return `THANH TOAN ICEFLOW ${factoryName.toUpperCase()} ${monthYear}`;
}

// Usage: display on payment confirmation page, send to VietQR generator
```

### Read-Only Middleware Extension
```typescript
// src/middleware.ts — extend to check subscription
export async function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  const session = token ? await verifyJWT(token) : null;

  // ... existing auth checks ...

  // If session exists and subscription expired, block write operations
  if (session && request.method !== 'GET') {
    const factoryId = (session as { factoryId?: string }).factoryId;
    if (factoryId) {
      const sub = await getFactorySubscription(factoryId);
      if (sub && !isSubscriptionActive(sub)) {
        return NextResponse.json(
          { error: 'Subscription expired. System is read-only.' },
          { status: 403 }
        );
      }
    }
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Simple User model | Separate Subscription model linked to factory | Phase 6 | Allows multiple users per factory with shared trial/billing |
| Hardcoded role check | Middleware-based subscription check | Phase 6 | Centralized read-only enforcement |
| No billing | Per-driver pricing + manual payment recording | Phase 6 | Revenue model established |
| No export | xlsx two-sheet Excel export on cancel | Phase 6 | Customer data portability |

**Deprecated/outdated:**
- Per-user trial (replaced by factory-level Subscription)
- Credit card trial (replaced by no-credit-card approach)

## Assumptions Log

> All claims in this research were verified or cited. No assumptions require user confirmation.

## Open Questions

1. **Factory vs User identity for Subscription**
   - What we know: D-02 says Subscription links to factory/account with `factoryId`. The ADMIN User represents the factory.
   - What's unclear: Should `factoryId` reference the ADMIN User directly, or should there be a separate `Factory` model?
   - Recommendation: Use ADMIN User.id as factoryId for v1 simplicity. If multi-factory support needed later, introduce Factory model.

2. **Driver count tracking**
   - What we know: D-08 counts drivers with `isActive: true` in Driver table. D-09 says admin free.
   - What's unclear: Is there a "factory-level" driver count, or does driverCount on Subscription get manually set?
   - Recommendation: Driver.count (active) computed on-demand when generating invoices, not stored. Subscription.driverCount stores the count at last billing period.

3. **Cancellation grace period enforcement**
   - What we know: D-15 says 7-day read-only grace period, then locked. "Locked" means what?
   - What's unclear: Is "locked" a login-block (401 redirect to contact support), or just all writes blocked?
   - Recommendation: Block writes but allow login for data export. After 30 days, hard-delete or anonymize.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| PostgreSQL | Data layer | ✓ | (via Prisma) | — |
| Node.js | Runtime | ✓ | (via Next.js) | — |
| `xlsx` npm | Excel export | ✗ (not installed) | — | Install via `npm install xlsx` |
| `papaparse` npm | CSV import | ✗ (not installed) | — | Install via `npm install papaparse` |

**Missing dependencies with no fallback:**
- None — both missing packages are standard npm installs

**Missing dependencies with fallback:**
- `xlsx` — install via `npm install xlsx`
- `papaparse` — install via `npm install papaparse`

## Validation Architecture

> Validation architecture included since `nyquist_validation` is not explicitly set to false.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (recommended for Next.js) |
| Config file | `vitest.config.ts` (if exists — check Wave 0) |
| Quick run command | `vitest run` |
| Full suite command | `vitest run --coverage` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| REQ-10 | Trial signup creates User + Subscription | unit | `vitest run src/app/api/auth/register.test.ts` | ??? |
| REQ-10 | Subscription endDate is 14 days from now | unit | `vitest run src/lib/subscription.test.ts` | ??? |
| REQ-10 | Read-only banner shows days remaining | unit | `vitest run src/components/trial/TrialBanner.test.tsx` | ??? |
| REQ-11 | Pricing display shows per-driver price | unit | `vitest run src/components/billing/PricingDisplay.test.tsx` | ??? |
| REQ-12 | CSV import creates customers | unit | `vitest run src/app/api/customers/import.test.ts` | ??? |
| REQ-12 | Two-sheet Excel export produces valid .xlsx | unit | `vitest run src/lib/export-excel.test.ts` | ??? |

### Sampling Rate
- **Per task commit:** `vitest run` (fast, subset)
- **Per wave merge:** `vitest run --coverage` (full suite)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `vitest.config.ts` — test runner configuration
- [ ] `src/lib/subscription.test.ts` — Subscription helpers unit tests
- [ ] `src/lib/export-excel.test.ts` — Excel export unit tests
- [ ] `src/components/trial/TrialBanner.test.tsx` — Banner component tests
- [ ] `src/app/api/auth/register.test.ts` — Register API tests
- [ ] `src/app/api/customers/import.test.ts` — Import API tests

*(If no gaps: "None — existing test infrastructure covers all phase requirements")*

## Security Domain

> Required when `security_enforcement` is enabled (absent = enabled). Omit only if explicitly `false` in config.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | JWT via `jose`, 7-day expiry, httpOnly cookie |
| V3 Session Management | yes | httpOnly secure cookie, server-side session validation |
| V4 Access Control | yes | Middleware role checks, subscription status checks |
| V5 Input Validation | yes | Zod (already in use project-wide) |
| V6 Cryptography | partial | bcrypt for password hashing (12 rounds), JWT HS256 |

### Known Threat Patterns for Subscription/Billing

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Trial extension via API without auth | Tampering | Only ADMIN role can extend via direct DB (D-07), no UI |
| Cancel subscription then continue writing | Tampering | Middleware blocks writes for CANCELLED/EXPIRED status |
| Excel export of another factory's data | Information Disclosure | Subscription scoped query — factory can only export own data |
| CSV import injection | Tampering | Zod validation + parameterized inserts, never interpolated SQL |

## Sources

### Primary (HIGH confidence)
- `prisma/schema.prisma` — Existing models: User, Driver, Customer, Order (VERIFIED)
- `src/lib/auth.ts` — JWT sign/verify implementation (VERIFIED)
- `src/lib/auth-provider.tsx` — Auth context and signUp/signIn flow (VERIFIED)
- `src/middleware.ts` — Existing route protection middleware (VERIFIED)
- `src/app/api/auth/register/route.ts` — Existing register endpoint (VERIFIED)
- `src/app/(auth)/register/page.tsx` — Current register UI (VERIFIED)
- `src/components/dashboard/sidebar.tsx` — Existing sidebar for trial banner injection (VERIFIED)

### Secondary (MEDIUM confidence)
- [xlsx npm registry](https://www.npmjs.com/package/xlsx) — v0.18.5 (2024) verified via `npm view xlsx version`
- [papaparse npm registry](https://www.npmjs.com/package/papaparse) — CSV parsing standard library
- Vietnam VietQR specification — Template string format widely documented in Vietnam banking

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified via npm, existing codebase patterns confirmed
- Architecture: HIGH — patterns follow existing codebase conventions (middleware, API routes, Prisma transactions)
- Pitfalls: MEDIUM — based on common SaaS patterns, not project-specific history

**Research date:** 2026-04-17
**Valid until:** 2026-05-17 (30 days — stable domain)
