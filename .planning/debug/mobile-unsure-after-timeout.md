---
status: resolved
trigger: "H2 (short-term part) from .planning/audits/2026-10-15-user-behavior-ui-logic-audit.md: on mobile, a payment (Thu tiền), shell 'Ghi thêm' and production batch 'Nhập mẻ' can be recorded twice after a lost response. A receive timeout is shown as a plain network error and the sheet re-enables submit, inviting a retry of a write the server may already have committed. Fix in the Flutter app the way order entry already does (show an 'unsure' message, close the sheet, reload from the server), with regression tests. The server-side idempotency key is out of scope (needs a migration; separate task)."
created: 2026-10-15
updated: 2026-10-15
branch: fix/mobile-unsure-after-timeout
---

# Debug Session: Mobile Unsure After Timeout

## Symptoms

Source: audit-reviewer-verified finding H2 (raw: `.planning/audits/2026-10-15-raw/04-flutter-auditor.md` FL-1 and `02-race-condition-auditor.md` RACE-4). Not reproduced at runtime yet.

- **Expected:** When a write's outcome is unknown (the request may have reached the server but no response came back — e.g. receive timeout), the app must not invite a plain retry. It tells the user the save may already have gone through, closes the sheet and reloads the data from the server so the user can see whether it was recorded — as order entry does (`mobile/lib/features/orders/presentation/cubit/order_entry_cubit.dart:207-210`, `AppStrings.orderEntryUnsure` at `mobile/lib/core/localization/strings.dart:423-424`).
- **Actual (from code reading):**
  - `mobile/lib/core/network/api_error_decoder.dart:16-21`: `DioExceptionType.receiveTimeout` (and similar) → `NetworkFailure` ("Không có kết nối. Vui lòng thử lại.").
  - Payment sheet: `mobile/lib/features/debt/presentation/screens/customer_ledger_screen.dart:226-228` (`submitting.value = false; error.value = result.message;`), cubit `mobile/lib/features/debt/presentation/cubit/ledger_cubit.dart:155-156`.
  - Shells "Ghi thêm": `mobile/lib/features/shells/presentation/shells_screen.dart:177-179`.
  - Inventory "Nhập mẻ": `mobile/lib/features/inventory/presentation/screens/inventory_tab.dart:339-341`.
  - Server writes are additive and not idempotent: `src/app/api/customers/[id]/payments/route.ts:51-53`, `src/app/api/deposits/shells/route.ts:97-100` (`increment`), `src/app/api/inventory/route.ts:93-94`.
- **Error messages:** "Không có kết nối. Vui lòng thử lại." with the submit button re-enabled.
- **Reproduction:** Manager → Công nợ → customer → Thu tiền 100.000; delay the 201 past the 15 s receive timeout (`mobile/lib/core/constants/api_constants.dart:14`); the sheet says to retry; tap again → two PAYMENT rows. Same for Vỏ bao "Ghi thêm" and Kho lạnh "Nhập mẻ".

## Constraints

- Flutter app only (`mobile/`). No server or schema change in this task.
- Distinguish "request certainly not sent" (e.g. connection refused / connect timeout / no network before send) from "outcome unknown" (receive timeout, connection dropped after send). Only the unknown case should get the "unsure" treatment; a certain failure may still offer a retry. Check how order entry makes this distinction and reuse it rather than inventing a new one.
- Keep it surgical; reuse existing strings/patterns where possible; any new user-facing string goes in `mobile/lib/core/localization/strings.dart` in Vietnamese, matching the tone of `orderEntryUnsure`.
- Gate: Mobile Quality Gate = `flutter analyze` and `flutter test` (from `mobile/`). Never touch the Supabase DB in the repo's `.env`.
- Conventional Commits, scope `mobile`, one logical change each.

## Current Focus

- hypothesis: mapDioError folds receiveTimeout (outcome unknown) into the same `NetworkFailure` as connect failures (certain), and the payment / shells / inventory cubits turn every failure into `(ok: false, failureMessage)`, so the sheets stay open with submit re-enabled and the generic network copy.
- test: widget tests where the mocked repo returns `Err(mapDioError(DioException(type: receiveTimeout)))` (exactly what `guardApi` returns); expect unsure copy, sheet closed, reload, single POST.
- expecting: RED before fix (sheet stays open, `FailureMessages.network` shown, no reload).
- next_action: none — fixed and verified by tests; needs a manual check on a device (delay the 201 past 15 s).

tdd_checkpoint:
  test_file: "mobile/test/features/debt/presentation/screens/debt_screens_test.dart, mobile/test/features/shells/shells_test.dart, mobile/test/features/inventory/presentation/screens/inventory_tab_test.dart"
  test_name: "mất response (receive timeout) → báo chưa chắc đã lưu, đóng sheet/hộp, tải lại; không gửi lần hai (x3)"
  status: "green"
  failure_output: |
    flutter test (3 files): +34 -3: Some tests failed.
    Each of the 3 receive-timeout tests: Expected: exactly one matching candidate
      Actual: _TextContainingWidgetFinder:<Found 0 widgets with text containing Mất kết nối khi đang ...
    The companion tests (connection refused → sheet stays open and resubmits; 400 → server message, correct and resubmit) pass before the fix.

