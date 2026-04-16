# Phase 4: Status Enum Fixes & API Hardening - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix status enum mismatches between the Prisma schema and API/component code. Add driver token validation to the confirm delivery endpoint. The schema defines the correct values — all code must be updated to match.

This phase delivers: corrected status enum references in API routes and components, plus driver token authentication on the confirm endpoint.

</domain>

<decisions>
## Implementation Decisions

### Status Enum Fix
- **D-01:** Replace old status values — Code using `DRAFT | CONFIRMED | PRINTED | DELIVERED` must be updated to match the Prisma schema: `PENDING | SHIPPING | DELIVERED | COMPLETED | CANCELLED`
  - `PENDING` replaces the old `DRAFT + CONFIRMED` combined concept (waiting to ship)
  - `SHIPPING` replaces the old `PRINTED` concept (order is out for delivery)
  - `DELIVERED` remains (driver confirmed delivery, awaiting accountant reconciliation)
  - `COMPLETED` remains (accountant reconciled at end of day)
  - `CANCELLED` remains (order was cancelled)
  - Workflow: `PENDING → SHIPPING → DELIVERED → COMPLETED` (CANCELLED at any point)

### Driver Token Validation on Confirm Endpoint
- **D-02:** Bearer token authentication — Driver sends their token as `Authorization: Bearer <token>` header when calling `PATCH /api/orders/[id]/confirm`
- **D-03:** Token lookup — API looks up the Driver by token using `prisma.driver.findUnique({ where: { token } })`
- **D-04:** Order ownership check — After authenticating the driver, verify that `order.driverId` matches the authenticated driver's ID
- **D-05:** Auth failure response — If token is invalid → 401 Unauthorized. If token valid but order belongs to different driver → 403 Forbidden with message "Not authorized to confirm this order"

### Files to Update
- `src/app/api/orders/route.ts` — Status filter type cast (line 16)
- `src/components/dashboard/recent-orders.tsx` — Status type definition and statusConfig
- `src/app/api/orders/[id]/confirm/route.ts` — Add driver token auth middleware

### Claude's Discretion
- Exact Zod validation schema for the Authorization header (how to parse "Bearer <token>")
- Where exactly to place the auth check in the confirm route (before or after request body parsing)
- How to handle the case where the order has no driverId assigned

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Documents
- `.planning/PROJECT.md` — Core constraint: Speed over everything, web-only
- `.planning/REQUIREMENTS.md` — Phase 4 requirements (from v1.0 audit): fix enum mismatches, add confirm token validation
- `.planning/ROADMAP.md` — Phase 4 goal and success criteria
- `.planning/phases/01-foundation-order-entry/01-CONTEXT.md` — Phase 1 decisions (had old status workflow DRAFT→CONFIRMED→PRINTED)
- `.planning/phases/02-delivery-slips/02-CONTEXT.md` — Phase 2 decisions (D-05: order status update API)
- `.planning/phases/03-driver-delivery-view/03-CONTEXT.md` — Phase 3 decisions (D-01 to D-03: driver URL token auth, D-09: GPS capture on confirm, D-28: GET /api/driver/orders, D-29: PATCH /api/orders/[id]/confirm)

### Code References
- `prisma/schema.prisma` — OrderStatus enum definition (PENDING, SHIPPING, DELIVERED, COMPLETED, CANCELLED)
- `src/app/api/orders/route.ts` — Current broken status filter (line 16 uses wrong enum values)
- `src/components/dashboard/recent-orders.tsx` — Status type and statusConfig (uses old DRAFT/CONFIRMED/PRINTED values)
- `src/app/api/orders/[id]/confirm/route.ts` — Confirm endpoint needing token auth

</canonical_refs>

<codebase>
## Existing Code Insights

### Reusable Assets
- Existing `prisma.driver.findUnique` pattern from `src/app/api/driver/orders/route.ts` — can reuse token lookup logic
- Existing `z` (Zod) import in confirm route for request validation — extend for header validation
- Existing Prisma `Prisma` import for `JsonNull` handling

### Established Patterns
- Driver token auth in Phase 3 used URL-based tokens (`/d/[token]`) stored in localStorage
- Bearer token format for Authorization header is standard HTTP pattern
- 401 = invalid/missing token, 403 = valid token but not authorized

### Integration Points
- `PATCH /api/orders/[id]/confirm` is driver-facing (called from driver's phone)
- Driver token is stored in localStorage on driver's phone (Phase 3 D-02)
- Confirm endpoint already handles GPS capture and DELIVERED status update

</codebase>

<specifics>
## Specific Ideas

1. **StatusConfig in recent-orders.tsx** — The `statusConfig` object maps status values to colors/labels. It currently has DRAFT/CONFIRMED/PRINTED entries. These must be replaced with PENDING/SHIPPING entries with equivalent Vietnamese labels.

2. **GPS-null handling** — From Phase 3 D-09: if GPS fails/times out, send `gps: null` and allow confirmation to proceed. This behavior is preserved — token auth is additive, not changing the GPS-null logic.

</specifics>

<deferred>
## Deferred Ideas

- Phase 1 VERIFICATION.md — Success criterion #4 mentions "Phase 1 has VERIFICATION.md documenting requirements coverage". This is a Phase 1 deliverable, not Phase 4 scope. Noted for future phase work.

</deferred>

---

*Phase: 04-status-enum-fixes*
*Context gathered: 2026-04-16*
