---
status: awaiting_human_verify
trigger: "#7 from .planning/audits/2026-10-15-user-behavior-ui-logic-audit.md (FL-6): the mobile customer ledger never re-reads the outstanding balance ('Còn nợ'), so it goes stale after pull-to-refresh, after an unsure payment, or after debt is booked elsewhere; the stale value also caps the payment sheet. After recording a payment, 'Xem thêm' shows the previous page's last row twice. Fix with regression tests."
created: 2026-10-15
updated: 2026-10-15
branch: fix/mobile-ledger-balance
---

# Debug Session: Mobile Ledger Balance

## Symptoms

Source: audit-reviewer-verified finding #7 (raw: `.planning/audits/2026-10-15-raw/04-flutter-auditor.md` FL-6). Partly observed on the emulator on 2026-10-15 while verifying PR #98: after two payments (100.000 + 50.000) on Minh Tâm, the reloaded ledger showed both PAYMENT rows but the header still read "Còn nợ 3.400.000đ" while the server had 3.250.000đ.

- **Expected:**
  - "Còn nợ" always matches the server after any load: opening the screen, pull-to-refresh, the reload after an unsure payment.
  - The payment sheet's cap ("Số tiền thu không được vượt số đang nợ") uses that fresh value.
  - Paging ("Xem thêm") after a local payment never repeats or skips a row.
- **Actual (from code reading):**
  - `mobile/lib/features/debt/presentation/cubit/ledger_cubit.dart:87` — `load()` keeps `outstandingDebt: state.outstandingDebt`; the balance only comes from the debt list passed in when the screen opens, and from a successful payment receipt.
  - `ledger_cubit.dart:142` — a successful payment prepends `value.entry` without moving the paging offset, while `src/app/api/customers/[id]/ledger/route.ts:33-36` pages by offset, newest first → the next page starts one row too early (duplicate row, shared `Key('ledger_entry_<id>')`).
  - Cap: `mobile/lib/features/debt/presentation/screens/customer_ledger_screen.dart:215`.
- **Error messages:** none.
- **Reproduction:** (a) open a customer ledger, settle one of their orders on the web, pull to refresh → new DEBT row, header unchanged. (b) ledger with > 20 entries, record a payment, tap "Xem thêm" → the old 20th entry appears twice.

## Constraints

- Prefer the smallest correct source for the balance. Options to weigh (pick one, record why):
  1. The ledger endpoint also returns the customer's outstanding balance (additive, backward-compatible field) — needs `src/app/api/customers/[id]/ledger/route.ts`, `src/lib/contracts/customers.ts`, regenerated `api/openapi/*.yaml` (`npm run contract:docs`), and `npm run contract:verify`; both web Quality Gate and Mobile Quality Gate then run.
  2. The mobile app re-reads the balance from an endpoint that already provides it (e.g. the debt report), without a server change.
  The balance must use the same rule as the debt report and payment check (DEBT − PAYMENT per customer; `src/app/api/reports/debt/route.ts:27-42`, `src/app/api/customers/[id]/payments/route.ts:39-46`).
- For the duplicate row: shift the paging offset after a local insert, de-duplicate by id when appending, or reload page 1 — pick the simplest that is correct.
- Any server change: regression tests may only use a throwaway local Postgres (mirror `e2e/support/env.ts:5-20`); never the Supabase DB in `.env`. No schema change expected; if one is needed, Prisma Migrate only.
- Gates: Mobile (`flutter analyze`, `flutter test` from `mobile/`); if `src/` changes, also web (`npm run lint`, `npm run typecheck`, `npm test`, `npm run build`).
- Conventional Commits, one logical change each.

## Current Focus

reasoning_checkpoint:
  hypothesis: "LedgerCubit.load() copies state.outstandingDebt instead of reading it from the server, so every reload (open, pull-to-refresh, the reload after an unsure payment) keeps the value passed in from the debt list; recordPayment() prepends the new entry without moving the server offset, so the next offset page starts one row early and repeats the old last row."
  confirming_evidence:
    - "ledger_cubit.dart load(): both the loaded and error branches emit outstandingDebt: state.outstandingDebt; nothing in the cubit reads a balance except PaymentReceipt."
    - "ledger route pages with skip/take on createdAt desc; after one local insert, page 2 (skip 20) returns the row that was 20th before the insert."
    - "RED: 5 new cubit tests + 1 widget test fail with exactly these values (3400000 kept; 22 unique of 23 ids)."
  falsification_test: "If after the fix load() reads the debt report and the paging append drops known ids, the 6 RED tests must go green; if any still fails the hypothesis is incomplete."
  fix_rationale: "Reading the balance on every load removes the only stale source; de-duplicating by id when appending absorbs any forward shift of the offset (local insert or entries booked elsewhere), which is the only way the newest-first, append-only ledger can move."
  blind_spots: "Two separate requests (ledger page + debt report) are not one snapshot; an entry booked between them can make the header briefly disagree with the rows until the next refresh. Not tested on the emulator in this run."

