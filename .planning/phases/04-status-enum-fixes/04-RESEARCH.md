# Phase 4: Status Enum Fixes & API Hardening - Research

**Researched:** 2026-04-16
**Domain:** Next.js API route enum mismatches + Bearer token authentication
**Confidence:** HIGH

## Summary

Phase 4 addresses two distinct cross-cutting concerns: (1) status enum values in API routes and components still reference the old `DRAFT/CONFIRMED/PRINTED` schema that was replaced by `PENDING/SHIPPING/DELIVERED/COMPLETED/CANCELLED` in the Prisma schema, and (2) the `PATCH /api/orders/[id]/confirm` endpoint lacks driver token authentication. All fixes are localized to three files with a fourth component requiring status type updates.

**Primary recommendation:** Fix the status type cast in `route.ts` and update `recent-orders.tsx` statusConfig with new values. Add Bearer token auth to confirm route using the same `prisma.driver.findUnique({ where: { token } })` pattern already established in the codebase.

---

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Replace `DRAFT | CONFIRMED | PRINTED | DELIVERED` with `PENDING | SHIPPING | DELIVERED | COMPLETED | CANCELLED` matching Prisma schema
- **D-02:** Bearer token authentication — `Authorization: Bearer <token>` header
- **D-03:** Token lookup via `prisma.driver.findUnique({ where: { token } })`
- **D-04:** Order ownership check — `order.driverId` must match authenticated driver's ID
- **D-05:** 401 for invalid/missing token, 403 for valid token but wrong driver

### Claude's Discretion
- Exact Zod validation schema for Authorization header parsing
- Placement of auth check relative to body parsing
- Handling of orders with no driverId assigned

### Deferred Ideas (OUT OF SCOPE)
- Phase 1 VERIFICATION.md documentation (Phase 1 deliverable, not Phase 4 scope)

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| N/A | Phase 4 has no requirements mapped in ROADMAP — addresses v1.0 audit cross-cutting bugs |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@prisma/client` | [CITED: prisma/schema.prisma] | PostgreSQL ORM with generated types | Type-safe DB access throughout project |
| `zod` | [VERIFIED: confirmed in use via imports] | Runtime request validation | Used in all API routes for body/param validation |

### No New Dependencies
This phase uses only existing project dependencies. No new packages required.

---

## Architecture Patterns

### File-to-Fix Map

| File | Problem | Fix |
|------|---------|-----|
| `src/app/api/orders/route.ts` line 16 | Type cast uses wrong enum values | Change cast to `as 'PENDING' \| 'SHIPPING' \| 'DELIVERED' \| 'COMPLETED' \| 'CANCELLED'` |
| `src/components/dashboard/recent-orders.tsx` lines 15, 25-46 | `Order.status` type + `statusConfig` use old values | Update interface type and replace `statusConfig` entries |
| `src/app/api/orders/[id]/confirm/route.ts` | No auth — any caller can confirm | Add Bearer token auth middleware |

### Existing Driver Token Lookup Pattern (to reuse)
Source: `src/app/api/driver/orders/route.ts` lines 17-24

```typescript
// Look up driver by token
const driver = await prisma.driver.findUnique({
  where: { token },
});

