# Phase 3: Driver Delivery View - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Drivers can view their daily delivery list on phone via web-view (no app install). Office assigns orders to driver after printing. Driver sees what to deliver, confirms delivery with GPS tap, and office tracks real-time progress. Accountant confirms final completion at end of day.

This phase delivers: driver token auth, driver orders API, mobile delivery view with confirmation + GPS, admin map overview.

</domain>

<decisions>
## Implementation Decisions

### Driver Authentication
- **D-01:** URL-based token authentication — Each driver has a unique unguessable token in their URL (e.g., `/d/xK8z2m9v`). Shared via Zalo. Driver bookmarks `/d/[token]` or uses "Add to Home Screen" to treat it like an app.
- **D-02:** Token stored in localStorage after first activation. Subsequent visits to `/driver` auto-identify via stored token — no re-auth needed.
- **D-03:** No password. No device binding in v1. Security through token complexity is sufficient for internal use.

### Order Assignment Model
- **D-04:** Explicit assignment — Office explicitly assigns a driver to each order.
- **D-05:** Two timing flows:
  - **Primary (post-print):** Office prints slip → assigns driver at departure time via bulk-assign UI. This is the main flow.
  - **Secondary (at-creation):** If customer explicitly requested a specific driver (e.g., "anh Vinh"), office can assign during order entry in the Drawer.
- **D-06:** Driver visibility rule — An order appears on the driver's phone when `status = PRINTED AND driverId IS NOT NULL`.
- **D-07:** Delivery sequence — Driver decides route order themselves. Default sort by assignment time. No forced numbering.

### Driver Status Updates
- **D-08:** DELIVERED = driver confirms on phone + GPS captured. Driver taps "Đã giao" button on their phone.
- **D-09:** GPS capture — `navigator.geolocation` captures coordinates at the moment of tap. 3-5 second timeout. If GPS fails/times out, send `gps: null` and allow confirmation to proceed.
- **D-10:** GPS-null handling — Orders with `gps: null` show a warning icon on the admin/office view. Admin can remind driver to enable location next time.
- **D-11:** Driver cannot self-reverse DELIVERED. If driver marks by mistake, they must call office → administrator reverses status.
- **D-12:** Partial returns — Driver marks DELIVERED regardless of partial returns. Actual quantity adjustments handled at accountant end-of-day reconciliation (Phase 4).
- **D-13:** COMPLETED = accountant confirms at end of day when paper slip + cash + customer signature is returned.

### Data Refresh Strategy
- **D-14:** Manual pull-to-refresh + [Làm mới] button. No WebSocket/SSE.
- **D-15:** New orders after departure — Office calls driver on Zalo: "có thêm đơn, em vừa đẩy lên máy". Driver pulls to refresh.

### Driver View UI
- **D-16:** Card-based UI — Each delivery is a large card.
- **D-17:** Per-card info: STT giao hàng (#), Tên khách (bold), Địa chỉ, Số lượng sản phẩm, Tiền cần thu.
- **D-18:** Big Buttons per card: [Gọi điện] (tel: link), [Bản đồ] (Google Maps navigation), [Đã giao] (green, most prominent — bottom of card).
- **D-19:** Empty state — "Chào [Tên tài xế], hiện tại anh không có đơn hàng nào cần giao." + friendly truck illustration + [Làm mới] button.
- **D-20:** "Xem bản đồ" button — Opens overview map showing all delivery dots for that driver. Tapping a dot scrolls to and highlights that customer's card.

### Admin Map (Office View)
- **D-21:** Admin map showing all delivery points for all drivers (or filtered by driver/date).
- **D-22:** Pin colors: Orange/Cam = pending (PRINTED), Green (tick) = delivered (DELIVERED).
- **D-23:** Map updates in real-time as driver confirms deliveries.
- **D-24:** Warning icon on orders with `gps: null`.

### Database Changes
- **D-25:** New `Driver` model: `id`, `name`, `slug`, `token` (unique, unguessable), `orders` relation.
- **D-26:** Add `driverId` (FK) to `Order` model.
- **D-27:** Add `deliveryGps` field to `Order` model (nullable JSON — `{lat, lng}` or `null`).

### API Routes
- **D-28:** `GET /api/driver/orders` — Fetch orders for the authenticated driver (by token), filtered to today's date and `status = PRINTED or DELIVERED`.
- **D-29:** `PATCH /api/orders/[id]/confirm` — Update status to DELIVERED + save GPS coordinates.
- **D-30:** `PATCH /api/orders/bulk-assign` — Office bulk-assigns multiple orders to a single driver.
- **D-31:** `GET /api/orders/map` — Fetch all orders for a date with GPS data for admin map.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Documents
- `.planning/PROJECT.md` — Core constraint: Speed over everything, web-only (no native apps), dead simple for drivers
- `.planning/REQUIREMENTS.md` — Phase 3 requirements: DLVR-05, DLVR-06, DLVR-07, DLVR-08
- `.planning/ROADMAP.md` — Phase 3 goal: "Driver Delivery View", success criteria: URL access, delivery list, simple UI
- `.planning/phases/01-foundation-order-entry/01-CONTEXT.md` — Phase 1 decisions: order status enum, data models
- `.planning/phases/02-delivery-slips/02-CONTEXT.md` — Phase 2 decisions: print flow, DRAFT→CONFIRMED→PRINTED→DELIVERED→COMPLETED status chain

### Technical References
- `.planning/phases/03-driver-delivery-view/03-CONTEXT.md` (this file) — Phase 3 full decisions
- Existing `/api/orders/route.ts` — base orders API to extend with driver filters
- Existing `/api/orders/[id]/status/route.ts` — status update API to extend with GPS
- Existing `src/app/driver/page.tsx` — stub driver page with fake data to replace

### No external specs — requirements fully captured in decisions above

</canonical_refs>

<codebase>
## Existing Code Insights

### Reusable Assets
- `Drawer` component from `src/components/ui/drawer.tsx` — Phase 1 pattern for overlays
- `order-store.ts` for Zustand state management
- Existing `PrintSlip` component as reference for card layout

### Established Patterns
- CSS `@media print` from Phase 2 for print styles
- Server Actions for data mutations
- API routes for REST endpoints with Prisma
- 5-status order workflow: DRAFT → CONFIRMED → PRINTED → DELIVERED → COMPLETED

### Integration Points
- `Order` model needs `driverId` FK and `deliveryGps` JSON field
- New `Driver` model needed
- `/api/orders` route extends with `driverId` filter
- New `/api/driver/orders` route for driver-specific data
- New `/api/orders/bulk-assign` route for bulk assignment
- Office sidebar needs link to driver view (for monitoring)
- Driver page (`/driver`) needs to read token from localStorage and call driver API

</codebase>

<specifics>
## Specific Ideas

1. **Zalo-first workflow** — Office sends driver their URL via Zalo. Driver bookmarks it. This is the primary distribution channel.
2. **Add to Home Screen** — Mobile web app capable meta tags enable pseudo-app experience without app store.
3. **GPS as proof** — Geolocation at delivery confirmation serves as delivery proof for disputes.
4. **Double-check accounting** — DELIVERED (driver confirmed) vs COMPLETED (accountant reconciled) creates audit trail.
5. **Outdoor-optimized UI** — Large touch targets, high contrast, readable in sunlight, wet hands.

</specifics>

<deferred>
## Deferred Ideas

None — all discussion stayed within Phase 3 scope.

---

*Phase: 03-driver-delivery-view*
*Context gathered: 2026-04-16*
