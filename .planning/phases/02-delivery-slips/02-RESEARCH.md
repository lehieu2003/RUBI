# Phase 2: Delivery Slips - Research

**Researched:** 2026-04-15
**Domain:** Browser print integration, A5 print layout, order status management
**Confidence:** HIGH

## Summary

Phase 2 delivers printed delivery slips (A5 format) with customer signature lines. The approach uses browser print dialog (`window.print()` + CSS `@media print`) — no print library needed. Office staff click "Print" on an order detail page, the browser print dialog opens, and the slip is formatted for A5 paper.

**Primary recommendation:** Implement order detail page with print button, render slip content in-page with CSS `@media print` hiding all non-slip UI, use A5 page size via `@page` CSS rule.

## User Constraints (from CONTEXT.md)

### Locked Decisions

| ID | Decision | Source |
|----|-----------|--------|
| D-01 | Browser print dialog — `window.print()` + CSS `@media print`. No print library. | Phase 2 discussion |
| D-02 | A5 fixed layout — Single A5 format (148 x 210mm). CSS @media print with A5 page size. | Phase 2 discussion |
| D-03 | Print button on order detail page — Large button at top of order detail view. | Phase 2 discussion |
| D-04 | Print format only — Slip includes printed line "Chữ ký khách hàng: _____________" for physical signature on paper. | Phase 2 discussion |
| D-05 | Order status update API — Add PATCH `/api/orders/[id]/status` to update order status (DRAFT → CONFIRMED → PRINTED → DELIVERED). | Phase 2 discussion |
| D-06 | Order list API — Add GET `/api/orders` with filters (customer, date, status). | Phase 2 discussion |

### Claude's Discretion

- Implementation details for print CSS (margins, font sizes, layout specifics)
- Slip content layout (exact positioning of fields)
- API response format and filtering options

### Deferred Ideas

None — discussion stayed within Phase 2 scope.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DLVR-01 | Office staff can print a delivery slip from any order with one click | Print button + `window.print()` approach |
| DLVR-02 | Printed slip shows customer name, address, products, quantities, and total | Order data model has all required fields |
| DLVR-03 | Printed slip includes a signature line for customer acknowledgment | Print CSS includes signature line element |
| DLVR-04 | Slip prints correctly on A5 paper and thermal printers (80mm) | A5 `@page` size CSS, 80mm fallback |

## Standard Stack

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| None | — | Print library | Browser print is sufficient per D-01 |
| CSS @media print | native | Print formatting | Standard browser CSS, no dependency |
| CSS @page | native | A5 page sizing | Standard CSS Paged Media |

**No additional npm packages required.** Browser print approach uses only CSS.

## Architecture Patterns

### Recommended Project Structure

```
src/app/
├── orders/
│   ├── page.tsx              # Order list (existing, add print action)
│   └── [id]/
│       └── page.tsx          # Order detail page (NEW - print button + slip)
├── api/
│   └── orders/
│       ├── route.ts          # GET orders with filters (D-06)
│       └── [id]/
│           └── status/
│               └── route.ts  # PATCH order status (D-05)
├── components/
│   └── order/
│       ├── print-slip.tsx    # Delivery slip component (rendered on detail page)
│       └── order-detail.tsx  # Order detail view with print button
```

### Pattern 1: Browser Print with CSS @media print

**What:** `window.print()` triggers browser print dialog, CSS hides non-print UI and formats slip for A5.

**When to use:** Delivery slip printing when no complex print library is needed.

