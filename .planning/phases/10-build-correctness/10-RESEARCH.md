# Phase 10: Build Correctness - Research

**Researched:** 2026-04-23
**Domain:** TypeScript build correctness for Next.js + Prisma stack
**Confidence:** HIGH

## Summary

Phase 10 fixes TypeScript compilation errors so `npx tsc --noEmit -p tsconfig.json` passes with zero errors, and `npm run build` completes successfully. Three categories of errors exist: (1) `role: string | undefined` vs `role: string` type mismatch in dashboard/page.tsx, (2) Prisma `Decimal` not assignable to `string | number` in dashboard-client.tsx, (3) missing `factoryId` on Product/Customer/Order creates in seed.ts. BUILD-05 (SortIcon) was already fixed in Phase 9 and requires no additional work.

**Primary recommendation:** Apply the locked decisions from CONTEXT.md exactly — update `DashboardClientProps.currentUser` to accept `role: string | undefined`, serialize Decimal fields at the server component boundary, and add system factory prerequisite + `factoryId` to all tenant entity creates in seed.ts.

---

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Change `DashboardClientProps.currentUser` type in `dashboard-client.tsx` line 26 to accept `role: string | undefined` (factoryId is already `string | null`)
- **D-02:** Fix `src/app/dashboard/page.tsx` line 65 to pass `{ id, role: session.role, factoryId }` matching the corrected interface — since the component guards with `currentUser?.role === 'ADMIN'`, undefined role is handled safely
- **D-03:** Serialize `Order.total` (Prisma Decimal) to string or number before passing to DashboardClient — use `.toString()` or `Number(decimal)` in the server component that fetches orders
- **D-04:** Audit other components that receive Prisma Decimal fields (Order.total, GlobalPrice.pricePerUnit, CustomerPriceOverride.pricePerUnit, OrderItem fields) — serialize at the server component boundary
- **D-05:** Create a system factory with `isSystem: true` as a seed prerequisite before creating Products, Customers, and Orders
- **D-06:** Attach `factoryId` to all tenant-scoped entities in seed.ts: Product, Customer, Order (and OrderItem through the relation)
- **D-07:** Serialize at the RSC (server component) boundary — where data is fetched and before passing to client components
- **D-08:** Do NOT serialize inside Prisma queries — keep raw Decimal values in database layer, convert at the component boundary

### Claude's Discretion

- Exact location in each file where Decimal serialization happens
- ESLint warnings cleanup (unused imports, console statements) — these don't block build but should be addressed

### Deferred Ideas (OUT OF SCOPE)

- ESLint warnings cleanup — not blocking build, separate from BUILD requirements
- INT-02 (per-customer pricing) — gap found in Phase 9 verification, different phase scope

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BUILD-01 | `npx tsc --noEmit -p tsconfig.json` passes with no errors | TypeScript 5.9.3, verified 3 error categories match known issues |
| BUILD-02 | `npm run build` completes successfully | Next.js 15.5.15, build fails on TypeScript errors — fixes below resolve it |
| BUILD-03 | Prisma Decimal fields serialized to string before passing to client components | `Order.total`, `OrderItem.unitPrice`, `OrderItem.lineTotal` are Decimal in schema; need `.toString()` or `Number()` at RSC boundary |
| BUILD-04 | Seed scripts create entities with proper `factoryId` field values | Product, Customer, Order require `factoryId` per schema; seed must create system factory first |
| BUILD-05 | `tenant-table.tsx` SortIcon moved out of render (no React Compiler errors) | Already fixed in Phase 9 — SortIcon is module-level function in tenant-table.tsx |

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| TypeScript error resolution | API / Backend (source files) | Frontend Server (RSC page components) | Errors span both tiers: dashboard/page.tsx (RSC) and dashboard-client.tsx (client component) |
| Decimal serialization | Frontend Server (RSC boundary) | Client components (receive serialized values) | Serialize at `dashboard/page.tsx` before passing to `DashboardClient` |
| Seed script factoryId fix | Database / Storage (seed.ts) | API / Backend (Prisma create calls) | Add system factory as prerequisite, then attach factoryId to Product/Customer/Order creates |
| ESLint cleanup | Client components | API routes | Warnings only — don't block build, deferred |

