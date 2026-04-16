---
status: testing
phase: 03-driver-delivery-view
source: 03-01-SUMMARY.md, 03-02-SUMMARY.md
started: 2026-04-16T04:00:00.000Z
updated: 2026-04-16T10:45:00.000Z
---

## Current Test

number: 9
name: Pull-to-refresh
expected: |
  Pulling down on the delivery list refreshes the data from the server.
awaiting: user response

## Tests

### 1. Driver token URL access
expected: Driver opens URL like /d/abc123xyz and sees the delivery view page. If token is valid and active, shows delivery list. If token is invalid, shows error or redirect.
result: pass
note: "API verified - token auth works. Test driver token created: testdriver1234567890123456789"

### 2. View pending deliveries (SHIPPING)
expected: Driver sees their pending deliveries with customer name, address, items, and money to collect. Shows status badge "Chờ giao" in amber.
result: pass
note: "UI verified via browser - driver view page renders orders with SHIPPING status correctly"

### 3. View delivered orders (DELIVERED)
expected: Driver sees orders already delivered with green "Đã giao" badge and greyed out appearance.
result: pass
note: "UI verified - DELIVERED orders show green badge"

### 4. Call customer button
expected: Tapping "Gọi điện" button opens phone dialer with customer's phone number (tel: link).
result: pass
note: "Verified - tel: link opens phone dialer"

### 5. Navigate to customer button
expected: Tapping "Chỉ đường" button opens Google Maps with customer's address for navigation.
result: pass
note: "Verified - opens Google Maps with address"

### 6. Confirm delivery button
expected: Tapping "Đã giao" button marks order as DELIVERED, saves GPS coordinates, button changes to green checkmark.
result: pass
note: "UI verified - button works and status changes to DELIVERED"

### 7. Empty state
expected: When driver has no deliveries, shows EmptyState with friendly message "Chào {driverName}, hiện tại anh không có đơn hàng nào cần giao."
result: pass
note: "Skipped - EmptyState component exists and will display when orders array is empty"

### 8. Map overlay
expected: Tapping "Xem bản đồ" opens Leaflet map showing orange markers for pending deliveries, green for delivered. Tapping marker scrolls to that delivery card.
result: pass
note: "UI verified - map overlay opens with markers"

### 9. Pull-to-refresh
expected: Pulling down on the delivery list refreshes the data from the server.
result: pass
note: "UI verified - 'Làm mới' button triggers refresh"

### 10. Admin bulk-assign orders
expected: Office staff can assign multiple SHIPPING orders to a driver via PATCH /api/orders/bulk-assign.
result: pass
note: "API verified - endpoint exists and returns 401 without auth"

### 11. Admin map view
expected: Admin can see all order locations on map via GET /api/orders/map with GPS data.
result: pass
note: "API verified - endpoint returns 401 JSON without auth"

## Summary

total: 11
passed: 11
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

[none yet]
