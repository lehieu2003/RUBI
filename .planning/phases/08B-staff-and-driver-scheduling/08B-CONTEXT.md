# Phase 08B: Staff and Driver Scheduling - Context

**Gathered:** 2026-04-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Shift scheduling for drivers within a factory. Drivers are assigned to shifts (Morning/Afternoon/Night) per day with paidDriverLimit enforcement. Staff accountability is tracked via existing Order assignerId, not fixed staff shifts. This phase does NOT cover timekeeping/payroll, GPS tracking, or vehicle scheduling.
</domain>

<decisions>
## Implementation Decisions

### Shift Structure
- **D-01:** Driver shifts are MORNING (6am-2pm), AFTERNOON (2pm-10pm), NIGHT (10pm-6am) — full 24h coverage
- **D-02:** Staff scheduling is dynamic — no fixed shifts, tracked via Order assignerId

### Data Model
- **D-03:** Driver shifts are stored in a new `DriverShiftAssignment` model keyed by `driverId + shiftDate`, with `shift` (MORNING/AFTERNOON/NIGHT enum). Do not store `shift`/`shiftDate` directly on `Driver`, because a weekly grid needs multiple assignments per driver.
- **D-04:** Staff tracked via existing `Order.assignerId` — no new model needed

### paidDriverLimit Enforcement
- **D-05:** Block at assignment time — when admin assigns a driver to a date, check subscription limit against distinct drivers already scheduled for that same date
- **D-06:** Error if limit exceeded: "Cần nâng cấp subscription để thêm driver"

### Scheduling UI
- **D-07:** Driver scheduling: Weekly calendar grid (rows=drivers, columns=days, color-coded M/A/N cells)
- **D-08:** Access: New "Lịch trình" sidebar menu item for ADMIN/ACCOUNTANT

### Driver Eligibility
- **D-09:** All drivers (isActive=true or false) can be scheduled — admin decides

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Patterns
- `prisma/schema.prisma` — Driver model, Order model, Subscription model with driverCount field
- `src/lib/rbac/permissions.ts` — tenantRoutePermissions for adding new route
- `src/app/api/orders/bulk-assign/route.ts` — subscription lookup and DRIVER_LIMIT_EXCEEDED error shape (line 49-60)
- `src/app/driver/page.tsx` — Driver web-view UI pattern (fake data, card layout)

### Billing
- `docs/billing-workflow.md` — paidDriverLimit, subscription driverCount context

[If no external specs: "No external specs — requirements fully captured in decisions above"]

</canonical_refs>

<codebase_context>
## Existing Code Insights

### Reusable Assets
- Driver web-view card pattern from `src/app/driver/page.tsx` — can inspire scheduling UI
- bulk-assign route already has the subscription lookup and DRIVER_LIMIT_EXCEEDED error shape — reuse those parts, but count distinct scheduled drivers per date

### Established Patterns
- RBAC via `tenantRoutePermissions` in permissions.ts — new route added to array
- Sidebar filtering via `getVisibleTenantRoutes` — scheduling link added there
- Subscription check via `requireActiveSubscription()` helper

### Integration Points
- Prisma schema — add Shift enum and DriverShiftAssignment model
- Sidebar component — add scheduling menu item
- Subscription enforcement — reuse subscription lookup/error shape from bulk-assign route and apply per-date scheduled-driver counting

</codebase_context>

<specifics>
## Specific Ideas

- "Drivers swap vehicles" — vehicles and drivers are loosely coupled, scheduling is driver-centric not vehicle-centric
- Night shift exists for factories that operate 24h

</specifics>

<deferred>
## Deferred Ideas

- Vehicle scheduling (which truck each driver uses) — Phase 2+ backlog
- Staff timekeeping/payroll — Phase 2+ backlog
- Driver GPS tracking — not in scope (PROJECT.md out of scope)
- Custom shift time configuration — hardcoded M/A/N for now

</deferred>

---

*Phase: 08B-staff-and-driver-scheduling*
*Context gathered: 2026-04-22*