---

## Standard Stack

| Library | Version | Purpose | Why Standard |
|---------|--------|---------|--------------|
| TypeScript | 5.9.3 | Type checking | Already in use |
| Next.js | 15.5.15 | App Router, RSC, build | Already in use |
| Prisma | 6.0.0 | ORM with Decimal fields | Already in use |
| @prisma/client | 6.0.0 | Prisma runtime | Already in use |

**No new packages needed.**

---

## Architecture Patterns

### Type Error Patterns (Verified)

**Pattern 1: Role Type Mismatch**
```typescript
// src/lib/auth.ts — JWTPayload defines role as optional
export interface JWTPayload {
  role?: string; // optional in JWT, but DashboardClientProps expects non-optional
}

// src/components/dashboard/dashboard-client.tsx:26 — interface expects non-optional
currentUser: { id: string; role: string; factoryId: string | null } | null;

// src/app/dashboard/page.tsx:65 — passes session.role which is string | undefined
currentUser={session ? { id: session.userId, role: session.role, factoryId: session.factoryId } : null}
```

**Fix:** Update `DashboardClientProps.currentUser` to accept `role: string | undefined` as per D-01.

**Pattern 2: Prisma Decimal Not Assignable to string | number**
```typescript
// dashboard-client.tsx:22-25 — orders prop type
orders: (Order & {
  customer: { name: string; code: string };
  orderItems: { product: { name: string; sizeKg: number }; quantity: number }[];
})[];

// recent-orders.tsx:14 — Order.total defined as string | number
total: string | number;

// dashboard/page.tsx:27-38 — getOrders returns Order with Decimal total
// Prisma Order type: total is Decimal, not string | number
```

**Fix:** Serialize `Order.total` at the RSC boundary in `dashboard/page.tsx` using `.toString()` or `Number()`. The `RecentOrders` component already handles `string | number` (see line 131-134 in recent-orders.tsx).

**Pattern 3: Missing factoryId in Seed Creates**
```typescript
// src/db/seed.ts:111-118 — Product create missing factoryId
const created = await prisma.product.create({
  data: {
    name: product.name,
    sizeKg: product.sizeKg,
    unit: product.unit,
    isActive: true,
    // factoryId missing — schema requires it
  },
});

// src/db/seed.ts:132-139 — Customer create missing factoryId
// Same issue

// src/db/seed.ts:332-341 — Order create missing factoryId
// Same issue
```

**Fix:** Create system factory first (with `isSystem: true`), then use its ID as `factoryId` on all tenant entity creates.

---

## Decimal Serialization Pattern

Prisma `Decimal` type (backed by decimal.js) serializes via:
- `.toString()` — returns string representation (e.g., "25000")
- `.toNumber()` — returns JavaScript number (e.g., 25000)
- JSON serialization — `JSON.stringify(new Decimal(25000))` returns `"25000"`

The `recent-orders.tsx` component already handles both `string | number` (lines 131-134):
```typescript
const total =
  typeof order.total === 'string'
    ? parseFloat(order.total)
    : order.total;
```

So serialization to either string or number works. String serialization via `.toString()` is preferred for precision with currency values.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Decimal to JSON | Custom JSON serialization | `.toString()` or `Number()` at RSC boundary | Prisma Decimal has built-in methods; no need for custom serialization |
| factoryId generation | Ad-hoc UUID generation | Create system factory and reuse its ID | Consistent with how production system factory works |

---

## Common Pitfalls

### Pitfall 1: Serializing Inside Client Components Instead of at RSC Boundary
**What goes wrong:** If Decimal serialization happens inside `DashboardClient` or `RecentOrders`, the TypeScript error remains at the prop boundary.
**Why it happens:** The prop type accepts `string | number`, but passing raw Prisma Decimal fails at the JSX level.
**How to avoid:** Serialize in `dashboard/page.tsx` before passing to `DashboardClient`.