reasoning_checkpoint:
  hypothesis: "Because mapDioError returns the same NetworkFailure for receiveTimeout as for a refused connection, and the three cubits map every Err to (ok:false, failureMessage), the sheets stay open with submit re-enabled after a write whose outcome is unknown."
  confirming_evidence:
    - "RED tests: with Err(mapDioError(receiveTimeout)) the payment sheet, shells dialog and production sheet stay open and show no unsure message."
    - "Code: ledger_cubit recordPayment / shells_cubit _after / inventory_cubit _record return (ok:false, failureMessage(failure)); sheets set busy=false on !ok."
  falsification_test: "If the tests still fail after cubits return an unsure result for outcome-unknown NetworkFailures and sheets close on it, the hypothesis is wrong."
  fix_rationale: "Mark outcome-unknown network failures at the single decode point; the write cubits turn that into an 'unsure' result that reloads server data, and the sheets close on it so there is no retry button for a write that may already be committed."
  blind_spots: "Ledger header 'Còn nợ' is not refreshed by load() (getLedger has no outstanding); the reloaded list will show the PAYMENT row but the header stays at the pre-payment figure until the user goes back. Server-side idempotency still absent (separate task)."

## Evidence

- timestamp: 2026-10-15
  checked: order_entry_cubit.dart:198-214
  found: order entry maps ANY `NetworkFailure` to `AppStrings.orderEntryUnsure`; there is no distinct "outcome unknown" failure type — the decoder maps connectionError/connectionTimeout/sendTimeout/receiveTimeout/transformTimeout all to `const NetworkFailure()`.
  implication: need a minimal flag on `NetworkFailure` to separate certain (never sent) from unknown (may have been committed).
- timestamp: 2026-10-15
  checked: dio 5.11.1 io_adapter.dart:113-187
  found: connectionTimeout and connectionError(SocketException) are thrown while opening the connection (request not sent). sendTimeout aborts mid-body; receiveTimeout fires after the request was sent; connectionError is ALSO thrown for HttpException "Connection closed before full header was received" (after send).
  implication: unknown = sendTimeout, receiveTimeout, transformTimeout, connectionError whose cause is not a SocketException; certain = connectionTimeout, connectionError(SocketException).
- timestamp: 2026-10-15
  checked: ledger_cubit.dart recordPayment, shells_cubit.dart _after, inventory_cubit.dart _record and the three sheets
  found: on Err the cubit returns `(ok: false, message: failureMessage(failure))`; each sheet sets busy=false and shows the message, leaving submit enabled. No reload on failure.
  implication: confirmed code path for the symptom.

- timestamp: 2026-10-15
  checked: existing tests after a first decoder draft that treated every non-SocketException connectionError as unknown
  found: 5 existing repository tests (schedule, auth) build connectionError with no cause or a String cause and expect `const NetworkFailure()`.
  implication: narrowed the unknown case to the one Dio documents (HttpException after send); other connectionErrors stay certain, so other callers keep their behaviour.
- timestamp: 2026-10-15
  checked: flutter analyze, flutter test (mobile/)
  found: "No issues found!"; "+647: All tests passed!" — the 3 receive-timeout tests now pass, plus 6 new decoder cases.
  implication: green.

## Eliminated

## Resolution

- root_cause: `mapDioError` returned the same `const NetworkFailure()` for a receive timeout (request sent, outcome unknown) as for a refused connection (certain), and the payment (`LedgerCubit.recordPayment`), shells (`ShellsCubit._after`) and inventory (`InventoryCubit._record`) cubits mapped every failure to `(ok: false, failureMessage)`; the sheets then re-enabled submit with "Không có kết nối. Vui lòng thử lại.", inviting a second non-idempotent POST.
- fix: `NetworkFailure` gains `outcomeUnknown` (default false). The decoder sets it for sendTimeout / receiveTimeout / transformTimeout and for connectionError caused by an HttpException (connection closed after send); connectTimeout and socket errors stay certain; `failureMessage` is unchanged, so other callers behave as before. The three cubits, on an outcome-unknown failure, reload from the server and return `(ok: false, unsure: true, message: <feature>Unsure)`; the sheets/dialog close on `ok || unsure`, so the user sees the warning in a snackbar and the reloaded data, with no submit button left. New strings `paymentUnsure`, `shellsUnsure`, `stockUnsure` follow `orderEntryUnsure`. Shells "Sửa tổng" and "Kiểm kho" share the same helper and get the same treatment (harmless: they are absolute writes).
- verification: 3 RED → GREEN widget tests (receive timeout: unsure copy, sheet closed, reload called once, POST called once); companion tests: connection refused keeps the payment sheet open and resubmits; 400 in all three shows the server message and allows correction + resubmit; decoder unit tests for each Dio type. `flutter analyze`: No issues found. `flutter test`: +647 All tests passed.
- files_changed: [mobile/lib/core/network/api_failure.dart, mobile/lib/core/network/api_error_decoder.dart, mobile/lib/core/localization/strings.dart, mobile/lib/features/debt/presentation/cubit/ledger_cubit.dart, mobile/lib/features/debt/presentation/screens/customer_ledger_screen.dart, mobile/lib/features/shells/presentation/shells_cubit.dart, mobile/lib/features/shells/presentation/shells_screen.dart, mobile/lib/features/inventory/presentation/cubit/inventory_cubit.dart, mobile/lib/features/inventory/presentation/screens/inventory_tab.dart, tests]
- known_limits: ledger header "Còn nợ" is not refreshed by `load()` (the ledger endpoint carries no outstanding), so after an unsure payment the user checks the reloaded rows (the copy says "Xem lại sổ nợ bên dưới"); the server-side guard (409 when paying more than owed) still applies. Order entry still treats every NetworkFailure as unsure (unchanged on purpose). Server idempotency key remains a separate task.