**Implementation:**
```tsx
// src/components/order/print-slip.tsx
'use client';

interface PrintSlipProps {
  order: {
    id: string;
    code: string;
    customer: { name: string; address: string; phone: string };
    orderItems: Array<{
      product: { name: string; sizeKg: number };
      quantity: number;
      unitPrice: number;
      lineTotal: number;
    }>;
    total: number;
    createdAt: string;
  };
}

export function PrintSlip({ order }: PrintSlipProps) {
  return (
    <div className="print-slip">
      {/* Company header */}
      <div className="text-center font-bold text-base mb-2">
        CÔNG TY TNHH ĐÁ LẠNH ICEFLOW
      </div>
      <div className="text-center text-xs text-gray-500 mb-4">
        123 Đường ABC, Quận XYZ, TP.HCM | Tel: 0909 123 456
      </div>

      {/* Slip title */}
      <div className="text-center font-bold text-sm mb-3 border-t border-b border-black py-1">
        PHIẾU GIAO HÀNG
      </div>

      {/* Order info */}
      <div className="text-xs mb-2">
        <div><strong>Mã đơn:</strong> {order.code}</div>
        <div><strong>Ngày:</strong> {order.createdAt}</div>
      </div>

      {/* Customer info */}
      <div className="text-xs mb-3 border border-dashed border-gray-400 p-2 rounded">
        <div><strong>Khách hàng:</strong> {order.customer.name}</div>
        <div><strong>Địa chỉ:</strong> {order.customer.address}</div>
        <div><strong>Điện thoại:</strong> {order.customer.phone}</div>
      </div>

      {/* Products table */}
      <table className="w-full text-xs mb-3 border-collapse">
        <thead>
          <tr className="border-b border-black">
            <th className="text-left py-1">Sản phẩm</th>
            <th className="text-center py-1">SL</th>
            <th className="text-right py-1">Đơn giá</th>
            <th className="text-right py-1">Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          {order.orderItems.map((item, i) => (
            <tr key={i} className="border-b border-dashed border-gray-300">
              <td className="py-1">{item.product.name} {item.product.sizeKg}kg</td>
              <td className="text-center py-1">{item.quantity}</td>
              <td className="text-right py-1">{item.unitPrice.toLocaleString('vi-VN')}đ</td>
              <td className="text-right py-1">{item.lineTotal.toLocaleString('vi-VN')}đ</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Total */}
      <div className="flex justify-between font-bold text-sm mb-4 border-t border-b border-black py-1">
        <span>TỔNG CỘNG:</span>
        <span>{order.total.toLocaleString('vi-VN')}đ</span>
      </div>

      {/* Signature line */}
      <div className="flex justify-between text-xs mt-6">
        <div className="text-center">
          <div>Người giao hàng</div>
          <div className="h-8"></div>
          <div>(Ký và ghi rõ họ tên)</div>
        </div>
        <div className="text-center">
          <div>Khách hàng xác nhận</div>
          <div className="h-8 border-b border-black"></div>
          <div>(Ký và ghi rõ họ tên)</div>
        </div>
      </div>
    </div>
  );
}
```

### Pattern 2: Print CSS (@media print + @page)

**What:** CSS rules that hide non-print content and set A5 page size when printing.

**When to use:** Any browser print scenario requiring specific paper size and clean output.

```css
/* src/app/globals.css - add print styles */

@media print {
  /* Hide everything except the main content area */
  body > *:not(main):not(.print-slip) {
    display: none !important;
  }

  /* Remove background colors to save ink */
  * {
    background-color: white !important;
    color: black !important;
  }

  /* A5 page size (148 x 210mm) */
  @page {
    size: 148mm 210mm;
    margin: 10mm;
  }

  /* Print slip container */
  .print-slip {
    width: 100%;
    padding: 0;
    margin: 0;
    font-family: 'Times New Roman', serif;
    font-size: 11pt;
    line-height: 1.4;
  }

  /* Ensure table borders print */
  table {
    border-collapse: collapse;
  }

  /* Remove shadows */
  .shadow-lg, .shadow-xl, .shadow-md {
    box-shadow: none !important;
  }
}
```

**Important notes for thermal printers (80mm):**
- A5 is 148mm wide; thermal printers are typically 80mm
- Per D-02 decision, A5 is the primary format
- Thermal printer support requires CSS to be adjusted or printer configured for 80mm roll
- The `@page` size rule cannot dynamically switch based on printer selection — user must choose correct paper in print dialog

### Pattern 3: Order Detail Page with Print Button

**What:** A dedicated page showing full order details with a prominent print button.

**When to use:** When staff need to print individual orders and see complete order information.

