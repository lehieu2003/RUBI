# Phase 2: Delivery Slips - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-15
**Phase:** 02-delivery-slips
**Areas discussed:** Print method, Print layout, Print trigger UX, Signature handling

---

## Print Method

| Option | Description | Selected |
|--------|-------------|----------|
| Browser print | window.print() + CSS @media print. Simple, no dependency | ✓ |
| react-to-print | Preview + dedicated trigger. More complex | |

**User's choice:** Browser print (Recommended)
**Notes:** Simple approach, no additional library needed

---

## Print Layout

| Option | Description | Selected |
|--------|-------------|----------|
| A5 only | Fixed A5 layout (148 x 210mm). Simple | ✓ |
| Thermal only | 80mm narrow format for thermal printers | |
| Single responsive | One layout that works for both, CSS scales | |

**User's choice:** A5 only (Recommended)
**Notes:** Office uses A5 as primary paper size

---

## Print Trigger UX

| Option | Description | Selected |
|--------|-------------|----------|
| Order detail page | Large button at top of order detail view | ✓ |
| Combo: List + Detail | Both places have print button | |
| Order entry drawer | Button after save in drawer for seamless flow | |

**User's choice:** Order detail page (Recommended)
**Notes:** Clear and visible after creating an order

---

## Signature Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Print format only | Printed "Chữ ký khách hàng: ___" line on slip | ✓ |
| Digital + Print | Signature pad on web + print with signature image | |

**User's choice:** Print format only (Recommended)
**Notes:** Customer signs directly on paper after delivery

---

## Additional Decisions

| Decision | Notes |
|----------|-------|
| Order status update API (PATCH /api/orders/[id]/status) | Added per user request for API completeness |
| Order list API (GET /api/orders with filters) | Added per user request for API completeness |

---

*Discussion completed: 2026-04-15*
