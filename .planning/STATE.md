---
gsd_state_version: 1.0
milestone: v3.0
milestone_name: milestone
current_phase: 10
status: milestone_complete
stopped_at: Phase 10 verified; v3.0 milestone ready for completion
last_updated: "2026-06-18T11:45:00Z"
last_activity: 2026-06-18 -- Completed quick task 260618-prk: Add Docker and GitHub Actions quality gate
progress:
  total_phases: 7
  completed_phases: 7
  total_plans: 15
  completed_plans: 15
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-22)
**Current milestone:** v3.0 Security Hardening + SaaS Readiness
**Core value:** Speed over everything — staff must enter orders faster than writing by hand (30 seconds), or they reject the system and return to pen-and-paper.
**Current phase:** 10

## Current Position

Phase: 10 (build-correctness) — COMPLETE
Plan: 1 of 1
Status: Milestone complete
Last activity: 2026-10-10 - Completed quick task 261010-e2e: browser test suite

Progress: [██████████] 100% execution complete

## Performance Metrics

**Velocity (v2.0):**

- Total plans: 13
- Average duration: ~35 min/plan
- Timeline: 7 days (2026-04-14 → 2026-04-21)
- Files changed: 14 (+411/-11 LOC)

**By Phase:**

| Phase | Plans | Complete |
|-------|-------|----------|
| 01 | 2/2 | - |
| 02 | 2/2 | - |
| 03 | 3/3 | - |
| 03x | 3/3 | - |
| 04 | 3/3 | - |
| 7B | 3/3 | 2026-04-22 |

*Updated after each plan completion*

## Accumulated Context

### Decisions

Key decisions from v2.0 affecting current work:

- factoryId on all tenant entities (Customer, Driver, Order, Product) — direct String field, not relation
- AsyncLocalStorage + Prisma $extends — auto-inject factoryId filter without manual wrapping
- SUPER_ADMIN bypasses factoryId filter — role check before auto-injecting
- @@unique([code, factoryId]) and @@unique([phone, factoryId]) — factory-scoped uniqueness
- System factory with isSystem=true owns all pre-existing records
- 7-day grace period via isGracePeriodExpired middleware
- $transaction for atomic factory+user+subscription creation

v3.0 decisions:

- Prisma $extends fails-closed when ctx.factoryId is absent (not silent all-tenant queries)
- Explicit `where: { factoryId }` as primary defense-in-depth
- Zod v4 for input validation (already installed)
- In-memory rate limiting (no new dependency)

### Roadmap Evolution

- Phase 8B added: Staff and Driver Scheduling — shift scheduling with paidDriverLimit enforcement

### Blockers/Concerns

