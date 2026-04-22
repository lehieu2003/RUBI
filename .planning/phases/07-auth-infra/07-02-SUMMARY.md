---
phase: 07-auth-infra
plan: "02"
subsystem: auth-onboarding
tags: [auth, onboarding, registration, factory]
dependency_graph:
  requires: ["07-01"]
  provides: ["REG-04", "REG-05"]
  affects: ["registration-flow", "dashboard"]
tech_stack:
  added: []
  patterns:
    - "PATCH /api/factory/onboarding for onboarding completion"
    - "nextUrl-based redirect in registration"
    - "factory.onboardingCompleted check in dashboard"
key_files:
  created:
    - path: src/app/api/factory/onboarding/route.ts
      description: "PATCH endpoint to set factory onboardingCompleted to true"
  modified:
    - path: src/app/onboarding/page.tsx
      description: "Calls PATCH /api/factory/onboarding after successful customer import"
    - path: src/app/(auth)/register/page.tsx
      description: "Reads nextUrl from registration response and redirects to it"
    - path: src/app/dashboard/page.tsx
      description: "Checks factory.onboardingCompleted and passes result to DashboardClient"
decisions:
  - "Registration client calls API directly instead of via useAuth helper"
  - "Onboarding PATCH failure does not block the done state display"
  - "Dashboard uses dedicated getFactory() query for onboardingCompleted status"
---

# Phase 07 Plan 02: Onboarding Completion Flow - Summary

## One-liner

Onboarding completion flow: PATCH endpoint, registration redirect to nextUrl, dashboard prompt for incomplete factories.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create PATCH /api/factory/onboarding endpoint | 8a68e11 | src/app/api/factory/onboarding/route.ts |
| 2 | Call PATCH after successful customer import | 2c1d3b8 | src/app/onboarding/page.tsx |
| 3 | Registration client redirects to nextUrl from response | 8630ac9 | src/app/(auth)/register/page.tsx |
| 4 | Dashboard shows onboarding prompt for ADMIN when incomplete | 4290e97 | src/app/dashboard/page.tsx |

## Success Criteria

- [x] `src/app/api/factory/onboarding/route.ts` PATCH endpoint exists and updates `onboardingCompleted: true` for ADMIN user
- [x] `src/app/onboarding/page.tsx` calls `PATCH /api/factory/onboarding` after successful import
- [x] Registration client reads `nextUrl` from response and redirects to it (not hardcoded /dashboard)
- [x] `src/app/dashboard/page.tsx` shows onboarding prompt for ADMIN users when `factory.onboardingCompleted === false`
- [x] Prompt links to `/onboarding` page

## Commits

- `8a68e11` feat(07-02): add PATCH /api/factory/onboarding endpoint
- `2c1d3b8` feat(07-02): call PATCH /api/factory/onboarding after customer import
- `8630ac9` feat(07-02): registration client redirects to nextUrl from response
- `4290e97` feat(07-02): dashboard shows onboarding prompt when onboardingCompleted is false

## Deviations from Plan

None - plan executed exactly as written.

## Threat Flags

None - no new security surface introduced.

## Duration

Plan execution time not recorded (no PLAN_START_EPOCH available).