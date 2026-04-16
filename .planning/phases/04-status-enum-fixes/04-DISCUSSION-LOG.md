# Phase 4: Status Enum Fixes & API Hardening - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-16
**Phase:** 04-status-enum-fixes
**Areas discussed:** Status workflow, Token validation

---

## Status Workflow

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, replace them | DRAFT→CONFIRMED→PRINTED replaced with PENDING/SHIPPING. Workflow: PENDING→SHIPPING→DELIVERED→COMPLETED (CANCELLED at any point) | ✓ |
| Keep some old values | Keep some of the old status values (e.g., CONFIRMED or PRINTED) alongside PENDING/SHIPPING | |
| You decide | Let Claude analyze and recommend based on workflow semantics | |

**User's choice:** You decide
**Notes:** User delegated to Claude. Recommendation accepted: PENDING replaces DRAFT+CONFIRMED, SHIPPING replaces PRINTED. Schema is authoritative — code must match.

## Token Validation

| Option | Description | Selected |
|--------|-------------|----------|
| Bearer token in Authorization header | Driver sends `Authorization: Bearer <token>` header. API looks up Driver by token, verifies order ownership. | ✓ |
| Order ID encodes driver token | Driver's URL contains both order ID and their token. Order ID implicitly tied to driver. | |
| You decide | Let Claude decide based on Phase 3 existing token pattern. | |

**User's choice:** Bearer token in Authorization header
**Notes:** Standard HTTP Bearer token pattern.

## Auth Error Response

| Option | Description | Selected |
|--------|-------------|----------|
| 403 Forbidden | Return 403 with "Not authorized to confirm this order" | ✓ |
| 404 Not Found | Return 404 to avoid leaking information about other drivers' orders | |

**User's choice:** 403 Forbidden — not your order
**Notes:** Clear message that this order belongs to someone else.

## Areas Discussed Summary

- **Status workflow:** PENDING→SHIPPING→DELIVERED→COMPLETED (CANCELLED at any point) — locked
- **Token validation:** Bearer token in Authorization header — locked
- **Auth failure response:** 403 Forbidden — locked

## Deferred Ideas

- Phase 1 VERIFICATION.md documenting requirements coverage — belongs to Phase 1, not Phase 4 scope.

---
