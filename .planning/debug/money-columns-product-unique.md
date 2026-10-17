---
status: resolved
trigger: "#15 / API-4: every money column is Decimal(10,2) while the payments contract allows up to 10,000,000,000, so a 120,000,000đ payment passes validation and fails with a generic 500. RACE-11: product uniqueness (factory + name + sizeKg) is only checked in application code, so two concurrent creates can both succeed."
created: 2026-10-17
updated: 2026-10-17
branch: fix/money-columns-product-unique
---

# Debug Session: Money Columns Width + Product Uniqueness

## Symptoms

### Item 1 — #15 / API-4: money columns too narrow

- **Expected:** Any amount the contract accepts is stored exactly (e.g. a 120,000,000đ payment on enough debt → 201, ledger row stores 120000000.00).
- **Actual:** All money columns are `Decimal(10,2)` (max 99,999,999.99): `customer_debt_ledger.amount`, `customer_price_overrides.price_per_unit`, `customer_shell_deposits.deposit_per_shell`, `global_prices.price_per_unit`, `order_items.line_total`, `order_items.unit_price`, `orders.total`. `src/lib/contracts/customers.ts` allows payments up to 10,000,000,000, so a large payment (or a large order) passes Zod validation and then fails in Postgres with numeric overflow → generic 500.
- **Fix direction:** widen all seven to `Decimal(14,2)` (max 999,999,999,999.99) in `prisma/schema.prisma` with a Prisma migration; make sure every contract limit stays within the new range.

### Item 2 — RACE-11: product uniqueness only in app code

- **Expected:** Two concurrent `POST /api/products` with the same name + sizeKg in one factory → exactly one 201 and one 409 (the same 409 the route already returns for a duplicate).
- **Actual:** `src/app/api/products/route.ts` checks for a duplicate with a read before the insert; no DB constraint, so two concurrent creates can both pass the check and both insert. The order grid then makes one of them unreachable.
- **Fix direction:** `@@unique([factoryId, name, sizeKg])` in Prisma with a migration; map P2002 to the existing duplicate 409. Keep the existing app-level check (it may be case-insensitive; the DB constraint is the exact-match backstop) and record that decision here.

## Production facts (checked read-only by the orchestrator on 2026-10-17)

- 8 products, no duplicates on (factory_id, lower(name), sizeKg).
- Largest money value 3,400,000.00 (customer_debt_ledger.amount).
- So both migrations are safe on production data. Applying them to production is NOT part of this task.

## Database safety (hard rules)

- `.env` `DATABASE_URL` / `DIRECT_URL` are **production** Supabase; Prisma CLI loads `.env` automatically.
- For EVERY prisma migrate/seed command and DB-backed test: start a throwaway Docker Postgres and export BOTH `DATABASE_URL` and `DIRECT_URL` to it in the same command; print the host and abort if it is not localhost.
- Create migrations only with `prisma migrate dev --name <name>` (or `--create-only`, then review) against that DB; never `prisma db push`. Match the folder naming in `prisma/migrations/` (`YYYYMMDDHHMMSS_snake_name`).
- If Docker is unavailable, stop and return a checkpoint.

## Work plan (TDD)

1. Failing e2e tests first via `scripts/e2e-local.sh`: (a) 120,000,000đ payment on enough seeded debt → 201 and stored exactly; (b) two concurrent product creates with the same name+size → one 201 and one 409 (deterministic lock-wait technique of `e2e/support/db.ts lockWaiters()` or a `Promise.all` loop). Use `openPage()` from `e2e/support/app.ts` if a spec opens a page. Commit: `test(e2e): ...`.
2. Schema + migration(s): `feat(db): ...`.
3. Route fix (P2002 → 409): `fix(api): ...`.
- Each commit ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Do not commit `.codegraph/` or `graph.dot`. Do not push, do not open a PR, do not switch branches.

## Gates

`npm run lint`, `npm run typecheck`, `npm test`, `npm run build` (both URLs pointed at a local throwaway DB; if webpack crashes with "reading 'hash'", delete `.next` and retry), the new specs + FULL e2e suite (report counts), `npm run contract:docs` + `npm run contract:verify` on a LOCAL server if contracts change. Mobile gates only if `mobile/` changes (it should not). Report real outputs only.

## Current Focus

hypothesis: (1) Postgres numeric(10,2) overflow on amounts >= 100,000,000; (2) check-then-insert race with no DB unique constraint.
next_action: none — resolved. (was: commit specs; widen money columns to Decimal(14,2) + @@unique([factoryId, name, sizeKg]) via prisma migrate dev on localhost Docker PG.)
tdd_checkpoint:
  test_file: "e2e/money-limits.spec.ts, e2e/product-races.spec.ts"
  status: "green"
  failure_output: "4 failed: 500 vs 201 (payment), 500 vs 201 (order), 500 vs 400 (price), [201,201] vs [201,409] (race)"
reasoning_checkpoint:
  hypothesis: "numeric(10,2) columns overflow (22003) for amounts >= 1e8 that contracts accept; product create/rename has no DB unique so concurrent creates both insert"
  confirming_evidence:
    - "server log 22003 numeric field overflow, precision 10"
    - "race spec observed [201, 201] with a factory-row lock forcing overlap"
  falsification_test: "after widening + unique, specs still fail the same way"
  fix_rationale: "widen storage to cover every contract limit; DB constraint is the only atomic duplicate guard; map P2002 to the existing 409"
  blind_spots: "case-only duplicates (Đá X vs đá x) racing still both insert — exact-match constraint only" 

