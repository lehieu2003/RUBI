---
status: testing
phase: "02-delivery-slips"
source: [02-01-SUMMARY.md, 02-02-SUMMARY.md]
started: "2026-04-15T08:35:00.000Z"
updated: "2026-04-15T08:35:00.000Z"
---

## Current Test

number: 1
name: Orders list page loads orders from API
expected: |
  Visit http://localhost:3000/orders — the orders list should load and display orders
  fetched from /api/orders (not hardcoded fake data). You should see order rows with
  customer names, products, totals, and status badges. If no orders exist in DB yet,
  the page should show "Không có đơn hàng nào" (empty state).
awaiting: user response

## Tests

### 1. Orders list page loads orders from API
expected: Visit http://localhost:3000/orders — the orders list should load and display orders fetched from /api/orders (not hardcoded fake data). You should see order rows with customer names, products, totals, and status badges. If no orders exist in DB yet, the page should show "Không có đơn hàng nào" (empty state).
result: pending

### 2. Order detail page shows customer, items, total
expected: Visit http://localhost:3000/orders/[id] — the page should display the order's customer name, address, phone, the product items with quantities and prices, and the total amount. Loading state should appear while fetching.
result: pending

### 3. Print delivery slip button works
expected: On the order detail page (/orders/[id]), click the "In phiếu giao hàng" button. The browser print dialog should open. In the print preview, you should see the A5-formatted delivery slip with: company header "CÔNG TY TNHH ĐÁ LẠNH ICEFLOW", title "PHIẾU GIAO HÀNG", customer name, address, phone, product table, total, and signature line "Chữ ký khách hàng: _____________".
result: pending

### 4. Order status update via API
expected: Use a tool like Postman or curl to send PATCH /api/orders/[id]/status with {"status": "CONFIRMED"} — the order's status should update in the database and subsequent GET requests should reflect the new status.
result: pending

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0

## Gaps

[none yet]
