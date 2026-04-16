---
gsd_version: 1.0
quick_id: 260416-lzs
description: Thiết kế Database User & Driver
date: 2026-04-16
status: in_progress
---

# Quick Plan: Thiết kế Database User & Driver

## Task Summary

Update Prisma schema to separate User (office staff with login) and Driver (token-based access) entities with proper relationships to Order.

## Tasks

### Task 1: Update Prisma Schema — User Model

**Action:** Add `User` model and `UserRole` enum to `prisma/schema.prisma`

**Files:**
- `prisma/schema.prisma`

**Changes:**
1. Add `UserRole` enum with `ADMIN`, `ACCOUNTANT`, `STAFF` values
2. Add `User` model with: `id`, `name`, `email` (unique), `password`, `role`, `createdAt`, `updatedAt`
3. Add `assignedOrders` relation on User (via `OrderAssigner` relation)
4. Keep existing Customer and Order models unchanged

**Verify:**
- `npx prisma validate` passes
- Schema contains `model User` and `enum UserRole`

**Done:** Schema updated with User model and UserRole enum

---

### Task 2: Update Prisma Schema — Driver Model

**Action:** Add `Driver` model with token-based auth fields to `prisma/schema.prisma`

**Files:**
- `prisma/schema.prisma`

**Changes:**
1. Add `Driver` model with: `id`, `name`, `phone` (unique, optional), `token` (unique UUID), `slug` (unique), `isActive`, `createdAt`, `updatedAt`
2. Add `orders` relation on Driver (1-to-many with Order)
3. Add `driverId`, `driver` relation to existing Order model
4. Add `assignerId`, `assigner` relation to Order (OrderAssigner self-relation)
5. Add `deliveryLat`, `deliveryLng`, `deliveredAt` to Order (GPS capture)
6. Update OrderStatus enum to include DELIVERED status

**Verify:**
- `npx prisma validate` passes
- Schema contains `model Driver` with `token` and `slug` fields
- Order model has `driverId`, `assignerId`, `deliveryLat`, `deliveryLng`, `deliveredAt`

**Done:** Schema updated with Driver model and Order relations/fields

---

### Task 3: Generate Prisma Client

**Action:** Run `prisma generate` to update the generated client

**Files:**
- `prisma/schema.prisma` (source)
- `node_modules/.prisma/client` (generated — do not edit manually)

**Changes:**
1. Run `npx prisma generate`
2. Verify generated client includes User, Driver types

**Verify:**
- `npx prisma generate` completes without error
- Generated `index.d.ts` or similar includes User and Driver types

**Done:** Prisma client regenerated with new models