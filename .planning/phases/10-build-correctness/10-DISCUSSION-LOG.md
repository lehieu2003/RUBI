# Phase 10: Build Correctness - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-23
**Phase:** 10-build-correctness
**Areas discussed:** TypeScript errors (dashboard/page.tsx role type)

---

## TypeScript Errors: dashboard/page.tsx role type

| Option | Description | Selected |
|--------|-------------|----------|
| Fix DashboardClientProps | Change `currentUser.role` type to accept `string \| undefined` — minimal blast radius | ✓ |
| Non-null assertion in page.tsx | Use `session.role!` since auth flow guarantees role | |
| Fix JWTPayload interface | Make role required everywhere — semantically correct but higher blast radius | |

**User's choice:** Recommend (DashboardClientProps fix)
**Notes:** User selected "recommend" — followed Claude's recommendation to fix DashboardClientProps interface with minimal blast radius

---

## Claude's Discretion

[List areas where user said "you decide" or deferred to Claude]

- Exact location in each file where Decimal serialization happens
- ESLint warnings cleanup

