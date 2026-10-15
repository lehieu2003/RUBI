# Orchestrator merge notes (input for audit-reviewer)

Reports: 01-ui-logic-auditor.md, 02-race-condition-auditor.md, 03-api-flow-auditor.md, 04-flutter-auditor.md (same folder).
Totals: UI 8 + 1H; RACE 11 + 3H; API 8 + 3H; FL 9 + 2H = 36 findings + 9 hypotheses, before dedup.

## Proposed duplicate groups (same root cause)
- D1 Order drawer price-load state: UI-1 ≡ RACE-9 (wiped quantities part). RACE-9 also has a distinct sub-issue (out-of-order prices for A/B). UI-H1 (state survives close) is the same code area and possibly same fix. Severity conflict: UI-1 High vs RACE-9 Medium.
- D2 Non-idempotent writes after a lost response: RACE-4 ≡ FL-1 (server root cause + mobile trigger). Conflict: RACE-4 includes order create; FL-1 says mobile order entry already shows an "unsure" message (order_entry_cubit.dart:207-210) → order-create part may be mitigated on mobile; web drawer guarded by isSaving. Verify whether order create retry is still realistic.
- D3 Dashboard revenue counts cancelled: UI-4 ≡ API-2 (API-2 adds the ordered-vs-delivered amount aspect, linked to API-3).
- D4 Payment "Thu đủ" with decimal balance: API-5 root (decimal prices) + its handoff (payment-dialogs.tsx:54,117).

## Related flow groups (different root causes, same user flow)
- F1 Order lifecycle / settlement integrity: RACE-1, RACE-2, RACE-3, API-3, API-6, API-8, UI-7, API-H3. Shared root theme for RACE-1/2/3: status writes without a conditional predicate.
- F2 Stock accuracy: API-1 (count vs open orders), RACE-8 (first movement of day), RACE-4/FL-1 (stock ADD duplicate), RACE-10 (stale history), RACE-11 (duplicate products).
- F3 Debt & payment accuracy: API-4 (Decimal(10,2) overflow), API-5, FL-6, RACE-H1, UI-5, UI-6, API-H1.
- F4 Driver delivery: FL-2, FL-7, RACE-H3, UI-2, FL-H1, RACE-5.
- F5 Mobile session/auth: FL-3, FL-4, FL-5, FL-8, FL-9, FL-H1, FL-H2.
- F6 Schedule/payroll: RACE-6, RACE-7.

## Conflicts / points needing independent verification
1. RACE-1 depends on Postgres READ COMMITTED re-evaluating the UPDATE's WHERE (id only) after the first tx commits. Verify no isolationLevel/locking at reconcile/route.ts:~112 and no unique ledger↔order key in schema.
2. RACE-4 order-create part vs FL-1 statement that mobile order entry handles timeouts.
3. API-4: does a Decimal(10,2) overflow actually surface as 500? Check payments route catch block and contract max.
4. FL-3: confirm the refresh route rejects expired tokens and that no proactive refresh exists in mobile/lib.
5. FL handoff (unreported by api-flow): /api/reports/debt uses getSession and may bypass mustChangePassword — verify src/app/api/reports/debt/route.ts:9-18 vs src/lib/auth/helpers.ts:15-16. Note api-flow-auditor said authorization "held".
6. UI-8 says STAFF sees add-customer button; api-flow says customers POST is ADMIN only (consistent) — just verify UI gating.
7. API-1 business rule is inferred (stock leaves books at settlement). Verify comments at src/lib/actions/orders.ts:76-78 and src/lib/inventory.ts:55-58.
8. FL-2: verify server can actually store empty phone (customers/route.ts:57) and mapper rejects it.
9. Severities to sanity-check: FL-1 Critical, RACE-4 Critical, RACE-2 Critical, UI-1 High.
