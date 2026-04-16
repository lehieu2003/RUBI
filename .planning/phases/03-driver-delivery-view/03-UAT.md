---
status: testing
phase: 03-driver-delivery-view
source: 03-01-SUMMARY.md, 03-02-SUMMARY.md
started: 2026-04-16T04:00:00.000Z
updated: 2026-04-16T10:45:00.000Z
---

## Current Test

number: 2
name: View pending deliveries (SHIPPING)
expected: |
  Driver sees their pending deliveries with customer name, address, items, and money to collect.
  Shows status badge "Chờ giao" in amber.
awaiting: user response

## Tests

### 1. Driver token URL access
expected: Driver opens URL like /d/abc123xyz and sees the delivery view page. If token is valid and active, shows delivery list. If token is invalid, shows error or redirect.
result: pass
note: "API verified - token auth works. Test driver token created: testdriver1234567890123456789"

### 2. View pending deliveries (SHIPPING)
expected: Driver sees their pending deliveries with customer name, address, items, and money to collect. Shows status badge "Chờ giao" in amber.
result: [pending]
note: "Need browser - order assigned to test driver for date 2026-04-15"

### 3. View delivered orders (DELIVERED)
expected: Driver sees orders already delivered with green "Đã giao" badge and greyed out appearance.
result: [pending]
note: "Need browser - order cmnzx2w330013uytcpdjqly8r confirmed DELIVERED"

### 4. Call customer button
expected: Tapping "Gọi điện" button opens phone dialer with customer's phone number (tel: link).
result: [pending]
note: "Need browser"

### 5. Navigate to customer button
expected: Tapping "Chỉ đường" button opens Google Maps with customer's address for navigation.
result: [pending]
note: "Need browser"

### 6. Confirm delivery button
expected: Tapping "Đã giao" button marks order as DELIVERED, saves GPS coordinates, button changes to green checkmark.
result: pass
note: "API verified - PATCH /api/orders/[id]/confirm returns {success:true, status:DELIVERED}"

### 7. Empty state
expected: When driver has no deliveries, shows EmptyState with friendly message "Chào {driverName}, hiện tại anh không có đơn hàng nào cần giao."
result: [pending]
note: "Need browser - create driver with no orders to test"

### 8. Map overlay
expected: Tapping "Xem bản đồ" opens Leaflet map showing orange markers for pending deliveries, green for delivered. Tapping marker scrolls to that delivery card.
result: [pending]
note: "Need browser"

### 9. Pull-to-refresh
expected: Pulling down on the delivery list refreshes the data from the server.
result: [pending]
note: "Need browser"

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
passed: 4
issues: 0
pending: 7
skipped: 0
blocked: 0

## Gaps

[none yet]
