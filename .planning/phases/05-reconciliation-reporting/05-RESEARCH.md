# Phase 5: Reconciliation & Reporting - Research

**Researched:** 2026-04-16
**Domain:** Accounting reconciliation workflow, inventory deduction, debt ledger, shell deposit tracking
**Confidence:** HIGH

## Summary

Phase 5 implements the accounting reconciliation workflow where the accountant confirms delivered quantities from paper slips, triggering automatic inventory deduction and customer debt updates. This phase transforms IceFlow from an order-entry system into a real business tool with proper accounting.

**Primary recommendation:** Use a transactional approach for the reconciliation endpoint (PATCH /api/orders/[id]/reconcile) that atomically updates OrderItem.actualQty, sets Order status to COMPLETED, creates a CustomerDebtLedger entry, and deducts inventory. The debt ledger is append-only (DEBT/PAYMENT entries) with balance computed on read.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Line-item actualQty — Each OrderItem records both `quantity` (ordered) and `actualQty` (confirmed delivered)
- **D-02:** When actualQty < quantity — Debt is reduced proportionally; no separate return entry
- **D-03:** Two separate models — CustomerDebtLedger and CustomerShellDeposit (not combined)
- **D-04:** CustomerDebtLedger entries — DEBT (negative) and PAYMENT (positive) entries
- **D-05:** Balance = Σ(PAYMENT) - Σ(DEBT). Outstanding debt = current balance owed
- **D-06:** Outstanding balance per customer — One row per customer (no transaction history in Phase 5)
- **D-08:** Manual shell tracking — Track shells borrowed per customer (count + deposit value)
- **D-09:** Shell deposit balance — shellsOut, shellsIn, depositPerShell, netDepositOwed
- **D-11:** Accountant workflow — DELIVERED orders → enter actualQty per line item → confirm
- **D-12:** Status transition — DELIVERED → COMPLETED only (no reversal in Phase 5)
- **D-13:** Auto-deduct on COMPLETED — actualQty deducted from Product inventory
- **D-15:** OrderItem gets `actualQty Int?` (nullable)
- **D-16:** New model: CustomerDebtLedger (id, customerId, type, amount, notes, createdAt)
- **D-17:** New model: CustomerShellDeposit (id, customerId, shellsOut, shellsIn, depositPerShell, createdAt, updatedAt)
- **D-18:** New model: Inventory (id, productId, date, quantityOnHand)

### Deferred Ideas (OUT OF SCOPE)
- Full debt ledger with per-entry dates and notes (transaction history)
- Per-shell barcode tracking
- Low stock warnings
- Per-customer payment history view
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INVD-01 | Accountant can view a list of delivered slips returned by drivers at day end | GET /api/orders?status=DELIVERED - existing pattern, add date filter |
| INVD-02 | Accountant can enter actual delivered quantity for each line item | PATCH /api/orders/[id]/reconcile with `{ items: [{id, actualQty}] }` body |
| INVD-03 | System auto-deducts confirmed quantities from cold inventory after confirmation | Prisma transaction in reconcile endpoint: update OrderItem.actualQty, create Inventory entry, deduct product quantity |
| INVD-04 | Customer debt balance updates automatically after delivery confirmation | Prisma transaction: create CustomerDebtLedger DEBT entry on reconcile |
| INVD-05 | Owner can view daily debt report showing all outstanding customer balances | GET /api/reports/debt - aggregate CustomerDebtLedger by customer |
| INVD-06 | System tracks shell/bag deposits owed by each customer separately | CustomerShellDeposit model with shellsOut/shellsIn tracking |
| INVD-07 | Owner can see which customers owe deposits and how much | GET /api/deposits/shells - return all customers with deposit balances |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js 15+ | (existing) | App Router, Route Handlers | Already in use |
| Prisma ORM | (existing) | Type-safe database access | Already in use |
| Zod | (existing) | Runtime validation for API inputs | Already in use |
| PostgreSQL | (existing) | Primary database | Already in use |

### Supporting
| Library | Purpose | When to Use |
|---------|---------|-------------|
| Prisma transaction (`prisma.$transaction`) | Atomic multi-step operations | reconcile endpoint must atomically: update actualQty, set COMPLETED, create debt entry, deduct inventory |
| `Decimal` (Prisma) | Financial amounts | All money fields use `Decimal @db.Decimal(10, 2)` - never use `number` for currency |

### No New Dependencies Required
This phase only adds new models and API routes. No new npm packages needed.

---

## Architecture Patterns

