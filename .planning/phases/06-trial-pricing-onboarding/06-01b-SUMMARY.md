---
phase: "06"
plan: "01b"
subsystem: trial-ui
tags:
  - subscription
  - trial
  - middleware
  - registration
requires:
  - REQ-10
provides:
  - src/components/trial/TrialBanner.tsx
  - src/components/trial/TrialWarningModal.tsx
  - src/app/(auth)/register/page.tsx (modified)
  - src/middleware.ts (modified)
affects:
  - src/lib/auth-provider.tsx
tech_stack:
  added:
    - TrialBanner (Vietnamese text, 4 subscription states)
    - TrialWarningModal (non-dismissible variant for expired)
  patterns:
    - Client-side subscription status polling via useEffect
    - Middleware subscription enforcement on write operations
key_files:
  created:
    - src/components/trial/TrialBanner.tsx
    - src/components/trial/TrialWarningModal.tsx
  modified:
    - src/app/(auth)/register/page.tsx
    - src/lib/auth-provider.tsx
    - src/middleware.ts
key_decisions:
  - "Registration form field order: factoryName (1st), phone (2nd), name (3rd), email (4th), password (5th)"
  - "TrialBanner uses named export, renders for TRIAL/EXPIRED/CANCELLED/GRACE states in Vietnamese"
  - "TrialWarningModal is non-dismissible — no X button, no backdrop close"
  - "Middleware fails open on DB errors (subscription check errors don't block requests)"
  - "GET requests never blocked by subscription status (read-only allowed)"
requirements_completed:
  - REQ-10
completed: 2026-04-17T00:00:00Z
duration: 2 min
start: 2026-04-17T00:00:00Z
end: 2026-04-17T00:00:00Z
---

# Phase 06 Plan 01b: Trial UI Components — Summary

**Substantive one-liner:** Registration form reordered with factoryName first, global TrialBanner with Vietnamese text, non-dismissible TrialWarningModal, and middleware subscription enforcement.

## What Was Built

### Registration Page Reordering
- Factory name field is now first (label: "Tên nhà máy / Doanh nghiệp")
- Phone field is second (label: "Số điện thoại liên hệ")
- Manager name field is third (label: "Tên người quản lý")
- Form submits `{factoryName, phone, email, password, name}` to `/api/auth/register`
- `auth-provider.tsx` `signUp()` updated to pass `factoryName` and `phone`

### TrialBanner Component
- Named export `TrialBanner` (not default)
- Shows for non-PPAID subscriptions
- Four states with Vietnamese text:
  - `trial`: Yellow, "Bạn đang dùng thử IceFlow. Còn X ngày nữa." + "Nâng cấp ngay" link
  - `expired`: Red, "Dùng thử đã hết hạn. Tài khoản chỉ có thể đọc."
  - `cancelled`: Orange, "Tài khoản đã bị khóa do hết thời gian gia hạn."
  - `grace`: Orange, "Tài khoản đã hủy. Còn X ngày trong giai đoạn chờ (chỉ đọc)."
- Returns `null` for PAID subscriptions (banner hidden)

### TrialWarningModal Component
- Named export `TrialWarningModal`
- Shows only when `isWithinWarningPeriod(subscription)` is true (≤3 days remaining)
- Non-dismissible: no X button, no backdrop click close
- Buttons: "Nâng cấp ngay" (→ /settings/billing) and "Liên hệ hỗ trợ" (mailto)

### Middleware Subscription Enforcement
- Imports `getFactorySubscription`, `isSubscriptionActive`, `isGracePeriodExpired` from `@/lib/subscription-status`
- On non-GET `/api/*` requests with valid session:
  - If `CANCELLED` + grace period expired → 403 `ACCOUNT_LOCKED`
  - If not `isSubscriptionActive` → 403 `READ_ONLY`
  - Fails open on DB errors (doesn't block users during infra issues)
- GET requests never blocked (read-only access always allowed)

## Deviations from Plan

None — plan executed as written.

## Commits

- `e1a9ad8`: feat(06-01b): add registration field reordering, trial banner, warning modal, and middleware enforcement

## Next

Ready for Wave 3: plans 06-02 (billing dashboard + pricing) and 06-03 (cancel flow + Excel export) can proceed in parallel.