if (!driver) {
  return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
}
```

### Existing Prisma Import Pattern
```typescript
import { prisma } from '@/lib/db';        // API routes
import { Prisma } from '@prisma/client';  // For Prisma.JsonNull
```

### Zod Authorization Header Parsing Pattern

**Recommended approach (Claude's discretion):**

```typescript
// Parse Authorization header — format: "Bearer <token>"
const authHeader = request.headers.get('authorization');
if (!authHeader?.startsWith('Bearer ')) {
  return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 });
}
const token = authHeader.slice(7); // Strip "Bearer " prefix
```

This avoids adding a new Zod schema for header parsing (simpler, no additional dependency). The token is a UUID so basic string presence check is sufficient.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Token authentication | Custom JWT/cookie session | `prisma.driver.findUnique({ where: { token } })` | Phase 3 already established this pattern; UUID tokens are secure enough for driver-facing API |
| Authorization header parsing | Complex Zod header schema | Simple string prefix check | Bearer token format is self-validating; token existence verified via DB lookup |

---

## Common Pitfalls

### Pitfall 1: Status Type Cast Still Failing at Runtime
**What goes wrong:** Even after fixing the type cast string literal, Prisma validates enum values at the database layer. If a stale enum value sneaks through, the query fails silently (empty results, no error).
**Why it happens:** TypeScript type casts are compile-time only. Prisma Client validates against actual DB enum at query time.
**How to avoid:** The fix is a type annotation only — the actual DB already has correct enum. No runtime risk if the cast is removed entirely (let TypeScript infer from `searchParams.get()` returning `string`).
**Warning signs:** API returns `[]` for status-filtered queries even when data exists.

### Pitfall 2: Confirm Route — Order Not Found vs. Not Authorized
**What goes wrong:** 500 error when confirming an order that does not exist (Prisma `NotFoundError`).
**Why it happens:** `prisma.order.update()` throws when record not found.
**How to avoid:** Wrap in try/catch and return 404 for `NotFoundError`, 403 for ownership failure, 401 for auth failure. Order of checks: Auth first, then ownership, then update.
**Warning signs:** Confirm API returns 500 instead of 404/403.

### Pitfall 3: GPS Null Handling — Prisma JsonNull vs JavaScript null
**What goes wrong:** Sending `gps: null` from client results in `{lat: null, lng: null}` in DB instead of SQL NULL.
**Why it happens:** JSON `null` serializes as a JSON object with null values, not as SQL NULL.
**How to avoid:** Already handled in existing confirm route (line 34): `const gpsValue = parsed.data.gps == null ? Prisma.JsonNull : parsed.data.gps;`
**Warning signs:** GPS column shows `{lat: null, lng: null}` instead of NULL in database.

---

## Code Examples

### Fix 1: API Route Status Cast (`src/app/api/orders/route.ts` line 16)

**Before:**
```typescript
if (status) where.status = status as 'DRAFT' | 'CONFIRMED' | 'PRINTED' | 'DELIVERED';
```

**After:**
```typescript
if (status) {
  // Validate against actual Prisma OrderStatus enum values
  const validStatuses = ['PENDING', 'SHIPPING', 'DELIVERED', 'COMPLETED', 'CANCELLED'];
  if (validStatuses.includes(status)) {
    where.status = status as 'PENDING' | 'SHIPPING' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED';
  }
}
```

### Fix 2: Recent Orders Status Config (`src/components/dashboard/recent-orders.tsx`)

**Before (lines 15, 25-46):**
```typescript
status: 'DRAFT' | 'CONFIRMED' | 'PRINTED' | 'DELIVERED';

const statusConfig = {
  DRAFT: { label: 'Chờ xử lý', icon: Clock, color: 'text-slate-400 bg-slate-500/20' },
  CONFIRMED: { label: 'Đã xác nhận', icon: CheckCircle2, color: 'text-blue-400 bg-blue-500/20' },
  PRINTED: { label: 'Đã in', icon: FileText, color: 'text-amber-400 bg-amber-500/20' },
  DELIVERED: { label: 'Đã giao', icon: Truck, color: 'text-emerald-400 bg-emerald-500/20' },
};
```

**After:**
```typescript
status: 'PENDING' | 'SHIPPING' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED';