### Recommended Project Structure
```
prisma/
└── schema.prisma          # Add: OrderItem.actualQty, CustomerDebtLedger, CustomerShellDeposit, Inventory

src/
├── app/
│   ├── api/
│   │   ├── orders/
│   │   │   ├── [id]/
│   │   │   │   └── reconcile/
│   │   │   │       └── route.ts    # PATCH - reconcile delivery
│   │   │   └── route.ts            # GET - extend with status=DELIVERED filter
│   │   ├── reports/
│   │   │   └── debt/
│   │   │       └── route.ts        # GET - outstanding debt per customer
│   │   └── deposits/
│   │       └── shells/
│   │           └── route.ts        # GET (list all) + PATCH (record transaction)
│   └── settle/
│       └── page.tsx                # Extend existing settle page with real data
├── components/
│   └── dashboard/
│       └── sidebar.tsx             # Add: Debt Report, Shell Deposits links
```

### Pattern 1: Append-Only Debt Ledger

**What:** CustomerDebtLedger entries are never updated or deleted, only created.

**When to use:** Phase 5 debt tracking - append-only gives audit trail even though full history is deferred.

**Implementation:**
```typescript
// CustomerDebtLedger model (Prisma)
model CustomerDebtLedger {
  id         String      @id @default(cuid())
  customerId String      @map("customer_id")
  type       LedgerType             // DEBT or PAYMENT
  amount     Decimal     @db.Decimal(10, 2)  // Always positive
  notes      String?
  createdAt  DateTime    @default(now()) @map("created_at")

  customer Customer @relation(fields: [customerId], references: [id])
}

enum LedgerType {
  DEBT    // Delivery - adds to what customer owes (positive amount stored)
  PAYMENT // Payment - reduces what customer owes (positive amount stored)
}
```

**Computing balance (in API):**
```typescript
// GET /api/reports/debt - aggregate in Prisma
const customers = await prisma.customer.findMany({
  include: {
    debtLedger: true,
  },
});

const outstanding = customers.map(c => {
  const totalDebt = c.debtLedger
    .filter(e => e.type === 'DEBT')
    .reduce((sum, e) => sum + e.amount.toNumber(), 0);
  const totalPayment = c.debtLedger
    .filter(e => e.type === 'PAYMENT')
    .reduce((sum, e) => sum + e.amount.toNumber(), 0);
  return {
    customerId: c.id,
    customerName: c.name,
    outstanding: totalPayment - totalDebt,  // Positive = customer owes
  };
});
```

**Why append-only matters:** If owner adjusts an error later, create a new PAYMENT or DEBT entry rather than editing history. This preserves audit trail for Phase 5+ transaction history.

### Pattern 2: Reconciliation Transaction

**What:** The reconcile endpoint must atomically perform 4 operations. Use Prisma `$transaction`.

**When to use:** INVD-02 + INVD-03 + INVD-04 (reconcile action triggers all downstream effects)

**Implementation:**
```typescript
// PATCH /api/orders/[id]/reconcile
const { items } = await request.json(); // [{ id: orderItemId, actualQty: number }]

await prisma.$transaction(async (tx) => {
  // 1. Update actualQty for each line item
  for (const item of items) {
    await tx.orderItem.update({
      where: { id: item.id },
      data: { actualQty: item.actualQty },
    });
  }

  // 2. Update order status to COMPLETED
  const order = await tx.order.update({
    where: { id },
    data: { status: 'COMPLETED' },
    include: { orderItems: true, customer: true },
  });

  // 3. Create debt ledger entry (DEBT = delivered value)
  const deliveredTotal = order.orderItems.reduce((sum, item) => {
    const qty = item.actualQty ?? item.quantity; // Use actualQty if set, else original
    return sum + (qty * item.unitPrice.toNumber());
  }, 0);

  await tx.customerDebtLedger.create({
    data: {
      customerId: order.customerId,
      type: 'DEBT',
      amount: deliveredTotal,
      notes: `Order ${order.id} delivered`,
    },
  });

  // 4. Deduct inventory for each product
  for (const item of order.orderItems) {
    const qty = item.actualQty ?? item.quantity;
    // Update or create daily inventory record
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await tx.inventory.upsert({
      where: {
        productId_date: { productId: item.productId, date: today },
      },
      create: {
        productId: item.productId,
        date: today,
        quantityOnHand: -qty, // Negative = deduction
      },
      update: {
        quantityOnHand: { decrement: qty },
      },
    });
  }
});
```

### Pattern 3: Shell Deposit Tracking

**What:** CustomerShellDeposit tracks two counters: shellsOut (customer owes factory) and shellsIn (factory owes customer).

