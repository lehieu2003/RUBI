# Phase 3: Driver Delivery View - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-16
**Phase:** 03-driver-delivery-view
**Areas discussed:** Driver authentication, Order filtering by driver, Data refresh strategy, Information density

---

## Driver Authentication

| Option | Description | Selected |
|--------|-------------|----------|
| Name-only tap | Office pre-configures phone with driver name list, tap to select | |
| 4-digit PIN | Office assigns PIN, driver types to access shared device | |
| Individual login | Full email/password per driver | |
| URL with driver code | /d/[token] shared via Zalo, bookmark to Home Screen | ✓ |

**User's choice:** URL-based token (user's proposal — very comprehensive)
**Notes:** User proposed full implementation including model changes (Driver table), token in URL, localStorage persistence, Zalo sharing, Add to Home Screen. Record as D-01, D-02, D-03.

---

## Order Filtering by Driver

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit assignment | Office assigns driver when creating order or via bulk-assign | ✓ |
| Implicit by route/date | All PRINTED orders for today belong to "the driver" | |

**User's choice:** Explicit assignment (user clarified — primary flow is post-print bulk assign)
**Notes:** User provided full spec including timing (post-print primary, at-creation secondary), visibility rule (PRINTED + driverId not null), and the bulk-assign API need. Record as D-04, D-05, D-06.

---

## Data Refresh Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Real-time (WebSocket/SSE) | Auto-update as orders are added | |
| Manual (pull-to-refresh + button) | Driver manually refreshes | ✓ |

**User's choice:** Manual pull-to-refresh + Làm mới button
**Notes:** User noted solo dev complexity of WebSocket, and that office calls via Zalo for urgent new orders anyway. Record as D-14, D-15.

---

## Information Density

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal (just address + items) | Basic info, smallest cards | |
| Standard (address + items + total) | All essential info | ✓ |
| Full (all order details) | Everything, busy cards | |

**User's choice:** Standard — STT, Tên khách (bold), Địa chỉ, Số lượng sản phẩm, Tiền cần thu
**Notes:** User provided complete card layout spec including Big Buttons (Gọi điện, Bản đồ, Đã giao). Record as D-16, D-17, D-18.

---

## Additional Decisions (from user spec)

| Decision | Detail |
|----------|--------|
| GPS capture | D-09: 3-5s timeout, null fallback |
| GPS-null handling | D-10: Warning icon on admin view |
| DELIVERED = driver confirmed + GPS | D-08 |
| COMPLETED = accountant end-of-day | D-13 |
| Driver cannot self-reverse DELIVERED | D-11 — must call office |
| Partial returns | D-12 — driver marks DELIVERED, quantity adjustments at reconciliation |
| Empty state | D-19: "Chào [Tên tài xế], hiện tại anh không có đơn hàng nào cần giao." + truck illustration + [Làm mới] |
| Admin map | D-21, D-22, D-23: Orange=pending, green=delivered, real-time updates |
| Driver map | D-20: Overview dots, tap dot → scroll to card |
| Delivery sequence | D-07: Driver decides, default sort by assignment time |
| DB: Driver model | D-25: id, name, slug, token (unique) |
| DB: Order additions | D-26: driverId FK, D-27: deliveryGps JSON |
| API: driver/orders | D-28: GET by token + today's date |
| API: /confirm | D-29: PATCH status to DELIVERED + GPS |
| API: bulk-assign | D-30: PATCH bulk orders with driverId |
| API: orders/map | D-31: GET all orders with GPS for admin map |

---

## Claude's Discretion

User provided comprehensive specifications — most decisions were explicit. No areas deferred to Claude.

## Deferred Ideas

None — discussion stayed within Phase 3 scope.
