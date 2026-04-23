---
phase: "08B"
slug: "staff-and-driver-scheduling"
status: "ready"
nyquist_compliant: true
wave_0_complete: true
created: "2026-04-22"
---

# Phase 08B — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (Next.js 15 default) |
| **Config file** | `vitest.config.ts` (or package.json) |
| **Quick run command** | `npm test -- --run` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | Created During | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|----------------|--------|
| 08B-01-01 | 01 | 1 | REQ-01 | T-08B-01 | Shift enum and DriverShiftAssignment model stored correctly in DB | grep + Prisma validate | `grep -n "model DriverShiftAssignment" prisma/schema.prisma && npx prisma validate` | — | ready |
| 08B-01-02 | 01 | 1 | REQ-02 | T-08B-01 | GET returns only factory drivers and assignment rows in requested week | unit | `npm test -- --run tests/api/schedule/drivers.test.ts` | Task 2 | ready |
| 08B-01-02 | 01 | 1 | REQ-02 | T-08B-01 | PATCH upserts/deletes one assignment for driverId + shiftDate with factoryId scoping | unit | `npm test -- --run tests/api/schedule/drivers.test.ts` | Task 2 | ready |
| 08B-01-02 | 01 | 1 | REQ-03 | T-08B-02 | paidDriverLimit exceeded for a date returns 403 with Vietnamese error | unit | `npm test -- --run tests/api/schedule/drivers.test.ts` | Task 2 | ready |
| 08B-01-03 | 01 | 1 | REQ-04 | — | Calendar grid renders 8 columns x N driver rows | grep | `grep -n "grid-cols-8" src/app/schedule/page.tsx` | Task 3 | ready |
| 08B-01-04 | 01 | 1 | REQ-05 | — | Sidebar shows "Lich trình" for ADMIN/ACCOUNTANT only | grep | `grep -n "/schedule" src/lib/rbac/permissions.ts` | Task 4 | ready |

*Status: ready . green . red . flaky*

---

## Test Files Created During Execution

The following test files are **created as part of implementing the API route and UI components**, not as a separate Wave 0. They do not exist prior to execution.

| Test File | Created During | Covers |
|-----------|----------------|---------|
| `tests/api/schedule/drivers.test.ts` | Task 2 | REQ-02, REQ-03 |
| `tests/lib/subscription.test.ts` | Task 2 | REQ-03 (paidDriverLimit) |
| `tests/components/schedule/calendar-grid.test.tsx` | Task 3 | REQ-04 |
| `tests/components/sidebar.test.tsx` | Task 4 | REQ-05 |

These files are created during Task 2/3/4 execution. Before they exist, use the grep/Prisma checks in the plan; after creation, the unit commands above become the gate.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Click cycles M->A->N->empty | REQ-04 | Interactive UI state cycle | Open /schedule, click any shift cell, observe rotation |
| Week navigation arrows work | REQ-04 | Navigation interaction | Click prev/next week, confirm date changes |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify — grep/Prisma checks before tests exist, unit tests after implementation creates them
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 references removed — test files marked as created during execution
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ready for execution