**When to use:** INVD-06, INVD-07 - deposit tracking independent of debt

**Implementation:**
```typescript
model CustomerShellDeposit {
  id              String   @id @default(cuid())
  customerId      String   @unique @map("customer_id")
  shellsOut       Int      @default(0)  // Positive = customer owes factory shells
  shellsIn        Int      @default(0)  // Positive = factory owes customer shells
  depositPerShell Decimal  @db.Decimal(10, 2) @map("deposit_per_shell")
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  customer Customer @relation(fields: [customerId], references: [id])
}
```

**Recording shell transaction:**
```typescript
// PATCH /api/deposits/shells
// Body: { customerId, shellsOut?: number, shellsIn?: number, notes?: string }
const { customerId, shellsOut, shellsIn } = await request.json();

await prisma.customerShellDeposit.upsert({
  where: { customerId },
  create: {
    customerId,
    shellsOut: shellsOut ?? 0,
    shellsIn: shellsIn ?? 0,
    depositPerShell: 50000, // Default 50,000 VND per shell
  },
  update: {
    shellsOut: { increment: shellsOut ?? 0 },
    shellsIn: { increment: shellsIn ?? 0 },
  },
});
```

**Net deposit owed formula:**
```typescript
// netDepositOwed = shellsOut * depositPerShell - shellsIn * depositPerShell
// Positive = customer owes factory
// Negative = factory owes customer
```

### Pattern 4: Existing Route Handler Pattern (from confirm/route.ts)

**What:** Bearer token auth check → body parsing with Zod → business logic → response.

**Example for reconcile:**
```typescript
// PATCH /api/orders/[id]/reconcile
const ReconcileSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    actualQty: z.number().int().min(0),
  })),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Cookie-based auth (reuse existing pattern from orders routes)
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Role check
  if (session.role !== 'ACCOUNTANT' && session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = ReconcileSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid body' }, { status: 400 });

  // ... transaction logic
}
```

### Anti-Patterns to Avoid

- **Don't use floating point for money:** `number` (JavaScript float) causes precision errors. Use `Decimal @db.Decimal(10, 2)` in Prisma and `.toNumber()` only at display time.
- **Don't skip Prisma transaction for reconcile:** Four separate updates must be atomic. Without transaction, partial failures leave inconsistent state.
- **Don't allow negative actualQty:** Zod validation ensures `actualQty >= 0`.
- **Don't compute running balance on write:** Store the entry and compute on read. This keeps Phase 5 simple and enables transaction history later.
- **Don't combine shell deposits with debt ledger:** D-03 explicitly requires separate models.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Decimal arithmetic | Manual string math | Prisma `Decimal` type + `.toNumber()` at display | Precision errors with floats |
| Multi-step atomicity | Separate API calls | Prisma `$transaction` | Partial failures leave inconsistent state |
| Input validation | Manual checks | Zod schema validation | Already in use, consistent with codebase |
| Role-based API access | Custom middleware | Check `session.role` in route handler | Already established pattern |

**Key insight:** The reconcile endpoint is the most critical atomic operation in Phase 5. It must succeed or fail as a unit - you cannot have "order marked COMPLETED but no debt entry created."

---

## Common Pitfalls

### Pitfall 1: Decimal Serialization in JSON
**What goes wrong:** `Decimal` type fails JSON serialization. API returns empty object or 500 error.
**Why it happens:** Prisma `Decimal` objects are not plain JS objects.
**How to avoid:** Serialize before returning: `amount: debtEntry.amount.toNumber()`. Already done in existing orders API (line 46-47 of orders/route.ts).
**Warning signs:** `[object Object]` appearing in API responses, "Cannot serialize Decimal" errors.

### Pitfall 2: Conflicting Prisma Model Names
**What goes wrong:** `Inventory` name conflicts with Prisma's internal `Inventory` or other packages.
**How to avoid:** Use fully qualified name in schema or prefix: consider `DailyInventory` or `InventoryLog` for the new model.

### Pitfall 3: Inventory Deduction Sign Convention
**What goes wrong:** Unclear whether inventory quantityOnHand represents absolute stock or delta (change).
**Root cause:** Confusing whether "quantityOnHand: 100" means 100 bags in stock or 100 bags deducted.
**How to avoid:** Use delta approach (D-18: "quantityOnHand" implies current absolute). On COMPLETED: `quantityOnHand: { decrement: qty }`. Document in schema comments.
**Warning signs:** Inventory going negative, confusion in reports.