- `npx tsc --noEmit -p tsconfig.json` still fails on Phase 10 build-correctness debt in `src/app/dashboard/page.tsx`, `src/components/dashboard/dashboard-client.tsx`, and `src/db/seed.ts`.
- STAFF/ACCOUNTANT login regression after Phase 7B was fixed: orphan local tenant users were backfilled to `Phương Loan`, and auth routes now reject/repair missing factoryId sessions.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260423 | Prisma datasource URL fix | 2026-04-23 | uncommitted | [260423-prisma-datasource-url-fix](./quick/260423-prisma-datasource-url-fix/) |
| 260618-prk | Add Docker and GitHub Actions quality gate | 2026-06-18 | uncommitted | [260618-prk-add-docker-and-github-actions-quality-ga](./quick/260618-prk-add-docker-and-github-actions-quality-ga/) |
| 261003-14257 | Landing support chat widget (canned Q&A + Zalo handoff) | 2026-10-03 | 57b98ab | [261003-14257-landing-support-chat](./quick/261003-14257-landing-support-chat/) |
| 261004-5240 | Security hardening: next 15.5.27 CVE bump, CSV formula guard, drop xlsx | 2026-10-04 | 377da37 | [261004-5240-security-hardening](./quick/261004-5240-security-hardening/) |
| 261004-0586 | sslmode=require on Supabase connection strings (.env + .env.example) | 2026-10-04 | 479a666 | [261004-0586-sslmode-require](./quick/261004-0586-sslmode-require/) |
| 261010-r1b | Remove delivery map/GPS (web + mobile) and super admin/SaaS — single factory Rubi | 2026-10-10 | 28452dc | [261010-r1b-remove-map-gps-and-saas](./quick/261010-r1b-remove-map-gps-and-saas/) |
| 261010-pdf | Pre-deploy audit fixes: delivery confirm guard, driver list carry-over, STAFF assignment, server-side order pricing, settle list, maintenance dates | 2026-10-10 | 04c8064 | [261010-pdf-pre-deploy-audit-fixes](./quick/261010-pdf-pre-deploy-audit-fixes/) |
| 261010-odf | Order drawer opens with the cursor in the customer search | 2026-10-10 | a4bac91 | [261010-odf-order-drawer-focus](./quick/261010-odf-order-drawer-focus/) |
| 261010-prd | Product management: add, edit and discontinue products; order grid built from the catalogue | 2026-10-10 | feat/product-management | [261010-prd-product-management](./quick/261010-prd-product-management/) |
| 261010-inv | Inventory as a running balance carried over day to day, plus stock count | 2026-10-10 | fix/inventory-carry-over | [261010-inv-inventory-carry-over](./quick/261010-inv-inventory-carry-over/) |
| 261010-sch | Stock count history: stock_counts table, list API and history on the cold-storage screen | 2026-10-10 | feat/stock-count-history | [261010-sch-stock-count-history](./quick/261010-sch-stock-count-history/) |
| 261010-ops | Follow-ups: unassign a deactivated driver's orders, customer price link, settled-today counter, stock count filters and totals | 2026-10-10 | feat/ops-followups | [261010-ops-ops-followups](./quick/261010-ops-ops-followups/) |
| 261010-qol | Office quality of life: sellable stock in the order drawer, discontinue confirmation, shell count correction, staff phone | 2026-10-10 | feat/office-quality-of-life | [261010-qol-office-quality-of-life](./quick/261010-qol-office-quality-of-life/) |
| 261010-e2e | Browser test suite (Playwright) in the repo and CI; every seeded driver has an account | 2026-10-10 | test/e2e-browser-suite | [261010-e2e-browser-test-suite](./quick/261010-e2e-browser-test-suite/) |
| 261011-psf | Delivery slip prints the factory's own name, address and phone, and the order notes; order page no longer prints blank | 2026-10-11 | fix/print-slip-factory-info | [261011-psf-print-slip-factory-info](./quick/261011-psf-print-slip-factory-info/) |
| 261011-src | Manager changes an account between staff and driver in Settings; an open session follows the new role | 2026-10-11 | feat/staff-role-change | [261011-src-staff-role-change](./quick/261011-src-staff-role-change/) |
| 261011-lsa | Low-stock alert: per-product level, warning on cold storage and dashboard from what can still be sold | 2026-10-11 | feat/low-stock-alert | [261011-lsa-low-stock-alert](./quick/261011-lsa-low-stock-alert/) |
| 261011-adl | Audit log: every change to an order or a customer's debt records who did it; manager screen to read it | 2026-10-11 | feat/audit-log | [261011-adl-audit-log](./quick/261011-adl-audit-log/) |
| 261011-mci | Mobile app gets its own CI gate (flutter analyze + test) on changes under mobile/; the web gate skips mobile-only changes | 2026-10-11 | chore/mobile-ci | [261011-mci-mobile-ci](./quick/261011-mci-mobile-ci/) |
| 261011-mce | Mobile: cubits no longer emit after they are closed (StateError when leaving a tab mid-request) | 2026-10-11 | fix/mobile-cubit-emit-after-close | [261011-mce-mobile-cubit-emit-after-close](./quick/261011-mce-mobile-cubit-emit-after-close/) |
| 261011-mdl | Mobile data layer: change password and shift registration (repositories, DTOs, mappers, tests; no UI yet) | 2026-10-11 | feat/mobile-password-schedule-data | [261011-mdl-mobile-data-layer](./quick/261011-mdl-mobile-data-layer/) |
| 261012-mcs | Mobile: lib/core laid out as bootstrap, constants, di, extensions, network, storage, view_state with a core.dart barrel | 2026-10-12 | refactor/mobile-core-structure | [261012-mcs-mobile-core-structure](./quick/261012-mcs-mobile-core-structure/) |
| 261012-mrt | Mobile: core/router (app_router, route_names, app_router_refresh), core/theme and shared/widgets | 2026-10-12 | refactor/mobile-router-theme-shared | [261012-mrt-mobile-router-theme-shared](./quick/261012-mrt-mobile-router-theme-shared/) |
| 261012-mlm | Mobile: a wrong password at sign-in shows the server's message instead of "session expired" | 2026-10-12 | fix/mobile-login-wrong-password-message | [261012-mlm-mobile-login-wrong-password-message](./quick/261012-mlm-mobile-login-wrong-password-message/) |
| 261012-mcp | Mobile: change-password screen; an account that must change its password is held there until it does | 2026-10-12 | feat/mobile-change-password | [261012-mcp-mobile-change-password](./quick/261012-mcp-mobile-change-password/) |
| 261012-msr | Mobile: "Ca làm" tab — the week's shifts, request, withdraw and request again, with the web's blocking rules | 2026-10-12 | feat/mobile-shift-registration | [261012-msr-mobile-shift-registration](./quick/261012-msr-mobile-shift-registration/) |
| 261012-mlp | Mobile: a password reset by the manager while the app is open sends the driver to the change-password screen | 2026-10-12 | feat/mobile-live-password-reset | [261012-mlp-mobile-live-password-reset](./quick/261012-mlp-mobile-live-password-reset/) |
| 261012-mch | Mobile: mappers share MappingValidator; unexpected and swallowed errors are logged through AppLogger | 2026-10-12 | refactor/mobile-use-core-helpers | [261012-mch-mobile-use-core-helpers](./quick/261012-mch-mobile-use-core-helpers/) |
| 261012-mee | Mobile: end-to-end test of the app on an Android emulator against a real server, with a one-command script | 2026-10-12 | test/mobile-emulator-e2e | [261012-mee-mobile-emulator-e2e](./quick/261012-mee-mobile-emulator-e2e/) |
| 261012-mdn | Mobile driver: order notes on the delivery card; the list reloads when the app comes back from the background | 2026-10-12 | feat/mobile-driver-notes-refresh | [261012-mdn-mobile-driver-notes-refresh](./quick/261012-mdn-mobile-driver-notes-refresh/) |
| 261012-mtm | Mobile: light / dark / follow-the-phone appearance in Settings, remembered on the device | 2026-10-12 | feat/mobile-theme-mode | [261012-mtm-mobile-theme-mode](./quick/261012-mtm-mobile-theme-mode/) |
| 261012-mmd | Mobile: manager data layer — team schedule and shift review, cold storage, customer debt | 2026-10-12 | feat/mobile-manager-data | [261012-mmd-mobile-manager-data](./quick/261012-mmd-mobile-manager-data/) |

## Session Continuity

Last session: 2026-04-22T08:55:00.000Z
Stopped at: Phase 7B login regression hotfixed
Resume from: /gsd-code-review 8, then /gsd-verify-work 8

## Milestone Archive

- v1.0: [.planning/milestones/v1.0-ROADMAP.md]
- v2.0: [.planning/milestones/v2.0-ROADMAP.md] (archived 2026-04-22)

## Known Tech Debt (v2.0 gaps)

1. **Payment audit log broken:** `POST /api/payments/confirm` extends subscription but does NOT create Payment records — audit log shows empty
2. **SUPER_ADMIN blocked from /api/orders:** breaks impersonation read
3. **factoryId fallback:** `session.factoryId || session.userId` is semantically wrong (userId != factoryId)

---

*Last updated: 2026-04-23 after Phase 09 verification*

**Current Phase:** 09 (Super Admin + Integration) — 1/1 plans executed, verification gaps found

**Latest Phase:** 09 (Super Admin + Integration) — 1/1 plans executed; INT-02 gap pending closure

**Next Recommended:** `/gsd-plan-phase 09 --gaps`