**Implementation:**
```tsx
// src/app/orders/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { PrintSlip } from '@/components/order/print-slip';
import { Printer } from 'lucide-react';

export default function OrderDetailPage() {
  const params = useParams();
  const [order, setOrder] = useState(null);
  const [showPrintContent, setShowPrintContent] = useState(false);

  useEffect(() => {
    // Fetch order from API
    fetch(`/api/orders/${params.id}`)
      .then(res => res.json())
      .then(setOrder);
  }, [params.id]);

  const handlePrint = () => {
    setShowPrintContent(true);
    window.print();
  };

  if (!order) return <div>Loading...</div>;

  return (
    <>
      {/* Normal page content - hidden when printing */}
      <div className="print:hidden p-6">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
        >
          <Printer className="h-5 w-5" />
          In phiếu giao hàng
        </button>

        {/* Order details displayed on screen */}
        <div className="mt-6">
          {/* Order information for screen view */}
        </div>
      </div>

      {/* Print-only content - hidden on screen */}
      {showPrintContent && (
        <div className="hidden print:block">
          <PrintSlip order={order} />
        </div>
      )}
    </>
  );
}
```

### Pattern 4: Order Status Update API (PATCH)

**What:** REST endpoint to update order status through the workflow (DRAFT → CONFIRMED → PRINTED → DELIVERED).

```typescript
// src/app/api/orders/[id]/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const StatusSchema = z.object({
  status: z.enum(['DRAFT', 'CONFIRMED', 'PRINTED', 'DELIVERED']),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = StatusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const order = await prisma.order.update({
      where: { id },
      data: { status: parsed.data.status },
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error('[PATCH /orders/[id]/status]', error);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}
```

### Pattern 5: Order List API with Filters (GET)

**What:** REST endpoint returning orders with optional filters for customer, date, and status (D-06).

```typescript
// src/app/api/orders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get('customerId');
  const status = searchParams.get('status');
  const date = searchParams.get('date');

  const where: Record<string, unknown> = {};

  if (customerId) where.customerId = customerId;
  if (status) where.status = status;
  if (date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    where.createdAt = { gte: startOfDay, lte: endOfDay };
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      customer: true,
      orderItems: { include: { product: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(orders);
}
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Print formatting | Custom PDF generation library | CSS @media print | Browser handles print dialog; PDF library adds complexity and server-side rendering needs |
| A5 page sizing | JavaScript page size detection | CSS @page rule | CSS @page is the standard way to specify paper size |
| Print hiding UI | JavaScript DOM manipulation before print | CSS @media print selector | CSS handles visibility cleanly without JS |

**Key insight:** Browser print is the right tool here. Adding a library like `react-to-print` or `jspdf` would increase bundle size and complexity for functionality that CSS handles natively.

## Common Pitfalls

### Pitfall 1: Print CSS Not Triggering Correctly

**What goes wrong:** `@media print` styles not applying, or hiding wrong elements.

**Why it happens:** CSS selector specificity issues, or elements outside main content area not being targeted.

**How to avoid:**
- Use `body > *:not(.print-slip)` to target everything except print content
- Test print preview in Chrome DevTools (`Ctrl+P` preview)
- Ensure print-slip class is directly on the slip container, not wrapped in multiple divs

**Warning signs:** Print preview shows blank page or wrong layout.

### Pitfall 2: A5 Page Size Not Matching Printer Setup

**What goes wrong:** Slip prints but doesn't fit A5 paper or thermal roll.

**Why it happens:** User selects wrong paper size in print dialog, or CSS @page size overridden by printer driver.

**How to avoid:**
- Document the print workflow: "Select A5 paper in print dialog"
- The CSS @page rule sets the intended size, but printer settings can override it
- For thermal printers (80mm), the printer's roll paper setting must match

**Warning signs:** Margins too large, content cut off, or slip too small.

### Pitfall 3: Print Button Showing in Print Output

**What goes wrong:** Print button, navigation, and other UI elements appear in printed slip.

**Why it happens:** `display: none` in @media print not working due to Tailwind purging or specificity.

**How to avoid:**
- Explicitly add `.print\:hidden` classes or global print styles
- Use `!important` in print CSS to override inline styles
- Verify print preview before final implementation

### Pitfall 4: Print Content Not Visible on Screen But Not in Print

**What goes wrong:** Slip content shows in print preview but not printed (white page).

**Why it happens:** Print content is hidden with `display: none` and CSS print rules not overriding it.

**How to avoid:**
- Use a conditional approach: show content when `showPrintContent` state is true
- In print media, reveal the content; in screen media, hide it
- Test both on-screen preview and actual print

## Code Examples

### Print Button Component

```tsx
// src/components/order/print-button.tsx
'use client';

