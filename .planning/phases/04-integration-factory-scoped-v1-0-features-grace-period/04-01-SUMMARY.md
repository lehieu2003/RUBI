---
phase: 04-integration-factory-scoped-v1-0-features-grace-period
plan: 04-01
status: complete
completed: 2026-04-21
wave: 1
---

## Summary

Fixed three entity creation endpoints that were missing the required `factoryId` field, causing Prisma validation errors on order/customer/driver creation.

## Changes Made

### 1. `src/lib/actions/orders.ts` — saveOrder server action

- Added `import { getSession } from '@/lib/auth';`
- Added session check at start of `saveOrderInternal`: throws `'Factory context required'` if no session or factoryId
- Added `factoryId: session.factoryId` to `tx.order.create` data object

### 2. `src/app/api/customers/route.ts` — POST /api/customers

- Added `factoryId: session.factoryId` to `prisma.customer.create` data object

### 3. `src/app/api/drivers/route.ts` — POST /api/drivers

- Added `factoryId: session.factoryId` to `prisma.driver.create` data object

## Verification

```bash
grep -n "factoryId.*session.factoryId" src/lib/actions/orders.ts
# → line 83: factoryId: session.factoryId,

grep -n "factoryId.*session.factoryId" src/app/api/customers/route.ts
# → line 45: factoryId: session.factoryId,

grep -n "factoryId.*session.factoryId" src/app/api/drivers/route.ts
# → line 67: factoryId: session.factoryId,
```

## Key Links Validated

| Link | Pattern Verified |
|------|-----------------|
| saveOrder → tx.order.create | `factoryId.*session\.factoryId` ✓ |
| POST /api/customers → customer.create | `factoryId.*session\.factoryId` ✓ |
| POST /api/drivers → driver.create | `factoryId.*session\.factoryId` ✓ |

## Commits

- `1551ed0` fix(04): add factoryId to order/customer/driver creation