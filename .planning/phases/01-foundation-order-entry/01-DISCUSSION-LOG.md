# Phase 1: Foundation & Order Entry - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-14
**Phase:** 01-foundation-order-entry
**Areas discussed:** Order entry UI pattern, Customer lookup UX, Product selection UX, Price list structure

---

## Order entry UI pattern

| Option | Description | Selected |
|--------|-------------|----------|
| Modal overlay | Popup covering screen, context visible behind | |
| Inline form | Form always visible on main page | |
| Slide-out drawer | Side panel sliding in from right | ✓ |

**User's choice:** Slide-out Drawer
**Notes:** Keeps order list visible while building an order. Slides away cleanly when done.

---

## Customer lookup UX

| Option | Description | Selected |
|--------|-------------|----------|
| Type customer code + Enter | Staff know codes by heart, typing "A001" + Enter is instant | |
| Search-as-you-type | Start typing name, list filters down. Good when customer says "Cho tôi đặt" | |
| Dropdown with recent | Show last 5-10 customers first, type to filter. Hybrid | |
| "Ultimate Search Bar" (3-in-1) | Default 10 recent + as-you-type filter (name/phone/code) + auto-single-select + Enter | ✓ |

**User's choice:** "The Ultimate Search Bar" (Search-as-you-type + Recent)
**Notes:**
- Default (empty): Show 10 most recent customers. Click or arrow keys to select. Zero typing for repeat orders.
- As-you-type: Filter simultaneously by 3 fields — name (fuzzy), phone (last 3-4 digits, fastest since phone is unique), customer code.
- Auto-select: If only 1 result, Enter automatically selects + moves focus to quantity input field.
- Enter key confirms selection.

---

## Product selection UX

| Option | Description | Selected |
|--------|-------------|----------|
| Grid/buttons | Each product is a button. Click to add. | |
| Type-to-search | Type "5" to filter all 5kg bags. Fast for users who know products. | |
| Tab + number | Tab through fields, type quantity, Enter = add to order | |
| "Order Matrix" (Grid-based fixed layout) | All 6 products displayed simultaneously. Auto-focus first field. Tab to navigate. Enter to confirm. | ✓ |

**User's choice:** "The Order Matrix" (Lưới nhập liệu cố định)
**Notes:**
- Grid layout: rows = ice types (Đá Bi, Đá Viên), columns = bag sizes (5kg, 10kg, 20kg). Total 6 cells.
- Auto-focus: When customer selected, cursor jumps to quantity field of first product (Đá Bi 5kg).
- Tab key navigates between quantity fields. Leave blank if not ordering.
- Enter key confirms order and triggers print.
- "Because product catalog doesn't change frequently, instead of searching, lay out all bags on screen."

---

## Price list structure

| Option | Description | Selected |
|--------|-------------|----------|
| Flat discount % | Each customer has 1 % discount from base price. Simple but inflexible. | |
| Per-product prices | Each customer has individual price for every product. Most flexible but high data entry. | |
| Mixed (Global Base + Customer Override) | Default prices for all products, with per-customer override table. Inheritance logic: override first, fallback to base. | ✓ |

**User's choice:** "Mixed" (Global Base + Customer Override)
**Notes:**
- Global Base Price: Standard price for 6 products. Applied to new customers or those without individual agreements.
- Customer Override Table: Per-customer table with product-specific prices. Only enter prices that differ from default.
- Inheritance Logic: System checks override first. If override is empty for a product, falls back to global base price.
- Why optimal:
  1. Flexible: Wholesalers negotiate per-product ("give me lower price on 20kg blocks, other products at market rate"). Only enter exceptions.
  2. Time-saving: Don't need to enter 6 prices for hundreds of customers. Only enter differences.
  3. Easy adjustment: When electricity prices increase, change base price once. All customers without override automatically get new price.

---

## Claude's Discretion

No areas deferred to Claude — user had clear preferences for all 4 areas.

## Deferred Ideas

None.