## Evidence

- timestamp: 2026-10-17
  checked: prisma/schema.prisma, src/lib/contracts/{customers,products,prices,orders}.ts
  found: all 7 money columns Decimal(10,2). RecordPaymentBody.amount max 10_000_000_000; CreateProductBody.price max 99_999_999; prices.ts `Price` (global price + customer override) has NO max; CreateOrderBody item quantity has no max (int).
  implication: payments 1e8..1e10 overflow today; prices are unbounded so they overflow even after widening unless capped.

- timestamp: 2026-10-17
  checked: src/app/api/products/route.ts POST and src/app/api/products/[id]/route.ts PATCH
  found: both do a case-insensitive findFirst duplicate check, then create/update with no DB constraint behind it; neither handles P2002. Product model has only @@index([factoryId]).
  implication: RACE-11 confirmed by reading; PATCH (rename into a duplicate) has the same race.

- timestamp: 2026-10-17
  checked: RED run — `E2E_BROWSER_CHANNEL=chrome scripts/e2e-local.sh money-limits product-races` (first attempt hit webpack "reading 'hash'" → rm -rf .next; Playwright's bundled chromium missing → used installed Chrome)
  found: "4 failed". (1) 120,000,000đ payment → Received 500, expected 201. (2) order total 150,000,000đ → 500, expected 201. (3) global/override price 2,000,000,000,000 → 500, expected 400. (4) two concurrent product creates → [201, 201], expected [201, 409]. e2e-server.log shows PostgresError code "22003" "numeric field overflow" "A field with precision 10, ..." for the 500s.
  implication: both root causes confirmed by direct observation.

- timestamp: 2026-10-17
  checked: migrations created with `prisma migrate dev` on throwaway Docker PG localhost:55434 (DATABASE_URL + DIRECT_URL both exported, host printed = localhost)
  found: 20261017013321_widen_money_columns (7 columns → DECIMAL(14,2)). 20261017013423_add_product_unique (CREATE UNIQUE INDEX products_factory_id_name_sizeKg_key) — migrate dev refuses non-interactive when it shows a data-loss warning, so it was created with `--create-only` under a pseudo-TTY (`script`) answering "y", reviewed, then applied; a following `migrate dev` produced no new migration (schema in sync).
  implication: schema and migrations agree.

- timestamp: 2026-10-17
  checked: GREEN run of the new specs, then all gates
  found: new specs "4 passed". Full e2e (scripts/e2e-local.sh, E2E_BROWSER_CHANNEL=chrome) "94 passed (1.6m)". lint: 0 errors, 65 warnings (all pre-existing; changed files lint clean). typecheck: exit 0. npm test: tests 328, pass 328, fail 0 (after `npm run contract:docs` regenerated api/openapi/price.yaml for the new price max). build: exit 0 against localhost:55435 throwaway DB. contract:verify on local standalone server: "✓ 58/58 contracts verified in 192 calls against http://localhost:3101".
  implication: fixed and no regressions.

## Eliminated

## Resolution

root_cause: (1) All seven money columns were numeric(10,2) (max 99,999,999.99) while contracts accept larger values (payment up to 10,000,000,000; global/override `Price` had no max; order totals are unbounded sums), so Postgres raised 22003 numeric field overflow → generic 500. (2) POST /api/products (and PATCH rename) did a case-insensitive read-then-write duplicate check with no DB constraint, so two concurrent creates both inserted.
fix: Widened the 7 columns to Decimal(14,2) (max 999,999,999,999.99 > 10,000,000,000 payment cap). Added @@unique([factoryId, name, sizeKg]) on Product; POST and PATCH map P2002 to the existing 409 PRODUCT_EXISTS. Capped prices.ts `Price` at 99,999,999 (same as CreateProductBody.price) so every price contract fits the column. Decision on case: the DB constraint is exact-match (case-sensitive); the routes keep their case-insensitive pre-check, which handles every non-concurrent case. A case-only duplicate created concurrently ("Đá X" vs "đá x") can still slip through — accepted: a lower(name) expression index cannot be expressed in schema.prisma and would show up as drift in later `migrate dev` runs.
verification: RED 4 failed → GREEN 4 passed; full e2e 94 passed; lint/typecheck/test(328)/build/contract:verify(58/58) green.
files_changed: [e2e/money-limits.spec.ts, e2e/product-races.spec.ts, prisma/schema.prisma, prisma/migrations/20261017013321_widen_money_columns/migration.sql, prisma/migrations/20261017013423_add_product_unique/migration.sql, src/app/api/products/route.ts, src/app/api/products/[id]/route.ts, src/lib/contracts/prices.ts, api/openapi/price.yaml]

follow_ups:
- CreateOrderBody item quantity (and reconcile actualQty) have no upper bound; quantity × price ≤ 99,999,999 still overflows Decimal(14,2) above ~10,000 bags per line (and Int above 2^31). Unrealistic for this factory, but a quantity cap would make it a 400 instead of a 500.
- Apply both migrations to production with `npm run db:deploy` when releasing (pre-checked safe: 8 products no duplicates, max money value 3,400,000).
