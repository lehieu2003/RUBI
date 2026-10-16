---
status: resolved
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

- hypothesis: the only refresh trigger is a 401 (auth_interceptor.onError). By then the 7-day JWT is expired, so getSession() returns null and /api/auth/refresh answers 401 -> forced logout. Nothing in mobile/lib calls /api/auth/refresh while the token is still valid.
- test: new repo/cubit/interceptor/app tests: (a) AuthRepository.refreshSession() exchanges a token older than 1 day and saves the new one, skips a fresh one, never clears on failure, never saves after logout; (b) AuthCubit.restore() calls it after Authenticated, a failed refresh keeps Authenticated, a late restore does not overwrite a login (FL-5); (c) app resume triggers it; (d) interceptor does not save a refreshed token after logout (FL-H2).
- expecting: RED, recorded below.
- next_action: none; resolved (tests and both gates green).

tdd_checkpoint:
  test_files:
    - mobile/test/features/auth/data/auth_repository_impl_test.dart (group refreshSession, 5 tests)
    - mobile/test/features/auth/presentation/cubit/auth_cubit_test.dart (restore: refresh / no refresh / refresh fails / late restore vs login; group "refreshSession (mở lại app)")
    - mobile/test/core/network/auth_interceptor_test.dart ("đăng xuất trong lúc đang refresh → không lưu token mới trở lại, không retry")
    - mobile/test/widget_test.dart ("mở lại app (resumed) → làm mới phiên")
  status: green
  failure_output: |
    auth_repository_impl_test.dart:605:32: Error: The method 'refreshSession' isn't defined for the type 'AuthRepositoryImpl'. (x5, file fails to load)
    auth_cubit_test.dart: loading ... failed (refreshSession not defined)
    auth_interceptor_test.dart "đăng xuất trong lúc đang refresh ...": Expected: throws <Instance of 'DioException'>; Actual: emitted Response {"success":true,"data":{"deliveries":[]}}  (token saved back + request retried after logout = FL-H2)
    widget_test.dart "mở lại app (resumed) → làm mới phiên": Expected: <1> Actual: <0>
    00:04 +39 -4: Some tests failed.

## Evidence

- timestamp: 2026-10-16
  checked: mobile/lib (only caller of /api/auth/refresh), auth_interceptor.dart onError, app.dart
  found: the only caller is AuthInterceptor._doRefreshToken, reached only from onError on a 401. restoreSession only calls GET /api/auth/me. app.dart calls authCubit.restore() once; no lifecycle hook.
  implication: refresh only happens after the token is already rejected.

- timestamp: 2026-10-16
  checked: src/app/api/auth/refresh/route.ts, src/lib/auth.ts
  found: signJWT sets iat and exp=7d; refresh calls getSession() -> verifyJWT() on the Bearer token; expired -> null -> 401. /api/auth/refresh is in the interceptor's _excludedPaths, so a 401 from it via the main Dio never forces a logout.
  implication: hypothesis confirmed: after day 7 the 401 path cannot recover. A proactive refresh through the main Dio is safe: a failure only surfaces as Err.

- timestamp: 2026-10-16
  checked: auth_interceptor.dart onError after _refreshToken()
  found: saveToken(newToken) runs unconditionally; if storage was cleared (logout) while the refresh was in flight the token is written back and the request retried (RED test).
  implication: FL-H2 confirmed, same code path, one guard.

- timestamp: 2026-10-16
  checked: auth_cubit.dart restore()
  found: emits unconditionally after await _repo.restoreSession(); a login that finished meanwhile is overwritten.
  implication: FL-5 is in the function being changed; guard with `state is! AuthUnknown`.

## Eliminated

## Resolution

- root_cause: the app only called POST /api/auth/refresh from AuthInterceptor.onError after a 401. The server only exchanges a still-valid JWT (getSession -> verifyJWT; token exp 7d), so by the time the app tried, the token was expired, refresh returned 401 and the interceptor forced a logout: every session hard-expired 7 days after login.
- fix: AuthApi.refresh() + AuthRepository.refreshSession(): when the stored token's JWT `iat` is more than 1 day old (or unreadable), POST /api/auth/refresh through the main Dio and save the new token, unless storage changed meanwhile (logout/new login). Never clears the token on failure (the refresh path is excluded from the interceptor's 401 logout). AuthCubit.refreshSession() (only when Authenticated, failure just logged) is called after a successful restore() and from app.dart on AppLifecycleState.resumed (useOnAppLifecycleStateChange). The 401 path is unchanged. Also: FL-H2, the interceptor skips the save + retry when storage was cleared while its refresh was in flight; FL-5, restore() only applies its result while state is still AuthUnknown.
- left out: FL-H2 corner where the user logs out AND logs in as someone else during a single in-flight 401 refresh (interceptor checks only for a null token; the proactive repo path does compare the exact token). A device left in the background for more than 7 days still has to log in again (by design of the server: no refresh-token table).
- verification: TDD. RED: 4 failing (repo/cubit files did not compile, FL-H2 test got a Response instead of DioException, resume test 0 != 1); FL-5 test confirmed RED separately after the refresh code landed (Expected Authenticated(staff), Actual Unauthenticated). GREEN: `flutter analyze` -> "No issues found! (ran in 2.2s)"; `flutter test` -> "00:18 +675: All tests passed!".
- files_changed:
  - mobile/lib/features/auth/data/auth_api.dart
  - mobile/lib/features/auth/domain/repositories/auth_repository.dart
  - mobile/lib/features/auth/data/auth_repository_impl.dart
  - mobile/lib/features/auth/presentation/cubit/auth_cubit.dart
  - mobile/lib/app.dart
  - mobile/lib/core/network/auth_interceptor.dart
  - mobile/test/features/auth/data/auth_repository_impl_test.dart
  - mobile/test/features/auth/presentation/cubit/auth_cubit_test.dart
  - mobile/test/core/network/auth_interceptor_test.dart
  - mobile/test/widget_test.dart
  - mobile/test/core/router/app_router_test.dart (default refreshSession stub)
