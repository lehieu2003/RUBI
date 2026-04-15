# 02-GAP-CLOSURE: Phase 02 Delivery Slips — Gap Closure

## Context

Phase 02 UAT completed with 3 major issues:
- **Print delivery slip broken** (test 3): "không hiển thị gì trên tờ giấy, empty tờ giấy" — print dialog opens but paper is blank
- **Order detail overlay partially done** (test 2): Drawer exists but the "Xem" button still uses `<a href="/orders/[id]">` full-page navigation instead of opening the drawer
- **Order status UI missing** (test 5): No UI to update order status; user described full 5-status workflow

## Root Cause Analysis

### Print Bug — Deep Dive

The print mechanism has a **structural CSS flaw**. The current CSS in `globals.css`:

```css
body *:not(.print-slip) { display: none !important; }
```

This selector hides any element that is NOT `.print-slip`. The problem: `.print-slip` is a **grandchild** of `<body>`, nested inside:

```
body
└── div (orders page wrapper)
    └── (Drawer component renders at root level)
        └── div class="print-slip"   <-- target
            └── PrintSlip component
```

The selector `body *` only matches **direct children** of body. The intermediate `<div>` (Drawer wrapper) is NOT `.print-slip`, so it gets hidden. When an ancestor is hidden with `display: none`, all descendants become invisible — including `.print-slip` itself — even though `.print-slip` theoretically matches the selector.

**Fix**: Change CSS selector to properly exclude `.print-slip` AND all its descendants:
```css
body *:not(.print-slip):not(.print-slip *) { display: none !important; }
```

This ensures:
1. `.print-slip` itself is NOT hidden
2. All children/descendants of `.print-slip` are NOT hidden
3. All other elements (ancestors of `.print-slip` and unrelated siblings) ARE hidden

The double `requestAnimationFrame` timing approach is correct and should be preserved.

### Order Detail Overlay — Partial Implementation

The `Drawer` component and `selectedOrderId` state exist, but the "Xem" button in the table row still uses:
```tsx
<a href={`/orders/${selectedOrder.id}`} className="...">
  <Printer className="h-3.5 w-3.5" />
  Xem
</a>
```

This triggers full-page navigation instead of setting `selectedOrderId`. The "Xem chi tiết" link inside the drawer also still points to the old page.

### Order Status — Wrong Enum

Current `OrderStatus` enum (in schema.prisma) has only 4 values: `DRAFT, CONFIRMED, PRINTED, DELIVERED`. The user needs 5 statuses with specific semantics:

| Status | Color | Semantics | System Actions |
|--------|-------|-----------|----------------|
| PENDING | Gray | Order entered, shown to driver. No inventory deducted, no debt added. | — |
| SHIPPING | Amber | Driver confirmed loaded, en route. Optional temporary inventory hold. | — |
| DELIVERED_UNSETTLED | Blue | Driver reports delivery done, awaiting signed slip return. | — |
| COMPLETED | Green | Accountant confirmed with signed slip. Official inventory deduction, customer debt updated, revenue recorded, shell deposits updated. | Inventory deduct, debt add, revenue record, shell deposit update |
| CANCELLED | Red | Customer cancelled or out of stock. Requires cancellation reason. Releases any reserved inventory. | Release inventory hold, clear debt |

The API route also needs to accept the new statuses and handle the system actions.

---

## Gap Closure Tasks

### Task 1: Fix Print CSS Selector
**File**: `src/app/globals.css`

Change line 8 from:
```css
body *:not(.print-slip) {
```
to:
```css
body *:not(.print-slip):not(.print-slip *) {
```

Also add explicit display reset for `.print-slip` before the nested rule:
```css
.print-slip {
  display: block !important;
}
.print-slip * {
  display: block !important;
}
```

### Task 2: Fix "Xem" Button to Open Drawer Instead of Navigation
**File**: `src/app/orders/page.tsx`

On line 338-344, change:
```tsx
<button
  onClick={() => setSelectedOrderId(order.id)}
  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-700/50 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-600 hover:text-white transition-all"
>
  <Printer className="h-3.5 w-3.5" />
  Xem
</button>
```

Also fix the "Xem chi tiết" link on line 440-446 to remove the `<a>` tag and use a button that just closes the drawer (or does nothing since it's already in the drawer).

### Task 3: Add 5-Status Enum to Prisma Schema
**File**: `prisma/schema.prisma`

Change the `OrderStatus` enum from:
```prisma
enum OrderStatus {
  DRAFT
  CONFIRMED
  PRINTED
  DELIVERED
}
```

To:
```prisma
enum OrderStatus {
  PENDING      // Chờ giao — Gray
  SHIPPING     // Đang giao — Amber
  DELIVERED    // Đã giao - chờ đối soát — Blue (renamed from old DELIVERED)
  COMPLETED    // Hoàn thành — Green
  CANCELLED    // Đã hủy — Red
}
```

Note: We remove DRAFT, CONFIRMED, PRINTED and replace with PENDING, SHIPPING, DELIVERED (new semantics), COMPLETED, CANCELLED. This aligns with the user's described workflow.

**Migration needed**: `npx prisma migrate dev --name update_order_status_enum_5_values`

### Task 4: Update PATCH API to Accept 5-Status Schema
**File**: `src/app/api/orders/[id]/status/route.ts`

Change `StatusSchema` to:
```ts
const StatusSchema = z.object({
  status: z.enum(['PENDING', 'SHIPPING', 'DELIVERED', 'COMPLETED', 'CANCELLED']),
  cancellationReason: z.string().optional(), // Required when CANCELLED
});
```

Also update the error message and add handling for the new statuses.

### Task 5: Add Order Status Update UI in Drawer
**File**: `src/app/orders/page.tsx`

Inside the Drawer, after the status badge, add a status change control. Use a dropdown or button group showing all 5 statuses with their respective colors. On change, call `PATCH /api/orders/[id]/status`.

The status badge at line 370-373 currently shows the current status but is not interactive. Make it a `<select>` or button group that allows changing.

Also display a confirmation dialog when status transitions to COMPLETED (accountant needs to confirm actual quantities were received, system will deduct inventory and add debt). For CANCELLED, require a cancellation reason input.

### Task 6: Update Status Display in Orders Table Filters
**File**: `src/app/orders/page.tsx`

The quick filter buttons at lines 201-250 currently reference `DRAFT`, `CONFIRMED`, `PRINTED`, `DELIVERED`. Update to the new 5-status names with matching colors:
- PENDING → Gray badge "Chờ giao"
- SHIPPING → Amber badge "Đang giao"
- DELIVERED (new) → Blue badge "Đã giao - Chờ đối soát"
- COMPLETED → Green badge "Hoàn thành"
- CANCELLED → Red badge "Đã hủy"

Update `statusConfig` object and the `counts` filter logic accordingly.

---

## Implementation Order

1. **CSS fix** (Task 1) — quickest, highest impact, no risk
2. **Fix "Xem" button** (Task 2) — simple one-line change
3. **Update Prisma schema** (Task 3) — requires DB migration, do before API changes
4. **Update API route** (Task 4) — depends on schema migration
5. **Update orders page status config** (Task 6) — depends on API readiness
6. **Add status change UI in Drawer** (Task 5) — final polish, most complex

---

## Verification

After implementation, run UAT checks:
1. Print a delivery slip — paper should show company header, customer info, product table, total, signature lines
2. Click "Xem" on any order row — drawer should open as overlay, not navigate to new page
3. Change order status via the drawer dropdown — status should update in DB and reflect in UI immediately
4. All 5 status filters in the orders list should show correct counts with correct colors