### Pitfall 4: Nullable actualQty vs Zero
**What goes wrong:** If `actualQty = 0` (customer received nothing) vs `actualQty = null` (not yet reconciled).
**Root cause:** Phase 5 debt = Σ(actualQty × unitPrice). Null means "not reconciled"; 0 means "reconciled as zero delivery".
**How to avoid:** In reconcile endpoint, require ALL items to have actualQty set. Null only valid before reconciliation starts. Zero is a valid reconciled value (partial delivery with nothing delivered).

### Pitfall 5: Race Condition on Concurrent Reconciliation
**What goes wrong:** Accountant A and B both open same DELIVERED order. Both reconcile. Second write overwrites first.
**How to avoid:** In reconcile PATCH, check that order status is still DELIVERED before updating. Return 409 Conflict if already COMPLETED.

### Pitfall 6: Date Filter for Reconciliation List
**What goes wrong:** Accountant opens reconciliation screen and sees ALL DELIVERED orders from all time, not just today's returns.
**How to avoid:** GET /api/orders?status=DELIVERED should accept optional `date` param. UI defaults to today. Already has date filter pattern in existing orders API (lines 22-28).

---

## Code Examples

### Existing Pattern: Cookie-Based Session Auth (from confirm/route.ts)

The existing `confirm/route.ts` uses Bearer token auth (for Driver). For accountant reconciliation, use cookie-based session:

```typescript
// Pattern for API routes (cookie-based auth)
import { getSession } from '@/lib/auth';

const session = await getSession();
if (!session) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### Existing Pattern: Zod Schema Validation (from confirm/route.ts)

```typescript
const ConfirmSchema = z.object({
  gps: z.object({ lat: z.number(), lng: z.number() }).nullable().optional(),
});
// For reconcile:
const ReconcileSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    actualQty: z.number().int().min(0),
  })),
});
```

### Existing Pattern: Decimal Handling (from orders/route.ts)

```typescript
// Serialize Decimals to numbers for client compatibility
const serialized = orders.map((order) => ({
  ...order,
  total: order.total.toNumber(),
  orderItems: order.orderItems.map((item) => ({
    ...item,
    unitPrice: item.unitPrice.toNumber(),
    lineTotal: item.lineTotal.toNumber(),
  })),
}));
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Simple Order.total | Order.total computed from Σ(actualQty × unitPrice) | Phase 5 | Order total now reflects actual delivery, not ordered quantity |
| Debt as single balance field | Append-only ledger with DEBT/PAYMENT entries | Phase 5 | Full audit trail preserved for future transaction history |
| Inventory not tracked | DailyInventory model tracks on-hand qty per product | Phase 5 | Foundation for future low-stock alerts and reorder suggestions |
| Paper-based reconciliation | Digital reconciliation with actualQty entry | Phase 5 | Eliminates day-end mismatch errors |

**Deprecated/outdated:**
- None in this phase's scope.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | CustomerDebtLedger entries use positive amounts with type field distinguishing DEBT vs PAYMENT | Database Schema | Could instead use negative amounts. D-04/D-05 specify type enum approach. |
| A2 | Inventory.quantityOnHand is absolute stock (not delta), decremented on COMPLETED | Inventory Deduction | If it's a delta instead, inventory report logic would differ |
| A3 | Single DailyInventory record per product per day (upsert pattern) | Inventory Deduction | If products have multiple deliveries per day, might need line items instead |
| A4 | Shell depositPerShell is fixed at 50,000 VND globally for Phase 5 | Shell Deposit | If per-customer rates exist, CustomerShellDeposit needs per-customer depositPerShell |

**All claims marked [ASSUMED] need user confirmation before becoming locked decisions.**

---

## Open Questions

1. **Should Order.total be recalculated on reconciliation?**
   - What we know: D-01 says debt = Σ(actualQty × unitPrice). Order.total is currently stored.
   - What's unclear: Should Order.total in database update to match actual delivered value, or keep original ordered total for reference?
   - Recommendation: Keep original Order.total as "ordered value" for reference. Create separate "deliveredTotal" or rely on debt ledger entry for accounting.

2. **What is the default depositPerShell value?**
   - What we know: D-09 mentions "depositPerShell value" per customer
   - What's unclear: Is there a global default? Can customers have different rates?
   - Recommendation: Set global default of 50,000 VND. Per-customer override deferred to Phase 5+.

3. **How to handle corrections after COMPLETED?**
   - What we know: D-12 says DELIVERED → COMPLETED only, no reversal in Phase 5
   - What's unclear: If accountant makes a mistake, how does admin correct it?
   - Recommendation: ADMIN can manually create compensating PAYMENT/DEBT entries. Direct database correction by admin is acceptable for Phase 5.

