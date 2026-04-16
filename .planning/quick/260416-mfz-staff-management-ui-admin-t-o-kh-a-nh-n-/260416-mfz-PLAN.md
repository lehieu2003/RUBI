---
gsd_version: 1.0
quick_id: 260416-mfz
description: Staff Management UI: Admin tạo/khóa/nhân viên, đổi mật khẩu nhanh
date: 2026-04-16
status: in_progress
---

# Quick Plan: Staff Management UI

## Task Summary

Add Admin-only Staff Management tab to Settings page: table of staff with name/role/email/status, quick password reset, and lock/unlock functionality.

## Tasks

### Task 1: Create Staff API Routes

**Action:** Create API routes for admin to list/create/update/lock staff users

**Files:**
- `src/app/api/staff/route.ts` (GET list, POST create)
- `src/app/api/staff/[id]/route.ts` (PATCH update, DELETE remove)

**Changes:**
1. `GET /api/staff` — List all users (ADMIN only), returns id, name, email, role, isActive
2. `POST /api/staff` — Create new staff user (ADMIN only), takes name, email, password, role
3. `PATCH /api/staff/[id]` — Update user (ADMIN only), supports isActive toggle and password reset
4. `DELETE /api/staff/[id]` — Soft delete by setting isActive=false (ADMIN only)

**Verify:**
- `npx tsc --noEmit` passes
- Route files exist and export GET/POST/PATCH/DELETE handlers

**Done:** Staff API routes created

---

### Task 2: Add Staff Management Tab to Settings Page

**Action:** Add "Nhân sự" tab to Settings page, visible only to ADMIN role

**Files:**
- `src/app/settings/page.tsx`

**Changes:**
1. Add `staff` icon to tabs array (add to existing tabs import)
2. Add `staff` tab button with Users icon
3. Add `staff` tab content panel:
   - Table columns: Họ tên | Vai trò | Email | Trạng thái | Thao tác
   - Row actions: Đổi mật khẩu (icon), Khóa/Mở khóa (toggle)
   - "Thêm nhân viên" button → opens create modal
4. Add Create Staff modal with form (name, email, password, role select)
5. Add Change Password modal per row
6. Gate entire tab on ADMIN role (redirect or show "Không có quyền")

**Verify:**
- Page renders without TypeScript errors
- Tab shows for ADMIN, hidden for others

**Done:** Staff Management tab added to Settings page

---

### Task 3: Update Register API for Default Role

**Action:** Ensure new registrations default to STAFF role

**Files:**
- `src/app/api/auth/register/route.ts`

**Changes:**
- Ensure `role: 'STAFF'` is set on user creation (should already be default in schema)

**Verify:**
- Code sets role explicitly or relies on Prisma default

**Done:** Register API confirmed correct