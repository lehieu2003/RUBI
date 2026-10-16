---
status: resolved
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

hypothesis: all four confirmed and fixed
next_action: none (PR into dev by the orchestrator)

## Eliminated

- Item 4 "reload on 409": already in place. `OrdersCubit.changeStatus` reloads
  the list on every result and `failureMessage(ServerFailure)` shows the server
  text, so only sending `expectedStatus` was missing.

## Evidence

- timestamp: 2026-10-16 FL-4 — `api/openapi/auth.yaml` `/api/auth/me`: "Never
  answers 401: an anonymous caller gets `{ user: null }`". `restoreSession`
  returned `Err(UnexpectedFailure('Me response missing data.user'))` for that
  case; the repo tests mocked a 401 instead. With the real contract mocked,
  2 tests RED.
- timestamp: 2026-10-16 FL-9 — `logout()` did `await _api.logout()` before
  `_storage.clear()`. A test with a request that never returns timed out
  (RED).
- timestamp: 2026-10-16 FL-7 — `TodayOrdersCubit.refresh` had no staleness
  guard and emitted a fresh state without `confirmingOrderId`. Three tests
  (refresh started before confirm, refresh started during confirm, refresh
  finishing during confirm) RED.
- timestamp: 2026-10-16 Item 4 — `OrdersRepositoryImpl.changeStatus` body had
  only `status` / `cancellationReason`. Tests for `expectedStatus` RED (no such
  parameter).

## Resolution

root_cause: |
  FL-4: restoreSession treated the contract's `{ user: null }` (dead session) as
  a malformed payload. FL-9: logout awaited the server call before clearing the
  token. FL-7: TodayOrdersCubit.refresh results were applied regardless of a
  confirm that happened after the refresh started, and the emit dropped
  confirmingOrderId. Item 4: the Flutter status change never sent
  `expectedStatus`, so the server's 409 ORDER_STATUS_CHANGED guard never ran.
fix: |
  FL-4: `user == null` (and a 401, kept as a fallback) clear the token
  best-effort and return Ok(null). FL-9: server logout is sent unawaited with
  errors swallowed; the token is cleared at once. FL-7: generation counter
  bumped by load/refresh and by confirm at start and on success; stale refresh
  results are dropped; refresh keeps confirmingOrderId. Item 4: repository takes
  `expectedStatus` and sends it when PENDING/SHIPPING/DELIVERED; the cubit
  passes the order's shown status.
verification: "flutter analyze: No issues found. flutter test: +683 All tests passed."
files_changed:
  - mobile/lib/features/auth/data/auth_repository_impl.dart
  - mobile/lib/features/driver/presentation/cubit/today_orders_cubit.dart
  - mobile/lib/features/orders/domain/repositories/orders_repository.dart
  - mobile/lib/features/orders/data/orders_repository_impl.dart
  - mobile/lib/features/orders/presentation/cubit/orders_cubit.dart
  - mobile/test/features/auth/data/auth_repository_impl_test.dart
  - mobile/test/features/driver/presentation/cubit/today_orders_cubit_test.dart
  - mobile/test/features/orders/data/orders_repository_impl_test.dart
  - mobile/test/features/orders/presentation/orders_cubit_test.dart
  - mobile/test/features/orders/presentation/orders_tab_test.dart