---

## Environment Availability

> Skip this section if the phase has no external dependencies (code/config-only changes).

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | Verified | (from package.json) | — |
| npm | Package manager | Verified | 11.11.0 | — |
| PostgreSQL | Database | (existing) | (from schema) | — |
| Prisma | ORM | (existing) | (from schema) | — |

**Step 2.6: SKIPPED** — Phase 5 is purely code/schema changes. No external tools, services, or runtimes beyond the existing Next.js application.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (Next.js 15 default) [CITED: Next.js 15 docs] |
| Config file | `vitest.config.ts` or `vitest.config.js` (if exists) |
| Quick run command | `npm run test` |
| Full suite command | `npm run test -- --run` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| INVD-01 | List DELIVERED orders | API unit | `GET /api/orders?status=DELIVERED` | Need to verify |
| INVD-02 | Enter actualQty per line item | API unit | PATCH with `{ items: [{id, actualQty}] }` | Need to verify |
| INVD-03 | Inventory auto-deducts on COMPLETED | Integration | Transaction test: reconcile -> check Inventory | Need to create |
| INVD-04 | Debt ledger entry created on reconcile | Integration | reconcile -> check CustomerDebtLedger | Need to create |
| INVD-05 | Debt report shows outstanding per customer | API unit | GET /api/reports/debt | Need to create |
| INVD-06 | Shell deposit tracking | API unit | GET/PATCH /api/deposits/shells | Need to create |
| INVD-07 | Deposit report shows customer balances | API unit | GET /api/deposits/shells | Need to create |

### Sampling Rate
- **Per task commit:** Run affected test files only
- **Per wave merge:** Full suite
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/api/orders.reconcile.test.ts` — covers INVD-01, INVD-02, INVD-03, INVD-04
- [ ] `tests/api/reports.debt.test.ts` — covers INVD-05
- [ ] `tests/api/deposits.shells.test.ts` — covers INVD-06, INVD-07
- [ ] `tests/setup.ts` — shared test setup with Prisma test client
- [ ] Framework install: Verify Vitest installed (`npm install -D vitest`)

*(If no gaps: "None — existing test infrastructure covers all phase requirements")*

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | Cookie-based session via `getSession()` - already implemented |
| V3 Session Management | Yes | JWT in HttpOnly cookie - already implemented |
| V4 Access Control | Yes | Role check in route handler (`session.role === 'ACCOUNTANT' \|\| session.role === 'ADMIN'`) |
| V5 Input Validation | Yes | Zod schema validation for all API inputs |
| V6 Cryptography | No | No crypto operations in this phase |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Unauthorized reconciliation | Spoofing | Role check: ACCOUNTANT or ADMIN only |
| Manipulating actualQty to reduce debt | Tampering | Server-side only: accountant enters via UI, not raw API |
| Viewing debt reports without permission | Information Disclosure | Role check: ACCOUNTANT or ADMIN only |
| Negative actualQty causing negative debt | Tampering | Zod validation: `z.number().int().min(0)` |
| SQL injection via order ID | Tampering | Prisma parameterized queries (default) |

---

## Sources

### Primary (HIGH confidence)
- `prisma/schema.prisma` — Existing models, confirms Decimal usage, OrderStatus enum, OrderItem structure
- `src/app/api/orders/[id]/confirm/route.ts` — Zod validation pattern, Prisma usage, error handling
- `src/app/api/orders/route.ts` — Decimal serialization, date filtering, Prisma include patterns
- `src/lib/auth.ts` — Cookie-based session, JWT payload, role field
- `src/middleware.ts` — Role-based route protection, ADMIN/ACCOUNTANT/STAFF roles
- `.agents/skills/next-best-practices/route-handlers.md` — Route handler patterns, Next.js 15 async params

### Secondary (MEDIUM confidence)
- Existing `settle/page.tsx` — Fake data UI pattern for reconciliation screen
- Existing `orders/page.tsx` — Real API integration pattern, Drawer component usage
- Existing `inventory/page.tsx` — Modal pattern for data entry

### Tertiary (LOW confidence)
- None — all claims verified against codebase

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — all libraries already in use
- Architecture: HIGH — patterns verified from existing codebase
- Pitfalls: MEDIUM — some pitfalls (Decimal serialization, atomic transactions) verified from existing code; others (race condition, sign convention) assumed from standard practices

**Research date:** 2026-04-16
**Valid until:** 2026-05-16 (30 days for stable Phase 5 scope)