### Pitfall 2: Missing OrderItem Decimal Fields in Serialization
**What goes wrong:** `OrderItem.unitPrice` and `OrderItem.lineTotal` are also Decimal fields but may be missed during audit.
**Why it happens:** BUILD-03 mentions Order.total specifically, but OrderItem fields are also Decimal.
**How to avoid:** The `RecentOrders` component only uses `Order.total`, not OrderItem fields — but if other components consume OrderItem, those need serialization too.

### Pitfall 3: Seed Creates Use Wrong Relation Syntax
**What goes wrong:** `factory: { connect: { id: factoryId } }` uses relation syntax, but the schema uses direct `factoryId` field.
**Why it happens:** Prisma schema has `factoryId String @map("factory_id")` (direct field), not a required relation. The create must use `factoryId: factory.id` directly.
**How to avoid:** Check `prisma.product.create({ data: { factoryId: systemFactory.id, ... } })` not `factory: { connect: ... }`.

---

## Code Examples

### Decimal Serialization at RSC Boundary
```typescript
// src/app/dashboard/page.tsx — serialize before passing to DashboardClient
const orders = rawOrders.map(order => ({
  ...order,
  total: order.total.toString(), // Decimal → string
}));

// DashboardClient receives orders with total as string — type-compatible
```

### Seed Script System Factory + factoryId
```typescript
// src/db/seed.ts — create system factory first
async function createSystemFactory() {
  const factory = await prisma.factory.upsert({
    where: { id: 'system-factory-id' },
    update: {},
    create: {
      id: 'system-factory-id', // or let Prisma generate
      name: 'System',
      isSystem: true,
    },
  });
  return factory;
}

// Then use factory.id for all tenant creates
async function createProducts(systemFactoryId: string) {
  for (const product of PRODUCTS) {
    await prisma.product.create({
      data: {
        ...product,
        factoryId: systemFactoryId, // attach factoryId
      },
    });
  }
}
```

---

## State of the Art

No new patterns. All techniques are established Prisma/Next.js patterns.

---

## Assumptions Log

> List all claims tagged `[ASSUMED]` in this research. The planner and discuss-phase use this section to identify decisions that need user confirmation before execution.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | SortIcon (BUILD-05) is fully resolved by Phase 9 — no remaining React Compiler errors | BUILD-05 | If not fully fixed, Phase 10 would need additional SortIcon work |
| A2 | System factory upsert in seed.ts can use a fixed ID (e.g., 'system-factory') instead of generating one | seed.ts factory creation | If fixed ID conflicts with existing data, upsert logic handles it |
| A3 | Dashboard page is the only RSC that passes Order data to client components — no other page needs Decimal serialization for Order | Decimal serialization scope | If other pages pass Order data, those also need serialization |

**All three assumptions verified via codebase inspection — confidence HIGH.**

---

## Open Questions

None — all three TypeScript errors have clear fix paths per locked decisions.

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies — this is a code-fix phase for existing codebase).

---

## Sources

### Primary (HIGH confidence)
- `src/app/dashboard/page.tsx` — line 65 error location, RSC boundary for serialization
- `src/components/dashboard/dashboard-client.tsx` — line 22-26, DashboardClientProps interface
- `src/components/dashboard/recent-orders.tsx` — Order interface, total: string | number
- `src/db/seed.ts` — lines 105-124, 126-146, 274-349 — missing factoryId
- `prisma/schema.prisma` — Decimal fields on Order, OrderItem, GlobalPrice, CustomerPriceOverride
- `src/lib/auth.ts` — JWTPayload interface with `role?: string`

### Secondary (MEDIUM confidence)
- `npm run build` output — confirms build fails on TypeScript errors, no other blocking issues
- `npx tsc --noEmit -p tsconfig.json` — confirms exact error messages match analysis

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — existing project, no new dependencies
- Architecture: HIGH — straightforward error fixes with clear patterns
- Pitfalls: MEDIUM — based on codebase reading, edge cases unlikely given locked decisions

**Research date:** 2026-04-23
**Valid until:** 30 days (stable domain — concrete TypeScript fixes)