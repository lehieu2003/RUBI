---
gsd_version: 1.0
quick_id: 260416-mfz
description: Staff Management UI: Admin tạo/khóa/nhân viên, đổi mật khẩu nhanh
date: 2026-04-16
status: completed
---

# Quick Task Summary: Staff Management UI

## Changes Made

### 1. Staff API Routes

**Files:**
- `src/app/api/staff/route.ts`
- `src/app/api/staff/[id]/route.ts`

**Routes:**
- `GET /api/staff` — List all users (ADMIN only)
- `POST /api/staff` — Create new staff user (ADMIN only)
- `PATCH /api/staff/[id]` — Update user / toggle isActive / reset password (ADMIN only)
- `DELETE /api/staff/[id]` — Soft delete (set isActive=false) (ADMIN only)

All routes require ADMIN role via `getSession()` + role check.

### 2. Update /api/auth/me — Return Full User Object

**File:** `src/app/api/auth/me/route.ts`

Now returns `{ id, email, name, role, isActive }` from database (not just JWT payload). This is needed by the Settings page to check ADMIN role and display current user info.

### 3. Staff Management Tab in Settings

**File:** `src/app/settings/page.tsx`

- Added "Nhân sự" tab, visible only to ADMIN role
- Table with columns: Họ tên | Vai trò | Email | Trạng thái | Thao tác
- Per-row actions:
  - **Đổi mật khẩu** (Key icon) → opens password reset modal
  - **Khóa/Mở khóa** → toggles isActive via PATCH
- "Thêm nhân viên" button → opens create modal with form (name, email, password, role select)
- Role badges: Admin (purple), Kế toán (amber), Nhân viên (blue)
- Status badges: Hoạt động (green), Khóa (red)

## Verification

- `npx tsc --noEmit` — staff API files and settings page: **PASS**
- Pre-existing errors in `orders/confirm`, `orders/map`, `dashboard-client`: unrelated to this task

## Workflow Notes

- Admin cannot modify or delete their own account
- Password reset requires min 6 characters
- Soft delete preserves historical order data (isActive=false, not row deletion)