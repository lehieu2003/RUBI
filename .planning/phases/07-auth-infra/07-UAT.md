---
status: testing
phase: 07-auth-infra
source: [.planning/phases/07-auth-infra/07-01-SUMMARY.md, .planning/phases/07-auth-infra/07-02-SUMMARY.md]
started: 2026-04-22
updated: 2026-04-22
note: Onboarding page removed - registration redirects to /dashboard. Tests 6 and 7 skipped.
---

## Current Test

number: 3
name: Rate limiting on registration
expected: |
  Attempt registration 4 times rapidly from the same IP. The 4th attempt should be rejected with 429 Too Many Requests and a Retry-After header.
awaiting: user response

## Tests

### 1. Register new account
expected: Fill in the registration form with valid data. Submit should create a new factory + user account atomically, start a 14-day TRIAL subscription, and redirect to /dashboard.
result: passed
fix: |
  Committed fixes:
  - 1d68460: prismaAuth separate client for auth endpoints (no tenant $extends)
  - 0b78871: client password min 6→8 + phone duplicate check added
  - b845aed: set tenant context in dashboard server component before prisma queries

### 2. Login with registered account
expected: Use the registered email and password to log in. Should receive a valid session cookie and land on the dashboard.
result: passed

### 3. Rate limiting on registration
expected: Attempt registration 4 times rapidly from the same IP. The 4th attempt should be rejected with 429 Too Many Requests and a Retry-After header.
result: pending

### 4. Rate limiting on login
expected: Attempt login 6 times rapidly from the same IP. The 6th attempt should be rejected with 429 Too Many Requests.
result: pending

### 5. Registration input validation
expected: Submit registration with an invalid email (e.g., "not-an-email") or password shorter than 8 characters. Should receive a 400 error with Zod validation errors showing which fields are invalid.
result: pending

### 6. Complete onboarding flow
expected: After registering, fill in customer data and complete the onboarding. Upon successful CSV import, the system should call PATCH /api/factory/onboarding to mark onboarding as complete, then show the done state.
result: skipped
reason: Onboarding page removed - users can add customers from dashboard after registration

### 7. Dashboard onboarding prompt
expected: Log in as an ADMIN user whose factory has onboardingCompleted=false. The dashboard should show a yellow banner saying "Hoàn tất thiết lập" with a link to the onboarding page.
result: skipped
reason: Onboarding page removed - no longer needed

### 8. Email normalization in registration
expected: Register with email "  Test@Example.COM  ". The stored email should be "test@example.com" (lowercase, trimmed).
result: pending

## Summary

total: 8
passed: 2
issues: 1
pending: 3
skipped: 2

## Gaps

- truth: "Registration endpoint creates factory + user atomically and returns nextUrl: '/onboarding'"
  status: failed
  reason: "TENANT_ACCESS_DENIED - auth endpoints used extended prisma with tenant filtering, no context set during registration. Also: client password min was 6 not 8, no phone duplicate check."
  severity: blocker
  test: 1
  fix_commits:
    - "1d68460 fix(07): add prismaAuth - separate Prisma client without tenant filtering"
    - "0b78871 fix(07): align client password min with server (8 chars) and add phone duplicate check"
  artifacts: ["src/app/api/auth/register/route.ts", "src/app/api/auth/login/route.ts", "src/app/api/auth/me/route.ts", "src/lib/db.ts"]
  missing: []