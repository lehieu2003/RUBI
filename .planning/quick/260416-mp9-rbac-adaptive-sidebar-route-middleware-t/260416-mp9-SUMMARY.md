---
gsd_version: 1.0
quick_id: 260416-mp9
description: RBAC: Adaptive Sidebar + Route Middleware theo vai trò User
date: 2026-04-16
status: completed
---

# Quick Task Summary: RBAC — Adaptive Sidebar + Route Middleware

## Changes Made

### 1. Auth Provider — Role in User type

**File:** `src/lib/auth-provider.tsx`
- Added `role?: 'ADMIN' | 'ACCOUNTANT' | 'STAFF'` to User interface
- The `/api/auth/me` response already includes role from previous task

### 2. Adaptive Sidebar by Role

**File:** `src/components/dashboard/sidebar.tsx`

Menu filtered by role:
- **STAFF** → `/dashboard`, `/orders`, `/customers` (order entry focus)
- **ACCOUNTANT** → adds `/settle`, `/inventory`, `/vehicles`
- **ADMIN** → adds `/settings`

Added `Receipt` icon for Đối soát (settle) page.

### 3. Route Middleware with Role Protection

**File:** `src/middleware.ts`

Role-based route protection:
- `roleRoutes` map defines allowed roles per path
- Unauthenticated → redirect to `/login`
- Wrong role → redirect to `/dashboard?error=unauthorized`
- Checks both exact path (`/settings`) and parent segment (`/settings/staff`)

## Verification

- `npx tsc --noEmit` — our changed files: **PASS**
- Pre-existing errors in `orders/confirm`, `orders/map`, `dashboard-client`: unrelated to this task

## Role Permissions Summary

| Route | STAFF | ACCOUNTANT | ADMIN |
|-------|-------|------------|-------|
| /dashboard | ✓ | ✓ | ✓ |
| /orders | ✓ | ✓ | ✓ |
| /customers | ✓ | ✓ | ✓ |
| /settle | ✗ | ✓ | ✓ |
| /inventory | ✗ | ✓ | ✓ |
| /vehicles | ✗ | ✓ | ✓ |
| /settings | ✗ | ✗ | ✓ |