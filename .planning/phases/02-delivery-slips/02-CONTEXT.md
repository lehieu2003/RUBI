# Phase 2: Delivery Slips - Context

**Gathered:** 2026-04-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Office staff can print a delivery slip from any order with one click. Slip shows customer name, address, products, quantities, total. Includes signature line for customer acknowledgment. Prints correctly on A5 paper.

This phase delivers: print button on order detail page + A5-formatted delivery slip template + browser print integration.

</domain>

<decisions>
## Implementation Decisions

### Print Method
- **D-01:** Browser print dialog — `window.print()` + CSS `@media print`. No print library needed.

### Print Layout
- **D-02:** A5 fixed layout — Single A5 format (148 x 210mm). CSS @media print with A5 page size.

### Print Trigger UX
- **D-03:** Print button on order detail page — Large button at top of order detail view. Primary action for printing.

### Signature Handling
- **D-04:** Print format only — Slip includes printed line "Chữ ký khách hàng: _____________" for physical signature on paper after delivery.

### Additional API Decisions (from user request)
- **D-05:** Order status update API — Add PATCH `/api/orders/[id]/status` to update order status (DRAFT → CONFIRMED → PRINTED → DELIVERED)
- **D-06:** Order list API — Add GET `/api/orders` with filters (customer, date, status) for fetching orders to print

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Documents
- `.planning/PROJECT.md` — Core constraint: Speed over everything, print reliability critical for office workflow
- `.planning/REQUIREMENTS.md` — Phase 2 requirements: DLVR-01, DLVR-02, DLVR-03, DLVR-04
- `.planning/ROADMAP.md` — Phase 2 goal: "Printed delivery slips (A5 or thermal) with customer signature line"
- `.planning/phases/01-foundation-order-entry/01-CONTEXT.md` — Phase 1 decisions: Order status enum (PRINTED), order data model

### No external specs — requirements fully captured in decisions above

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Existing `Drawer` component from `src/components/ui/drawer.tsx` — Phase 1 drawer pattern available if needed
- Existing Zustand `order-store.ts` for order state
- Existing `Order` model with status enum: DRAFT → CONFIRMED → PRINTED → DELIVERED

### Established Patterns
- CSS @media print pattern (not yet implemented — first print feature)
- Server Actions for data mutations
- API routes for REST endpoints

### Integration Points
- Order status field already has PRINTED state (Phase 1 D-17)
- Order list page (`src/app/orders/page.tsx`) — where orders are listed
- Order detail page — needs to be created for print button placement

</code_context>

<specifics>
## Specific Ideas

1. **A5 Delivery Slip** — Company header (IceFlow logo/name), customer info block (name, address, phone), product table (name, qty, unit price, line total), total, signature line.

2. **@media print CSS** — Hide all UI except slip content when printing. Set A5 page size.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 2 scope.

</deferred>

---

*Phase: 02-delivery-slips*
*Context gathered: 2026-04-15*
