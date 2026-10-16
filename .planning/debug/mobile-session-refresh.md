---
status: investigating
trigger: "Audit finding #13 / FL-3 in .planning/audits/2026-10-15-user-behavior-ui-logic-audit.md: mobile sessions hard-expire 7 days after login; the refresh can never succeed. Fix in the Flutter app with a proactive refresh, with regression tests. No server change."
created: 2026-10-16
updated: 2026-10-16
branch: fix/mobile-session-refresh
---

# Debug Session: Mobile Session Refresh

## Symptoms

Source: audit finding #13 / FL-3 (`.planning/audits/2026-10-15-user-behavior-ui-logic-audit.md`). Not reproduced at runtime yet.

- **Expected:** An active user's session slides forward; they are not logged out mid-work.
- **Actual (from code reading):**
  - `mobile/lib/core/network/auth_interceptor.dart:68-90`, `:130-140` only refreshes after a 401, sending the same (already expired) token.
  - `src/app/api/auth/refresh/route.ts:6-8` exchanges a still-valid Bearer token for a fresh 7-day JWT; `:19-23` returns 401 when `getSession()` fails, which includes an expired JWT (`src/lib/auth.ts:31`, `:35-41`).
  - No proactive refresh anywhere in `mobile/lib`.
- **Result:** on day 7 the next request gets 401 -> refresh 401 -> forced logout, losing in-progress work (e.g. an order being entered).
- **Suggested fix (verify first):** call `POST /api/auth/refresh` proactively after a successful `restore()` at app start and on app resume when the token is older than about a day (decode the JWT iat/exp locally, or track when it was saved); store the new token; keep the 401 path as is.
- **Related (only if same code path and trivial):** FL-H2 (a refresh finishing after logout must not save the token back, `auth_interceptor.dart:~90`); FL-5 (late `restore()` overwriting a fresh login, `auth_cubit.dart:82-91`).

## Constraints

- Flutter app only (`mobile/`). No server change.
- TDD: failing tests first (auth cubit / interceptor / repository tests with http_mock_adapter + mocktail), then fix.
- No Docker, no ports 3000/3100/55433, no server. Never touch the Supabase DB in `.env`.
- Gate: `flutter analyze`, `flutter test` from `mobile/`.
- Conventional Commits, scope `mobile`, one logical change each.

## Current Focus

- hypothesis: the only refresh trigger is a 401, at which point the token is already expired and the server refuses to refresh it.
- test: (to be written)
- expecting: (to be written)
- next_action: read auth_interceptor.dart, auth_cubit.dart, auth repository and app lifecycle wiring; write failing tests.

tdd_checkpoint:

## Evidence

## Eliminated

## Resolution

- root_cause:
- fix:
- verification:
- files_changed:
