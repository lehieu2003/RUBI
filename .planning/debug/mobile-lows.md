---
status: investigating
trigger: "Flutter low findings from the 2026-10-15 audit (FL-4, FL-7, FL-9) and the PR #96 follow-up (expectedStatus on the office status change)"
created: 2026-10-16
updated: 2026-10-16
branch: fix/mobile-lows
---

# Debug: mobile-lows

Scope: Flutter app only (`mobile/`). No server change.

Evidence sources:
- `.planning/audits/2026-10-15-user-behavior-ui-logic-audit.md`
- `.planning/audits/2026-10-15-raw/04-flutter-auditor.md`

## Symptoms

1. **FL-4 — dead token on cold start shows an error.** `GET /api/auth/me`
   answers 200 `{ user: null }` for an expired or locked session (never 401,
   see `api/openapi/auth.yaml`). `AuthRepositoryImpl.restoreSession` treats
   `user == null` as an `UnexpectedFailure`, so every cold start with a dead
   token shows "Có lỗi xảy ra. Vui lòng thử lại." and the dead token stays in
   secure storage. Expected: clear the token, `Ok(null)`, plain login screen.
2. **FL-7 — Today tab refresh reverts a confirmed delivery.** A refresh started
   on app resume (`today_tab.dart`) can finish after a just-confirmed delivery
   and put it back to "Đang giao"; the refresh emit also drops
   `confirmingOrderId` (`today_orders_cubit.dart`). Expected: results of a
   refresh older than the confirm are dropped; `confirmingOrderId` survives a
   refresh.
3. **FL-9 — logout waits for the network.** `AuthRepositoryImpl.logout` awaits
   the server call before clearing the token; with no network the user waits up
   to the 15 s timeout. Expected: clear the token first, send the server logout
   without awaiting (it only clears a cookie; no-op for Bearer clients).
4. **PR #96 follow-up — office status change does not send `expectedStatus`.**
   `PATCH /api/orders/{id}/status` accepts optional `expectedStatus` (409
   `ORDER_STATUS_CHANGED` when the order moved on). The web sends it; the
   Flutter office orders screen does not. Expected: send the status the screen
   shows (PENDING/SHIPPING/DELIVERED only), and on 409 `ORDER_STATUS_CHANGED`
   reload the list and show the server message.

## Current Focus

hypothesis: four independent defects, worked one at a time (test commit + fix commit each)
next_action: FL-4

## Eliminated

## Evidence

## Resolution

root_cause:
fix:
verification:
files_changed: []
