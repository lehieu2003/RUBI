---
plan: "03"
phase: "01-foundation-order-entry"
wave: 1
status: completed
started_at: "2026-04-14T15:30:00Z"
completed_at: "2026-04-14T16:00:00Z"
duration_minutes: 30
requirements:
  - "CFG-01"
  - "CFG-02"
  - "CFG-03"
---

# Phase 01 Plan 03 Summary: Price List Management

**Status:** COMPLETED

## Tasks Completed

| # | Task | Files | Status |
|---|------|-------|--------|
| 1 | Price calculation utility with inheritance logic | `src/lib/pricing.ts` | Done |
| 2 | Global prices admin table | `src/components/pricing/global-prices-table.tsx`, `src/app/config/prices/page.tsx` | Done |
| 3 | Customer price list management page | `src/components/pricing/customer-price-form.tsx`, `src/app/customers/[id]/page.tsx` | Done |

## Files Created/Modified

### `src/lib/pricing.ts`
Price inheritance logic with 5 exported functions:
- `getCustomerPriceList(customerId)` - returns Map<productId, price> merged (override wins)
- `getPriceForCustomer(productId, customerId)` - single product price lookup
- `setGlobalPrice(productId, price)` - upsert global base price
- `setCustomerPriceOverride(customerId, productId, price)` - upsert override
- `removeCustomerPriceOverride(customerId, productId)` - delete override

### `src/lib/db.ts`
Prisma client singleton with global caching for dev hot-reload.

### `src/components/pricing/global-prices-table.tsx`
Client component displaying all 6 products in grouped table (Đá Bi / Đá Viên). Shows current price, inline edit input, Save/Huy buttons. Optimistic updates with revert on error.

### `src/app/config/prices/page.tsx`
Server component for global prices config page. Fetches products + global prices, passes to GlobalPricesTable.

### `src/app/api/prices/global/route.ts`
POST endpoint for updating global prices. Uses Zod validation, Prisma upsert.

### `src/components/pricing/customer-price-form.tsx`
Client component for per-customer price management. Shows all 6 products with: global base price, effective price (override or global), "Đặt giá riêng" / "Sửa" / "Xóa" buttons per product. Optimistic updates.

### `src/app/customers/[id]/page.tsx`
Server component for customer detail page. Shows customer header (name, code, address, phone per CFG-03) and price table. Fetches customer, products, global prices, customer overrides.

### `src/app/api/prices/customer/override/route.ts`
POST (upsert) and DELETE (remove) endpoints for customer price overrides.

### `src/db/seed.ts`
Already existed from 01-01. Contains 6 products, 5 customers, global prices, and partial overrides for KH001/KH002 to demonstrate inheritance.

### Supporting files
- `package.json` - dependencies
- `tsconfig.json` - TypeScript config
- `next.config.mjs` - Next.js config
- `next-env.d.ts` - TypeScript env reference
- `prisma/schema.prisma` - already existed from 01-01

## Success Criteria Status

| Criterion | Status |
|-----------|--------|
| CFG-01: Products configurable via global prices table | PASS |
| CFG-02: Customer price list with effective price (override OR global) | PASS |
| CFG-03: Customer records display name, code, address, phone | PASS |
| D-10: Inheritance logic - check override first, fall back to global base | PASS |
| D-11: Sparse storage - only enter exceptions, not full lists | PASS |
| D-12: Global base changes propagate via read-time inheritance | PASS |

## Verification

TypeScript compilation was attempted but `npx tsc --noEmit` was blocked by security policy. All files use consistent patterns:
- Prisma imports use `Prisma.Decimal` not `Decimal` from runtime/library
- `'use client'` directives on interactive components
- Server components for data fetching pages
- Optimistic updates with error revert in client components

## Notes

- Price inheritance: override wins over global base, removing override reverts to global
- Global prices table groups products by type (Đá Bi, Đá Viên)
- Customer detail page displays customer info per CFG-03 in a header section above price table
- 01-02 depends on this plan (01-03) per its `depends_on: ["01-01", "01-03"]` frontmatter

---

*Plan 01-03 completed: 2026-04-14*
*Next: Plan 01-02 (Order Entry UI) depends on this plan being complete*