const statusConfig = {
  PENDING: { label: 'Chờ giao', icon: Clock, color: 'text-slate-400 bg-slate-500/20' },
  SHIPPING: { label: 'Đang giao', icon: Truck, color: 'text-amber-400 bg-amber-500/20' },
  DELIVERED: { label: 'Đã giao', icon: Package, color: 'text-blue-400 bg-blue-500/20' },
  COMPLETED: { label: 'Hoàn thành', icon: CheckCircle2, color: 'text-emerald-400 bg-emerald-500/20' },
  CANCELLED: { label: 'Đã hủy', icon: XCircle, color: 'text-red-400 bg-red-500/20' },
};
```

Need to add `XCircle` to the lucide-react import line.

### Fix 3: Confirm Route with Bearer Token Auth (`src/app/api/orders/[id]/confirm/route.ts`)

**Before:** No auth checks.

**After (recommended structure):**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

const ConfirmSchema = z.object({
  gps: z.object({
    lat: z.number(),
    lng: z.number(),
  }).nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // --- Auth check (before body parsing) ---
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 });
    }
    const token = authHeader.slice(7);

    const driver = await prisma.driver.findUnique({
      where: { token },
    });
    if (!driver) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // --- Body parsing ---
    const body = await request.json();
    const parsed = ConfirmSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request. Required: gps { lat, lng } or gps: null' },
        { status: 400 }
      );
    }

    // --- Fetch order for ownership check ---
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    if (order.driverId !== driver.id) {
      return NextResponse.json({ error: 'Not authorized to confirm this order' }, { status: 403 });
    }

    // --- Update order ---
    const gpsValue = parsed.data.gps == null ? Prisma.JsonNull : parsed.data.gps;
    const updated = await prisma.order.update({
      where: { id },
      data: {
        status: 'DELIVERED',
        deliveryGps: gpsValue,
      },
    });

    return NextResponse.json({
      success: true,
      orderId: updated.id,
      status: updated.status,
      deliveryGps: updated.deliveryGps,
    });
  } catch (error) {
    console.error('[PATCH /api/orders/[id]/confirm]', error);
    return NextResponse.json({ error: 'Confirmation failed' }, { status: 500 });
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `DRAFT \| CONFIRMED \| PRINTED` status workflow | `PENDING \| SHIPPING \| DELIVERED \| COMPLETED \| CANANCELLED` | Phase 3/4 audit | Phase 4 fixes code that still referenced old enum |
| URL token `/d/[token]` for driver auth | Bearer token in Authorization header | Phase 4 | Confirm endpoint uses header; other driver routes use URL param |

**Deprecated/outdated:**
- None relevant to this phase.

---

## Assumptions Log

> List all claims tagged `[ASSUMED]` in this research. The planner and discuss-phase use this section to identify decisions that need user confirmation before execution.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | No other files reference `DRAFT/CONFIRMED/PRINTED` beyond the 3 known files | Common Pitfalls | If missed, those files will have type mismatches. Verified by grep — only 3 files total: `route.ts`, `recent-orders.tsx`, and seed.ts comment. |
| A2 | `src/app/orders/page.tsx` uses correct new status values | Architecture | Verified — statusConfig uses `PENDING/SHIPPING/DELIVERED/COMPLETED/CANCELLED`. |
| A3 | Order ownership check should apply to all orders (including driverId = null) | Code Examples Fix 3 | If order has no driverId, 403 is correct behavior per D-04/D-05. |

---

## Open Questions

1. **What to do with orders that have `driverId = null` when confirm is called?**
   - What we know: D-04 says "verify order.driverId matches authenticated driver ID"
   - What's unclear: Should this be 403 (not authorized) or should the API auto-assign and then confirm?
   - Recommendation: Return 403 — "Order not assigned to any driver" — since the order must be assigned before delivery.

2. **Should the auth check come before or after body parsing?**
   - What we know: Auth is independent of request body content
   - Recommendation: Auth first (fail fast, avoid parsing untrusted input unnecessarily)

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies identified — phase is pure code/config changes)

---

## Validation Architecture

> Skipped — workflow.nyquist_validation is not present in `.planning/config.json`. No test framework requirements for this phase.

---

## Sources

### Primary (HIGH confidence)
- `prisma/schema.prisma` — OrderStatus enum definition (PENDING, SHIPPING, DELIVERED, COMPLETED, CANCELLED)
- `src/app/api/driver/orders/route.ts` — Existing driver token lookup pattern (token from URL params, 401 on not found)
- `src/app/api/orders/[id]/confirm/route.ts` — Existing confirm route with GPS-null handling
- `src/app/api/orders/bulk-assign/route.ts` — Prisma import pattern and `status: 'SHIPPING'` usage

### Secondary (HIGH confidence)
- `src/components/dashboard/recent-orders.tsx` — Confirmed broken (old enum in type + statusConfig)
- `src/app/api/orders/route.ts` line 16 — Confirmed broken (wrong type cast)

### Tertiary (LOW confidence)
- None — all findings verified via direct file read.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed in codebase
- Architecture: HIGH — all patterns verified in source files
- Pitfalls: HIGH — all identified by direct code analysis

**Research date:** 2026-04-16
**Valid until:** 2026-05-16 (30 days — enum patterns are stable)
