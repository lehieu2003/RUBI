# Phase 1: Foundation & Order Entry - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Office staff enter wholesale orders on phone calls. Fast (< 30 seconds per order). Per-customer pricing. Printed delivery slips.

This phase delivers: customer lookup + order entry UI + per-customer price list management.

</domain>

<decisions>
## Implementation Decisions

### Order Entry UI Pattern
- **D-01:** Slide-out Drawer — overlay form that slides in from right. Keeps order list visible behind it. Slides away cleanly when order is saved/printed.

### Customer Lookup UX — "Ultimate Search Bar"
- **D-02:** 3-in-1 smart search bar with 3 states:
  1. **Default (empty):** Show 10 most recent customers. Click or arrow keys to select. Zero typing for repeat orders.
  2. **As-you-type:** Filter simultaneously by 3 fields — name (fuzzy), phone (last 3-4 digits, fastest since phone is unique), customer code.
  3. **Auto-select:** If only 1 result, Enter automatically selects + moves focus to quantity input field.
- **D-03:** Enter key confirms selection. No additional click needed.

### Product Selection UX — "Order Matrix"
- **D-04:** Grid-based fixed layout — all 6 products displayed simultaneously (Đá Bi 5/10/20kg, Đá Viên 5/10/20kg). No search required.
- **D-05:** Auto-focus: When customer is selected, cursor jumps to quantity field of first product (Đá Bi 5kg).
- **D-06:** Tab key navigates between quantity fields. Leave blank if customer doesn't want that product.
- **D-07:** Enter key confirms order and triggers print.

### Price List Structure — "Mixed" (Global Base + Customer Override)
- **D-08:** **Global Base Price** — Standard price for all 6 products. Applied to new customers or those without individual agreements.
- **D-09:** **Customer Override Table** — Per-customer table with product-specific prices. Only enter prices that differ from default.
- **D-10:** **Inheritance Logic** — System checks override first. If override is empty for a product, falls back to global base price.
- **D-11:** **Why this works:** Wholesalers negotiate per-product ("give me a lower price on 20kg blocks, other products at market rate"). Only enter exceptions, not full price lists for hundreds of customers.
- **D-12:** **Price adjustment propagation:** When global base price changes, all customers without override automatically get the new price.

### Order Matrix Layout
- **D-13:** Layout: Rows = ice types (Đá Bi, Đá Viên), Columns = bag sizes (5kg, 10kg, 20kg). Total 6 cells.
- **D-14:** Each cell shows: Product name + size label, quantity input field, unit price (from customer's price list), line total.

### Data Model Scope (Phase 1)
- **D-15:** Products: 6 fixed SKUs (Đá Bi 5kg, Đá Bi 10kg, Đá Bi 20kg, Đá Viên 5kg, Đá Viên 10kg, Đá Viên 20kg). Configurable in system.
- **D-16:** Customers: Code, name, address, phone, price list reference (override table).
- **D-17:** Orders: Customer reference, line items (product + qty + unit price), total, status (draft/confirmed/printed/delivered).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Documents
- `.planning/PROJECT.md` — Core constraint: Speed over everything, 30-second order entry target, web-only
- `.planning/REQUIREMENTS.md` — Phase 1 requirements: ORD-01, ORD-02, ORD-03, ORD-04, CFG-01, CFG-02, CFG-03
- `.planning/ROADMAP.md` — Phase 1 goal: "Fast order entry UI with customer/product data and per-customer pricing"

### No external specs — requirements fully captured in decisions above

</canonical_refs>

<code_context>
## Existing Code Insights

### No existing codebase
This is a greenfield project. No prior code exists — researcher will need to propose patterns for:
- Component structure (drawer, search bar, order matrix grid)
- Data model (customer, product, order entities)
- State management approach

### Integration Points (for future phases)
- Phase 2 (Delivery Slips): Order must have print-trigger endpoint
- Phase 3 (Driver View): Order must expose status and delivery info
- Phase 4 (Reconciliation): Order must track actual vs ordered quantities

</code_context>

<specifics>
## Specific Ideas

1. **"Ultimate Search Bar"** — The 3-in-1 smart search described by user. Default 10 recent + as-you-type (name/phone/code) + auto-single-select + Enter confirms.

2. **"Order Matrix"** — Grid with ice types as rows and bag sizes as columns. Tab to navigate, Enter to confirm and print. Auto-focus first field on customer selection.

3. **"Mixed Pricing"** — Global base price + per-customer override with inheritance logic. Only enter exceptions, not full lists.

4. **Speed target:** < 30 seconds per order. Staff on phone = pressure. System must beat pen-and-paper speed or staff rejects it.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 1 scope.

</deferred>

---

*Phase: 01-foundation-order-entry*
*Context gathered: 2026-04-14*