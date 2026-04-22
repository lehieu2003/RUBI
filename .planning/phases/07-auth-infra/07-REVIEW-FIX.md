---
phase: 07-auth-infra
fixed_at: 2026-04-22T00:00:00Z
review_path: .planning/phases/07-auth-infra/07-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 07: Code Review Fix Report

**Fixed at:** 2026-04-22T00:00:00Z
**Source review:** .planning/phases/07-auth-infra/07-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4
- Fixed: 4
- Skipped: 0

## Fixed Issues

### CR-001: Account enumeration via login error message

**Files modified:** `src/app/api/auth/login/route.ts`
**Commit:** c9bc6db
**Applied fix:** Added dummy bcrypt.compare when user not found to prevent timing leak attack. The fix performs a consistent-time bcrypt comparison against a placeholder hash before returning the error, ensuring attackers cannot probe for valid emails via timing differences.

### WR-001: Thrown Response objects in auth helpers

**Files modified:** `src/lib/auth/helpers.ts`
**Commit:** 1851e45
**Applied fix:** Added documentation comment at the top of helpers.ts explaining that these functions throw NextResponse objects directly as exceptions. This is a non-standard pattern but widely used in this codebase. Callers must handle these via instanceof Response checks or let Next.js handle them directly.

### WR-002: Duplicate factoryId validation in requireActiveSubscription

**Files modified:** `src/lib/auth/helpers.ts`
**Commit:** 1851e45
**Applied fix:** Removed duplicate factoryId check. The function now calls requireSession() once and checks factoryId directly, rather than calling requireFactoryId() (which internally calls requireSession) and then checking factoryId again.

### WR-003: x-forwarded-for header spoofing in rate limiter

**Files modified:** `src/lib/rate-limit.ts`
**Commit:** 62a472a
**Applied fix:** Added trusted proxy validation to getIpFromRequest. The function now reads TRUSTED_PROXY_IPS from environment variable and only trusts x-forwarded-for headers from known proxy IPs. Falls back to x-real-ip or 'unknown' for untrusted sources.

---

_Fixed: 2026-04-22_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_