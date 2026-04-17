---
phase: "01-foundation-order-entry"
plan: "01"
subsystem: database
tags: [prisma, multi-tenant, factory, postgresql]

# Dependency graph
requires: []
provides:
  - Factory model with isSystem flag for default factory during backfill
  - factoryId String field on Customer, Driver, Order, Product
  - @@unique([code, factoryId]) on Customer for factory-scoped code uniqueness
  - @@unique([phone, factoryId]) on Driver for factory-scoped phone uniqueness
  - @@index([factoryId]) on all tenant entities
affects: [01-02, 01-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Direct factoryId String field (not inherited via relation)
    - Composite unique constraints for factory-scoped uniqueness

key-files:
  modified:
    - prisma/schema.prisma - Factory model + factoryId on all tenant entities + composite unique constraints

key-decisions:
  - "D-04: Direct factoryId String field on Customer, Driver, Order, Product"
  - "D-05: @@unique([code, factoryId]) on Customer.code and @@unique([phone, factoryId]) on Driver.phone"
  - "D-01: Create default System factory with isSystem=true for existing records"

patterns-established:
  - "Composite unique constraint pattern for factory-scoped uniqueness"

requirements-completed: [DATA-01, DATA-05]

# Metrics
duration: ~8min
completed: 2026-04-17
---

# Phase 01-01: Multi-tenant Factory Foundation Summary

**Factory model with isSystem flag, factoryId on all tenant entities, and composite unique constraints ([code, factoryId], [phone, factoryId]) establishing multi-tenant foundation for v2.0**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-17T09:24:28Z
- **Completed:** 2026-04-17T09:32:00Z
- **Tasks:** 5
- **Files modified:** 1 (prisma/schema.prisma)

## Accomplishments
- Added Factory model with id, name, phone, address, isSystem (Boolean default false), createdAt, updatedAt
- Added factoryId String field to Customer, Driver, Order, Product with @@index([factoryId])
- Changed Customer.code from @unique to @@unique([code, factoryId]) for factory-scoped uniqueness
- Changed Driver.phone from @unique to @@unique([phone, factoryId]) for factory-scoped uniqueness
- Fixed Subscription relation to reference Factory (one-to-many, not one-to-one)
- Removed invalid factorySubscription back-relation from User
- Prisma schema validates and generates TypeScript types successfully

## Task Commits

Single commit for all schema changes (5 tasks modifying same file):

1. **Tasks 1-5: Factory model and factoryId additions** - `b06f8d8` (feat)

**Plan commit:** `b06f8d8` (feat(01-01): add Factory model and factoryId to all tenant entities)

## Files Created/Modified
- `prisma/schema.prisma` - Factory model + factoryId on Customer, Driver, Order, Product + composite unique constraints + factory relations + @@index([factoryId]) on all tenant entities

## Decisions Made
- Used direct `factoryId String` field (not inherited) per D-04
- Factory model includes six relation fields: users, subscriptions, customers, drivers, orders, products
- Subscription changed from @unique to @@index on factoryId (one factory can have multiple subscriptions in future)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- **factorySubscription back-relation:** User model had `factorySubscription Subscription?` back-relation that was invalid after Subscription was changed to reference Factory. Fixed by removing the back-relation and adding proper relation from Factory to Subscription[].
- **Subscription one-to-one constraint:** Removed @unique from factoryId to allow multiple subscriptions per factory (per FACT-03), changed relation to one-to-many via Factory.subscriptions[].

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Prisma schema ready for migration (Plan 01-02 will add migration)
- Factory model establishes multi-tenant foundation
- All tenant entities have factoryId field for tenant isolation

---
*Phase: 01-foundation-order-entry-01*
*Completed: 2026-04-17*