tdd_checkpoint:
  test_file: "mobile/test/features/debt/presentation/cubit/debt_cubits_test.dart, mobile/test/features/debt/presentation/screens/debt_screens_test.dart"
  status: "green"

decision_balance_source: "Option 2 (re-read the balance from GET /api/reports/debt). It is the exact rule the payment check uses (DEBT - PAYMENT per customer), it needs no server or contract change (mobile-only, one quality gate), and the repository already has getDebts(). A customer missing from the report (balance <= 0 is filtered out) is read as 0, which is also what the server cap allows. Cost: the report covers every customer of one factory (tens to a few hundred rows) - acceptable at this scale; option 1 can replace it later without touching the screen."
decision_paging: "De-duplicate by id when appending a page. The ledger is append-only and newest-first, so offsets can only shift forward (rows repeat, never skip); dropping already-shown ids is enough and keeps pages the user already loaded, unlike reloading page 1."

## Evidence

- timestamp: 2026-10-15
  checked: mobile/lib/features/debt/presentation/cubit/ledger_cubit.dart load()/recordPayment()
  found: load() emits outstandingDebt: state.outstandingDebt in all branches; recordPayment() prepends value.entry and keeps nextPage unchanged.
  implication: balance only changes on a successful receipt; offset paging repeats a row after a local insert.

- timestamp: 2026-10-15
  checked: src/app/api/reports/debt/route.ts, src/app/api/customers/[id]/payments/route.ts
  found: both compute DEBT - PAYMENT per customer; the report drops customers with balance <= 0; mobile DebtRepository.getDebts() already reads it.
  implication: the report is a ready, same-rule balance source; absent customer = 0.

- timestamp: 2026-10-15
  checked: TDD RED run, `flutter test test/features/debt` (before fix)
  found: |
    6 failing, 32 passing:
    - LedgerCubit load → số còn nợ đọc lại từ server, không giữ số lúc mở: Expected <3250000> Actual <3400000.0>
    - LedgerCubit load lại (kéo để làm mới) → số còn nợ mới, kể cả khi đã hết nợ: Expected <3660000> Actual <3400000.0>
    - LedgerCubit không đọc được số nợ → lỗi, không coi số cũ là mới: Expected ViewStatus.error Actual ViewStatus.loaded
    - LedgerCubit thu tiền mất response → tải lại sổ và cả số còn nợ: Expected <3250000> Actual <3400000.0>
    - LedgerCubit thu tiền rồi Xem thêm → không lặp dòng, không sót dòng: Expected set length <23> Actual 22 (l-2 twice)
    - sổ nợ của một khách kéo để làm mới → "Còn nợ" theo server; sheet thu tiền chặn theo số mới: Expected '3.250.000đ' Actual '3.400.000đ'
  implication: both defects reproduced by tests.

- timestamp: 2026-10-15
  checked: TDD GREEN run after the fix, `flutter test test/features/debt`
  found: "00:01 +38: All tests passed!"
  implication: both defects fixed at cubit level and screen level.

- timestamp: 2026-10-15
  checked: grep for customerDebtLedger delete/update in src/ and onDelete in prisma/schema.prisma
  found: no deletes or updates of ledger rows; no cascade onto CustomerDebtLedger.
  implication: ledger is append-only, offsets only shift forward, so de-duplicating by id cannot leave a gap.

## Eliminated

## Resolution

- root_cause: LedgerCubit.load() copied state.outstandingDebt in every branch, so the balance came only from the debt list passed in when the screen opened (and from a successful payment receipt); pull-to-refresh, the reload after an unsure payment and the payment sheet cap all used that stale value. Separately, recordPayment() prepends the new entry while the server pages by offset newest-first, so the next page started one row early and repeated the previous page's last row.
- fix: load() fetches the first ledger page and the debt report (GET /api/reports/debt, same DEBT - PAYMENT rule as the payment check) in parallel and sets outstandingDebt from the report (customer absent = 0); if either fails the state goes to error and keeps the previous entries and balance. loadMore() drops entries whose id is already shown. No server change (option 2).
- verification: TDD RED (6 tests) then GREEN; `flutter analyze` - No issues found; `flutter test` - 653 passed. Not re-checked on the emulator in this run.
- files_changed: [mobile/lib/features/debt/presentation/cubit/ledger_cubit.dart, mobile/test/features/debt/presentation/cubit/debt_cubits_test.dart, mobile/test/features/debt/presentation/screens/debt_screens_test.dart]
