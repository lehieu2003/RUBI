---
phase: 04-integration-factory-scoped-v1-0-features-grace-period
plan: 04-02
status: complete
completed: 2026-04-21
wave: 2
---

## Summary

Added explicit defensive `factoryId` filters on GET routes and factory ownership checks on PATCH status route. Per D-01: hybrid middleware + per-route approach for defense-in-depth.

## Changes Made

### 1. `src/app/api/orders/route.ts` — GET /api/orders

- Added `factoryId: session.factoryId` to where clause (line 23)

### 2. `src/app/api/products/route.ts` — GET /api/products

- Added `getSession` import and auth check (returns 401 if no session)
- Added `factoryId: session.factoryId` to where clause (line 13)

### 3. `src/app/api/orders/map/route.ts` — GET /api/orders/map

- Added `getSession` import
- Added session auth check (401 if no session, 403 if not ACCOUNTANT/ADMIN)
- Added `factoryId: session.factoryId` to where clause

### 4. `src/app/api/orders/[id]/status/route.ts` — PATCH status

- Added `getSession` import
- Added session auth check (401/403)
- Added `findFirst` ownership check before update (returns 404 if order not found or belongs to different factory)
- Added `factoryId: session.factoryId` to update where clause

## Verification

```bash
grep -n "factoryId.*session.factoryId" src/app/api/orders/route.ts
# → line 23: factoryId: session.factoryId,

grep -n "factoryId.*session.factoryId" src/app/api/products/route.ts
# → line 13: factoryId: session.factoryId,

grep -n "factoryId.*session.factoryId" src/app/api/orders/map/route.ts
# → line 31: factoryId: session.factoryId,

grep -n "findFirst.*factoryId" src/app/api/orders/\[id\]/status/route.ts
# → line 48: where: { id, factoryId: session.factoryId },

grep -n "getSession" src/app/api/orders/map/route.ts
# → line 4: import { getSession } from '@/lib/auth';
# → line 9: const session = await getSession();
```

## Key Links Validated

| Link | Pattern Verified |
|------|-----------------|
| GET /api/orders → findMany | `factoryId.*session\.factoryId` ✓ |
| GET /api/orders/map → findMany | `factoryId.*session\.factoryId` ✓ |
| PATCH /api/orders/[id]/status → findFirst | `findFirst.*factoryId.*session\.factoryId` ✓ |
| PATCH /api/orders/[id]/status → update | `factoryId.*session\.factoryId` ✓ |

## Commits

- `d01f5bd` fix(04): add factoryId filters and auth to GET/PATCH routes (with 04-03)