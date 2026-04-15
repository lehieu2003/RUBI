---
status: partial
phase: "02-delivery-slips"
source: [02-01-SUMMARY.md, 02-02-SUMMARY.md]
started: "2026-04-15T08:35:00.000Z"
updated: "2026-04-15T09:40:00.000Z"
---

## Current Test

[testing paused — 2 items outstanding]

## Tests

### 1. Orders list page loads orders from API
expected: Visit http://localhost:3000/orders — the orders list should load and display orders fetched from /api/orders (not hardcoded fake data). You should see order rows with customer names, products, totals, and status badges. If no orders exist in DB yet, the page should show "Không có đơn hàng nào" (empty state).
result: issue
reported: "orders loaded from API (Decimal bug fixed)"
severity: minor

### 2. Order detail page shows customer, items, total
expected: On the orders list page (/orders), click "Xem" on any order row. Instead of navigating to a new URL, an ORDER DETAIL CARD OVERLAYS the list (like a modal/drawer). The card shows: customer name, address, phone, product items with quantities and prices, total amount, and a print button.
result: issue
reported: "want overlay card instead of separate page, also print bug"
severity: major

### 3. Print delivery slip button works
expected: On the order detail page (/orders/[id]), click the "In phiếu giao hàng" button. The browser print dialog should open. In the print preview, you should see the A5-formatted delivery slip with: company header "CÔNG TY TNHH ĐÁ LẠNH ICEFLOW", title "PHIẾU GIAO HÀNG", customer name, address, phone, product table, total, and signature line "Chữ ký khách hàng: _____________".
result: pending

### 4. Order status update via API
expected: Use a tool like Postman or curl to send PATCH /api/orders/[id]/status with {"status": "CONFIRMED"} — the order's status should update in the database and subsequent GET requests should reflect the new status.
result: pending

## Summary

total: 4
passed: 0
issues: 2
pending: 2
skipped: 0

## Gaps

- truth: "Order detail displays as overlay card on orders list"
  status: failed
  reason: "User reported: want overlay card instead of separate page, also print bug"
  severity: major
  test: 2
  root_cause: "No overlay pattern implemented. 'Xem' button uses Link navigation to /orders/[id]. Drawer exists but not used for order detail. Need selectedOrderId state + OrderDetailDrawer component."
  artifacts:
    - path: "src/app/orders/page.tsx"
      issue: "Line 292-299: Xem button is Link to /orders/[id], full page navigation"
    - path: "src/app/orders/[id]/page.tsx"
      issue: "Standalone page, not an overlay"
  missing:
    - "Add selectedOrderId state to orders/page.tsx"
    - "Create OrderDetailDrawer component reusing Drawer"
    - "Change Xem button to open drawer instead of Link navigation"
  debug_session: "diagnose-session-order-overlay"

- truth: "Print button opens A5 delivery slip in browser print dialog"
  status: failed
  reason: "User reported: print bug"
  severity: major
  test: 3
  root_cause: "Timing issue: window.print() called before PrintSlip renders to DOM. 100ms setTimeout insufficient. CSS selector in @media print too narrow for nested .print-slip."
  artifacts:
    - path: "src/app/orders/[id]/page.tsx"
      issue: "Lines 64-70: handlePrint calls window.print() too soon after setShowPrintSlip(true)"
    - path: "src/app/globals.css"
      issue: "Line 8: CSS selector body > *:not(.print-slip) only matches direct children of body, but PrintSlip is nested in wrapper div"
  missing:
    - "Use requestAnimationFrame or useEffect to delay print until after render"
    - "Fix CSS selector to match nested .print-slip elements"
  debug_session: "diagnose-session-print-slip"
