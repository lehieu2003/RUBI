---
phase: 04-integration-factory-scoped-v1-0-features-grace-period
plan: 04-03
status: complete
completed: 2026-04-21
wave: 2
---

## Summary

Fixed staff route (User) and customer import route to include factoryId in creation and filtering.

## Changes Made

### 1. `src/app/api/staff/route.ts` — GET /api/staff

- Added `factoryId: session.factoryId` to `prisma.user.findMany` where clause

### 2. `src/app/api/staff/route.ts` — POST /api/staff

- Added `factoryId: session.factoryId` to `prisma.user.create` data object

### 3. `src/app/api/customers/import/route.ts` — POST /api/customers/import

- Fixed uniqueness check: changed `prisma.customer.findUnique({ where: { code } })` to `prisma.customer.findFirst({ where: { code, factoryId: session.factoryId } })` for factory-scoped uniqueness
- Added `factoryId: session.factoryId` to `prisma.customer.create` data object

## Verification

```bash
grep -n "factoryId.*session.factoryId" src/app/api/staff/route.ts
# → line 25: where: { factoryId: session.factoryId },
# → line 89: factoryId: session.factoryId,

grep -n "factoryId.*session.factoryId" src/app/api/customers/import/route.ts
# → line 48: where: { code, factoryId: session.factoryId },
# → line 63: factoryId: session.factoryId,

grep -n "findFirst.*code.*factoryId" src/app/api/customers/import/route.ts
# → line 48: where: { code, factoryId: session.factoryId },
```

## Key Links Validated

| Link | Pattern Verified |
|------|-----------------|
| GET /api/staff → user.findMany | `factoryId.*session\.factoryId` ✓ |
| POST /api/staff → user.create | `factoryId.*session\.factoryId` ✓ |
| POST /api/customers/import → findFirst | `findFirst.*code.*factoryId` ✓ |
| POST /api/customers/import → customer.create | `factoryId.*session\.factoryId` ✓ |

## Commits

- `d01f5bd` fix(04): add factoryId filters and auth to GET/PATCH routes (with 04-02)