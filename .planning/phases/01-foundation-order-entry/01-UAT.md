---
status: complete
phase: "01-foundation-order-entry"
source:
  - ".planning/phases/01-foundation-order-entry/01-01-SUMMARY.md"
  - ".planning/phases/01-foundation-order-entry/01-02-SUMMARY.md"
  - ".planning/phases/01-foundation-order-entry/01-03-SUMMARY.md"
started: "2026-04-15T00:00:00Z"
updated: "2026-04-15T00:00:00Z"
---

## Current Test

[testing complete — Phase 1 UAT verified by user]

## Tests

### 1. Cold Start Smoke Test
expected: |
  Kill any running server. Clear ephemeral state. Run `npm run dev`.
  Server boots without errors. Database seed completes.
  Visit http://localhost:3000 — app loads without error.
result: pass

### 2. Order Entry Drawer
expected: |
  Visit http://localhost:3000/orders
  Click "New Order" button — drawer slides in from the right
  Drawer has search bar at top, order matrix below, total at bottom
result: pass

### 3. Customer Search — Empty State
expected: |
  With drawer open and no input — recent customers appear (from localStorage)
  If no recent, empty state shows "Nhập mã khách hàng"
result: pass

### 4. Customer Search — Fuzzy Match
expected: |
  Type "KH001" in search bar — customer list filters or shows hint
  Press Enter — customer is selected, focus jumps to quantity field
result: pass

### 5. Order Matrix — Tab Navigation
expected: |
  After selecting customer, Tab through quantity fields (6 fields: 5/10/20kg for Đá Bi and Đá Viên)
  Tab order is logical, focus is visible on each field
result: pass

### 6. Order Matrix — Real-time Total
expected: |
  Enter quantities (e.g., 10, 5, 8) — total price updates immediately as you type
  Total reflects correct prices for selected customer's price list
result: pass

### 7. Order Save — Enter on Last Field
expected: |
  On last quantity field, press Enter — order is saved
  Drawer closes or shows success feedback
  New order appears in the orders list
result: pass

### 8. Global Prices Config Page
expected: |
  Visit http://localhost:3000/config/prices
  All 6 products listed with current global prices
  Can edit a price inline and save — price updates in database
result: pass

### 9. Customer Price Overrides
expected: |
  Visit http://localhost:3000/customers/KH001
  Customer header shows: name, code, address, phone (per CFG-03)
  Below header: price table showing effective price (override if set, else global)
  Can set a custom price for one product — it overrides global
result: pass

### 10. Price Inheritance — Override Wins
expected: |
  With KH001 having a price override on one product:
  Place an order for KH001 — order uses override price (not global)
  Remove override — order would fall back to global price
result: pass

## Summary

total: 10
passed: 10
issues: 0
pending: 0
skipped: 0

## Gaps

[none — Phase 1 verified complete by user on 2026-04-15]
