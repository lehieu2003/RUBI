# Phase 7: Auth Infrastructure + Registration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-22
**Phase:** 07-auth-infra
**Areas discussed:** Auth helper structure, Rate limit key strategy, nextUrl handling, Onboarding completion trigger

---

## Auth helper structure

| Option | Description | Selected |
|--------|-------------|----------|
| Single shared file | Single helper file at src/lib/auth/helpers.ts, imported everywhere. Easier to maintain consistency. | ✓ |
| Inline per-route | Helper logic inlined in each route. More verbose but no import dependency. | |

**User's choice:** Single shared file (Recommended)
**Notes:** User chose recommended option — single shared file for consistency.

---

## Rate limit key strategy

| Option | Description | Selected |
|--------|-------------|----------|
| IP only | Simple to implement, works for office IP sharing. 3 req/min for register, 5 for login. | ✓ |
| IP + email combo | More granular but complex for shared IPs where office staff share one IP. | |

**User's choice:** IP only (Recommended)
**Notes:** User chose recommended option — IP-based for simplicity and office IP sharing support.

---

## nextUrl handling

| Option | Description | Selected |
|--------|-------------|----------|
| Server in response body | Server returns nextUrl in JSON response. Client reads it and redirects — more flexible for future flows. | ✓ |
| Client-side redirect logic | Client decides where to redirect based on response shape (user vs subscription present). | |

**User's choice:** Server in response body (Recommended)
**Notes:** User chose recommended option — server-controlled redirect for flexibility.

---

## Onboarding completion trigger

| Option | Description | Selected |
|--------|-------------|----------|
| Separate endpoint after import | Existing /api/customers/import endpoint returns success, then PATCH /api/factory/onboarding to mark complete. | ✓ |
| Import endpoint marks complete | Import endpoint handles both import and marking onboarding complete in one call. | |

**User's choice:** Separate endpoint after import (Recommended)
**Notes:** User chose recommended option — separate PATCH to mark onboarding complete.

---

## Claude's Discretion

- Specific file structure for helpers.ts — Claude decides internal organization
- Rate limit cleanup interval (how often to prune expired entries)
- Exact Zod error message wording — Claude decides
- Migration approach if needed for onboarding flow changes

## Deferred Ideas

None.
