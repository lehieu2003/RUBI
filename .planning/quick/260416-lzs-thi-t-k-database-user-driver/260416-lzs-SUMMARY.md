---
gsd_version: 1.0
quick_id: 260416-lzs
description: Thiết kế Database User & Driver
date: 2026-04-16
status: completed
---

# Quick Task Summary: Thiết kế Database User & Driver

## Changes Made

### 1. User Model — Added Role Field

**File:** `prisma/schema.prisma`

- Added `UserRole` enum with `ADMIN`, `ACCOUNTANT`, `STAFF` values
- Added `role` field to `User` model (default: `STAFF`)
- Added `assignedOrders` relation via `OrderAssigner` relation

**Why:** Separates staff permissions (owner sees all reports, accountant confirms deliveries, staff enters orders).

### 2. Driver Model — Enhanced

**File:** `prisma/schema.prisma`

- Added `phone` field (optional, unique) for driver contact
- `token` now uses `@default(uuid())` for secure UUID generation
- Reordered fields for clarity (name, phone, token, slug, isActive)

**Why:** Token-in-URL auth for drivers (D-01), phone for driver identification.

### 3. Order Model — Driver Assignment + GPS Capture

**File:** `prisma/schema.prisma`

- Added `assignerId` + `assigner` relation (who assigned the driver)
- Replaced `deliveryGps Json?` with explicit `deliveryLat Float?`, `deliveryLng Float?`, `deliveredAt DateTime?`
- Added GPS capture fields for D-04/D-06 delivery confirmation

**Why:** Audit trail (who assigned), GPS verification at delivery time.

## Verification

- `npx prisma validate` — **PASSED**
- `npx prisma generate` — **PASSED**

## Schema Summary

```
User (role: ADMIN/ACCOUNTANT/STAFF)
  └── assignedOrders (OrderAssigner)

Driver (token-based URL auth)
  └── orders

Order
  ├── customerId → Customer
  ├── driverId → Driver (nullable)
  ├── assignerId → User (nullable, OrderAssigner)
  ├── deliveryLat, deliveryLng, deliveredAt (GPS capture)
  └── status: PENDING → SHIPPING → DELIVERED → COMPLETED | CANCELLED
```