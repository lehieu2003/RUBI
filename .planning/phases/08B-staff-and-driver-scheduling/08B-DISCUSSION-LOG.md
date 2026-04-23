# Phase 08B: Staff and Driver Scheduling - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-22
**Phase:** 08B-staff-and-driver-scheduling
**Areas discussed:** Shift structure, Data model, paidDriverLimit enforcement, Scheduling UI, Access point, Driver eligibility, Staff tracking

---

## Area: Shift Structure (Drivers)

| Option | Description | Selected |
|--------|-------------|----------|
| Morning/Afternoon shifts only | MORNING (6am-2pm) and AFTERNOON (2pm-10pm). Simple, covers peak hours. | |
| Morning/Afternoon/Night shifts | MORNING (6am-2pm), AFTERNOON (2pm-10pm), NIGHT (10pm-6am). Full 24h coverage. | ✓ |
| Admin configures custom shifts | Factory owner decides shift times during setup | |

**User's choice:** Morning/Afternoon/Night shifts
**Notes:** Night shift exists for factories that operate 24h. Full 24h coverage needed.

---

## Area: Shift Structure (Staff)

| Option | Description | Selected |
|--------|-------------|----------|
| Per-staff fixed shift assignment | Admin assigns each staff to MORNING or AFTERNOON shift. Max 2 per shift. | |
| Dynamic per-order assignment | Each order gets assigned to whoever entered it. No fixed shifts needed. | ✓ |
| Staff role + time-based auto-assignment | Staff with ACCOUNTANT role = morning, STAFF role = afternoon auto-assigned. | |

**User's choice:** Dynamic per-order assignment
**Notes:** Staff scheduling is "mental accounting" — track who entered each order via assignerId.

---

## Area: paidDriverLimit Enforcement

| Option | Description | Selected |
|--------|-------------|----------|
| Block at assignment time | Check if subscription allows when admin assigns driver to shift | ✓ |
| Block at shift creation | Enforce on shift creation. If trial allows 3 drivers, only 3 shift slots total. | |
| Soft warning only | Allow over-limit but show warning. No hard block. | |

**User's choice:** Block at assignment time
**Notes:** Reuse pattern from bulk-assign route (line 49-60 in route.ts)

---

## Area: Scheduling UI

| Option | Description | Selected |
|--------|-------------|----------|
| Weekly calendar grid | Rows = drivers, columns = days. Color-coded cells for M/A/N shifts. | ✓ |
| Driver card list | List view: each driver card shows their shift assignment for current day. | |
| Monthly calendar | Calendar style: full month view with shift assignments as events on each day. | |

**User's choice:** Weekly calendar grid
**Notes:** Familiar grid layout — easy to see who's on which shift at a glance.

---

## Area: Access Point

| Option | Description | Selected |
|--------|-------------|----------|
| New sidebar menu item | Add 'Lịch trình' link in sidebar for ADMIN/ACCOUNTANT | ✓ |
| Integrate into existing pages | Use existing routes (/orders, /settle) to show shift info. No new page. | |
| Driver detail drawer | Admin clicks on driver name in order/delivery view to assign shift from popup. | |

**User's choice:** New sidebar menu item
**Notes:** "Lịch trình" — scheduling in Vietnamese.

---

## Area: Data Model (Driver Shifts)

| Option | Description | Selected |
|--------|-------------|----------|
| shift + shiftDate fields on Driver | Add 2 new fields to Driver model: shift (MORNING/AFTERNOON/NIGHT) + shiftDate. Simple, but only stores one scheduled day per driver and cannot support a weekly grid. | superseded |
| New DriverShift model | New DriverShift model: links driver+date+shift. Supports one assignment per driver per date and preserves weekly schedule data. | ✓ |
| Infer from Order driverId | Use existing Order assignments to derive shift info. No new fields needed. | |

**User's choice:** New DriverShift model
**Notes:** Updated after phase review. Direct fields on Driver would overwrite prior days when editing a weekly grid, so the implementation must use a separate assignment table.

---

## Area: Driver Eligibility

| Option | Description | Selected |
|--------|-------------|----------|
| All drivers can be scheduled | All drivers visible. Admin assigns them to shifts each day. Simple and straightforward. | ✓ |
| Only active drivers | Only drivers with isActive=true can be assigned to shifts. | |
| Active + scheduled status | Drivers with 'SCHEDULED' status can be assigned. | |

**User's choice:** All drivers can be scheduled
**Notes:** isActive is for "can receive orders", not "can be scheduled". Admin decides.

---

## Area: Staff Tracking

| Option | Description | Selected |
|--------|-------------|----------|
| Track via existing assignerId on Order | Orders already track assignerId. Dashboard shows who entered each order each day. | ✓ |
| New StaffShiftLog model | Admin assigns staff to a 'shift log' entry each morning: Staff A = Morning, Staff B = Afternoon. | |
| Manual/mental accounting only | No new data model. Staff scheduling is 'mental accounting'. | |

**User's choice:** Track via existing assignerId on Order
**Notes:** No new model needed. Staff scheduling is inherently dynamic via order assignment.

---

## Deferred Ideas

- Vehicle scheduling — Phase 2+ backlog
- Staff timekeeping/payroll — Phase 2+ backlog
- Driver GPS tracking — not in scope (PROJECT.md out of scope)
- Custom shift time configuration — hardcoded M/A/N for now