import { Printer } from 'lucide-react';

interface PrintButtonProps {
  onClick: () => void;
}

export function PrintButton({ onClick }: PrintButtonProps) {
  return (
    <button
      onClick={onClick}
      className="print:hidden flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold text-base hover:bg-blue-700 transition-colors shadow-lg"
    >
      <Printer className="h-5 w-5" />
      In phiếu giao hàng
    </button>
  );
}
```

### Print Media Query (complete)

```css
/* src/app/globals.css - print styles */

@media print {
  /* Hide everything except print content */
  body > *:not(.print-slip) {
    display: none !important;
  }

  /* Remove decorative backgrounds */
  * {
    background-color: white !important;
    color: black !important;
    box-shadow: none !important;
  }

  /* A5 page setup */
  @page {
    size: 148mm 210mm;
    margin: 8mm;
  }

  /* Print slip styling */
  .print-slip {
    width: 100%;
    margin: 0;
    padding: 0;
    font-family: 'Times New Roman', 'Segoe UI', sans-serif;
    font-size: 11pt;
    line-height: 1.4;
  }

  /* Ensure proper table borders */
  table {
    border-collapse: collapse;
    width: 100%;
  }

  table th, table td {
    border: 1px solid #000;
    padding: 4pt 6pt;
  }

  /* Signature line styling */
  .signature-line {
    border-bottom: 1px solid #000;
    height: 24pt;
    margin-top: 36pt;
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| PDF generation libraries | CSS @media print | Always available | Simpler, no server dependency |
| Server-side PDF rendering | Browser print | Always available | No backend needed for slip generation |
| Fixed-width thermal only | A5 with CSS @page | D-02 decision | Supports both A5 and thermal via paper selection |

**No recent developments** in browser print — it's a stable, well-supported standard.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | CSS `@page` rule is supported in target Chrome browser | Pattern 2 | Low — Chrome has supported @page for years |
| A2 | Order data model has all fields needed for slip | Standard Stack | Low — Phase 1 schema includes customer, orderItems, total |
| A3 | Print button triggers print dialog without library | Pattern 3 | Low — `window.print()` is standard browser API |

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed.

## Open Questions

1. **Should the print button also update order status to PRINTED?**
   - What we know: D-03 specifies print button on detail page. D-05 specifies status update API.
   - What's unclear: Does printing automatically transition DRAFT → CONFIRMED → PRINTED, or is status update a separate action?
   - Recommendation: Print should transition status (DRAFT → PRINTED or CONFIRMED → PRINTED). The API is available via D-05.

2. **Should the print content always be present in the DOM or conditionally rendered?**
   - What we know: Two approaches — always render with `display: none` + CSS print reveal, or render on-demand when print is triggered.
   - What's unclear: Performance vs. simplicity tradeoff.
   - Recommendation: Use on-demand rendering (show only when printing) to avoid unnecessary DOM elements.

3. **Should thermal printer (80mm) be supported as an alternative to A5?**
   - What we know: D-02 locks A5 as the standard format.
   - What's unclear: DLVR-04 mentions thermal printers (80mm) as a requirement.
   - Recommendation: Support A5 as primary. Thermal 80mm can be an alternative @page size if needed, but requires different CSS.

## Environment Availability

Step 2.6: SKIPPED (no external dependencies identified — browser print uses only CSS and standard browser APIs).

## Sources

### Primary (HIGH confidence)
- [MDN Web Docs - @media print](https://developer.mozilla.org/en-US/docs/Web/CSS/@mediaprint) — CSS print media query documentation
- [MDN Web Docs - @page](https://developer.mozilla.org/en-US/docs/Web/CSS/@page) — CSS paged media @page rule
- [Phase 1 Context](./01-CONTEXT.md) — Order model, status enum, existing patterns

### Secondary (MEDIUM confidence)
- [Chrome DevTools Print Preview](https://developer.chrome.com/docs/devtools/css/print-preview) — Print preview debugging

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Browser print is well-established, no libraries needed
- Architecture: HIGH — CSS @media print + @page is standard approach
- Pitfalls: MEDIUM — Based on common print CSS issues, not verified in this codebase yet

**Research date:** 2026-04-15
**Valid until:** ~90 days (print CSS is stable, no updates expected)