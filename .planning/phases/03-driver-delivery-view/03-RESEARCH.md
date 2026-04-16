# Phase 3: Driver Delivery View - Research

**Researched:** 2026-04-16
**Domain:** Mobile-first driver web-view with token auth, GPS confirmation, and admin map
**Confidence:** MEDIUM-HIGH

## Summary

Phase 3 enables drivers to view their daily delivery list via a mobile web URL (bookmarked or added to home screen). The driver's identity is established via a unique token in the URL path (`/d/[token]`), stored in localStorage for subsequent visits. Orders appear when `status=PRINTED` and `driverId` is assigned. Driver confirms delivery by tapping "Da giao" which captures GPS coordinates via `navigator.geolocation` with a 5-second timeout fallback to null. Office staff can bulk-assign orders to drivers and view a real-time admin map of all delivery points.

**Primary recommendation:** Use Leaflet.js with OpenStreetMap for maps (free, no API key required, works in Vietnam). Token-based auth uses nanoid for generating unguessable driver tokens. Driver page is a client component that reads token from localStorage, fetches orders from `/api/driver/orders`, and renders a card-based mobile-first UI.

## User Constraints (from CONTEXT.md)

### Locked Decisions
- URL-based token auth `/d/[token]` stored in localStorage
- Driver model: id, name, slug, token (unique, unguessable)
- Order gets driverId FK and deliveryGps JSON field
- Orders visible when status=PRINTED AND driverId IS NOT NULL
- DELIVERED = driver confirms + GPS (navigator.geolocation, 3-5s timeout, null fallback)
- GPS-null orders show warning icon to admin
- Manual pull-to-refresh + [Lam moi] button
- Card-based UI: STT, Ten khach (bold), Dia chi, San pham, Tien can thu
- Big Buttons: Goi dien, Ban do, Da giao
- Empty state: "Chao [Ten tai xe], hien tai anh khong co don hang nao can giao" + truck illustration
- Admin map: Orange=pending (PRINTED), Green=delivered (DELIVERED), real-time
- Driver map: Overview dots, tap dot scrolls to customer card
- No forced delivery sequence
- Bulk-assign API for office to assign multiple orders to driver

### Claude's Discretion
- Map library choice (Leaflet vs Google Maps)
- Specific UI component implementations
- Token generation details (nanoid vs crypto.randomUUID)
- Geolocation error handling edge cases

### Deferred Ideas (OUT OF SCOPE)
None in Phase 3 scope.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DLVR-05 | Driver can open URL on phone and see today's delivery list | Token auth pattern, driver page structure, localStorage token persistence |
| DLVR-06 | Delivery list shows customer name, address, products, quantities | Card-based UI design, order API with customer and orderItems includes |
| DLVR-07 | Delivery list updates as new orders are added (refresh-based) | Pull-to-refresh + manual refresh button, GET /api/driver/orders re-fetches |
| DLVR-08 | Interface is dead simple - suitable for drivers with minimal tech literacy | Mobile-first design, large touch targets (min 44px), high contrast, single-action buttons |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|--------|---------|--------------|
| Next.js App Router | 15+ | Page routing, server actions | Already in project |
| Prisma | current | ORM for Driver model addition | Already in project |
| Tailwind CSS | current | Styling | Already in project |
| nanoid | 5.1.9 | Driver token generation | [VERIFIED: npm registry] Generate URL-safe unique tokens |
| Leaflet | 1.9.4 | Map rendering | [VERIFIED: npm registry] Free, no API key, works in Vietnam |
| react-leaflet | latest | React wrapper for Leaflet | Standard React-Leaflet integration |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|--------|---------|-------------|
| @types/leaflet | latest | TypeScript types | When using Leaflet |
| Tailwind CSS | current | Mobile-first responsive styling | All driver-facing components |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Leaflet | Google Maps API | Google Maps requires credit card for API key; Leaflet is free with OpenStreetMap |
| nanoid | crypto.randomUUID | nanoid is URL-safe and shorter; crypto.randomUUID works but is longer |

**Installation:**
```bash
npm install nanoid leaflet react-leaflet @types/leaflet
```

## Architecture Patterns

### Recommended Project Structure
```
src/app/
├── d/
│   └── [token]/
│       └── page.tsx        # Driver delivery view - auth via token URL param
├── driver/
│   └── page.tsx           # Stub that redirects to /d/[token] or shows setup
├── api/
│   ├── driver/
│   │   └── orders/
│   │       └── route.ts   # GET orders for driver by token
│   ├── orders/
│   │   ├── [id]/
│   │   │   └── confirm/
│   │   │       └── route.ts  # PATCH confirm delivery with GPS
│   │   └── bulk-assign/
│   │       └── route.ts   # PATCH bulk assign orders to driver
│   └── orders/
│       └── map/
│           └── route.ts   # GET all orders with GPS for admin map
├── components/
│   └── driver/
│       ├── DeliveryCard.tsx   # Individual delivery card component
│       ├── DriverMap.tsx       # Leaflet map for driver overview
│       ├── AdminMap.tsx        # Leaflet map for office admin
│       └── EmptyState.tsx      # Empty delivery list state
```

### Pattern 1: Token-based Driver Auth
**What:** Driver visits `/d/[token]` where token uniquely identifies them. Token stored in localStorage for subsequent visits.
**When to use:** When drivers access via shared Zalo links without passwords.
**Implementation:**
```typescript
// app/d/[token]/page.tsx
'use client';
import { useEffect, useState } from 'react';

export default function DriverViewPage({ params }: { params: Promise<{ token: string }> }) {
  const [driverId, setDriverId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Store token in localStorage on first visit
    localStorage.setItem('driver_token', token);
    // Fetch driver ID by token
    fetch(`/api/driver/verify?token=${token}`)
      .then(r => r.json())
      .then(data => { setDriverId(data.driverId); setLoading(false); });
  }, [token]);

  if (loading) return <div>Loading...</div>;
  if (!driverId) return <div>Invalid link</div>;
  return <DriverDeliveryList driverId={driverId} />;
}
```

### Pattern 2: GPS Capture with Timeout Fallback
**What:** Capture GPS coordinates when driver confirms delivery, with 5-second timeout that allows null fallback.
**When to use:** Every delivery confirmation.
**Implementation:**
```typescript
// lib/gps.ts
export async function captureGPS(timeoutMs = 5000): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    const timer = setTimeout(() => {
      resolve(null); // Timeout - allow confirmation without GPS
    }, timeoutMs);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timer);
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        clearTimeout(timer);
        resolve(null); // Error - allow confirmation without GPS
      },
      { timeout: timeoutMs, maximumAge: 0 }
    );
  });
}
```

### Pattern 3: Bulk Order Assignment
**What:** Office assigns multiple orders to a driver in one API call.
**When to use:** Office bulk-assign flow.
**Implementation:**
```typescript
// app/api/orders/bulk-assign/route.ts
export async function PATCH(request: NextRequest) {
  const { orderIds, driverId } = await request.json();
  await prisma.order.updateMany({
    where: { id: { in: orderIds } },
    data: { driverId },
  });
  return NextResponse.json({ success: true });
}
```

### Pattern 4: Mobile-First Card Layout
**What:** Large touch targets, high contrast, single-action buttons for driver UI.
**When to use:** Driver delivery card component.
**Example:**
```tsx
// Each delivery card has:
<div className="bg-white rounded-2xl p-4 shadow">
  <h3 className="text-lg font-bold">{customerName}</h3>
  <p className="text-slate-500">{address}</p>
  <div className="flex gap-3 mt-4">
    <button className="flex-1 bg-emerald-500 text-white py-4 rounded-xl font-semibold">
      Goi dien
    </button>
    <button className="flex-1 bg-blue-500 text-white py-4 rounded-xl font-semibold">
      Ban do
    </button>
    <button className="flex-1 bg-amber-500 text-white py-4 rounded-xl font-semibold">
      Da giao
    </button>
  </div>
</div>
```

### Anti-Patterns to Avoid
- **WebSocket/SSE for real-time:** Decision D-14 explicitly uses manual pull-to-refresh. Do not add WebSocket infrastructure.
- **Password auth for drivers:** Decision D-03 says no password, no device binding. Token complexity is sufficient.
- **Native app:** Project constraint says web-only, no native apps.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Token generation | Random string builders | nanoid | URL-safe, unguessable, proven |
| Map rendering | Google Maps API | Leaflet + OpenStreetMap | No API key required, free, works in Vietnam |
| GPS capture | Custom timeout logic | navigator.geolocation with Promise wrapper | Standard API, timeout is native parameter |

## Common Pitfalls

### Pitfall 1: localStorage Token Persistence on Shared Devices
**What goes wrong:** If driver shares their link with another driver, both see the same orders.
**Why it happens:** localStorage is shared across the same browser/device. Decision D-03 accepts no device binding.
**How to avoid:** Acknowledge this is accepted risk for v1. Token is the primary auth, localStorage is convenience only.

### Pitfall 2: GPS Timeout Blocks Delivery Confirmation
**What goes wrong:** Driver cannot confirm delivery if GPS times out and they don't know what to do.
**Why it happens:** Decision D-09 says GPS-null is allowed but UI might not make this clear.
**How to avoid:** Confirmation button always works. If GPS fails, show brief toast "Khong lay duoc GPS, van chap nhan xac nhan" and allow confirmation to proceed.

### Pitfall 3: Order Visibility After Print
**What goes wrong:** Order doesn't appear on driver phone even though driver was assigned.
**Why it happens:** Order must be PRINTED status AND have driverId assigned. If office assigns driver before printing, order won't show (or after printing but status stays CONFIRMED).
**How to avoid:** Clear UI in office shows assignment status. Driver refreshes and sees orders with PRINTED status.

### Pitfall 4: Map Tiles Don't Load in Vietnam
**What goes wrong:** OpenStreetMap tiles may be slow or missing for Vietnamese addresses.
**Why it happens:** OSM coverage in Vietnam is good but not perfect. Some rural addresses may not have detailed map data.
**How to avoid:** Use Leaflet with multiple tile providers. Primary: OpenStreetMap. Fallback: CartoDB or Google Maps (with API key fallback).

## Code Examples

### Driver Orders API
```typescript
// GET /api/driver/orders
// Returns orders where status is PRINTED or DELIVERED and driverId matches
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const date = searchParams.get('date'); // YYYY-MM-DD, defaults to today

  // Look up driver by token
  const driver = await prisma.driver.findUnique({ where: { token } });
  if (!driver) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  // Fetch today's orders for this driver
  const startOfDay = new Date(date || new Date());
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date || new Date());
  endOfDay.setHours(23, 59, 59, 999);

  const orders = await prisma.order.findMany({
    where: {
      driverId: driver.id,
      status: { in: ['PRINTED', 'DELIVERED'] },
      createdAt: { gte: startOfDay, lte: endOfDay },
    },
    include: { customer: true, orderItems: { include: { product: true } } },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json(orders);
}
```

### Confirm Delivery with GPS
```typescript
// PATCH /api/orders/[id]/confirm
const body = await request.json();
// { gps: { lat, lng } | null }
await prisma.order.update({
  where: { id },
  data: {
    status: 'DELIVERED',
    deliveryGps: body.gps, // JSON field
  },
});
```

### Driver Token Generation
```typescript
import { nanoid } from 'nanoid';
// Generate 21-character URL-safe token
const token = nanoid(21); // e.g., "K8z2m9vL3Bx4nQw7yZ"
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Password auth | URL token + localStorage | Phase 3 | Drivers access via Zalo-shared URL without passwords |
| Real-time WebSocket | Manual refresh | Phase 3 | Simpler infrastructure, acceptable for driver use case |
| Google Maps API key | Leaflet + OpenStreetMap | Phase 3 | No API key needed, works immediately |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Leaflet + OSM works well enough for Vietnam urban/rural addresses | Map implementation | May need Google Maps fallback for poor OSM coverage areas |
| A2 | Drivers use Chrome on Android (Zalo browser uses Chromium) | GPS API compatibility | iOS Safari geolocation should work similarly, but untested |
| A3 | nanoid(21) provides sufficient token uniqueness | Driver token generation | 21 chars = ~36^21 combinations, far exceeds 10-15 driver needs |

## Open Questions

1. **Map tile provider for Vietnam**
   - What we know: OpenStreetMap has good coverage in Vietnam cities but rural coverage varies
   - What's unclear: Should we add a Vietnam-specific tile provider (e.g., MapBoxVN) as fallback?
   - Recommendation: Start with OSM, monitor user feedback, add fallback if needed

2. **Admin map real-time updates**
   - What we know: Decision D-14 says manual refresh only, D-23 says "real-time"
   - What's unclear: If no WebSocket, does real-time mean office manually refreshes?
   - Recommendation: Clarify with user - likely means "refresh to see latest" not live WebSocket

3. **Driver token regeneration**
   - What we know: Token is generated once per driver and used in URL
   - What's unclear: What happens if token is compromised? Is there a regeneration flow?
   - Recommendation: Add "regenerate token" button in admin driver management (future Phase 4 scope)

## Environment Availability

> Skip this section if the phase has no external dependencies (code/config-only changes).

Step 2.6: SKIPPED (no external dependencies identified beyond existing Next.js/Supabase stack)

All dependencies are npm-installable packages. No external CLI tools or services needed beyond what already exists.

## Security Domain

> Required when `security_enforcement` is enabled (absent = enabled). Omit only if explicitly `false` in config.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Token-based auth via URL parameter + localStorage |
| V3 Session Management | no | No session - stateless token per driver |
| V4 Access Control | yes | Driver can only see orders assigned to them via driverId FK |
| V5 Input Validation | yes | Zod schemas for all API inputs |
| V6 Cryptography | yes | nanoid for token generation (not cryptographic, but sufficient for internal use) |

### Known Threat Patterns for Driver View

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Token brute-forcing | Information Disclosure | nanoid(21) provides ~10^32 combinations, rate-limit API |
| Token sharing | Elevation of Privilege | Accepted risk - drivers intentionally share links via Zalo |
| GPS spoofing | Tampering | GPS is convenience proof, not fraud prevention |
| Order hijacking | Information Disclosure | Orders filtered by driverId in API, drivers only see their assigned orders |

## Sources

### Primary (HIGH confidence)
- [nanoid npm registry](https://www.npmjs.com/package/nanoid) - Version 5.1.9, URL-safe token generation
- [Leaflet npm registry](https://www.npmjs.com/package/leaflet) - Version 1.9.4, open-source map library
- [MDN navigator.geolocation](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/getCurrentPosition) - Official API docs with timeout parameter
- [Next.js App Router docs](https://nextjs.org/docs/app) - Route handlers and client components

### Secondary (MEDIUM confidence)
- [Leaflet + Next.js integration patterns](https://react-leaflet.js.org/) - React wrapper for Leaflet
- [OpenStreetMap Vietnam coverage](https://www.openstreetmap.org/#map=10/10.8/106.7) - General coverage assessment

### Tertiary (LOW confidence)
- WebSearch: "Vietnam map tile providers" - Not verified, may need field testing

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM-HIGH - All libraries verified via npm, patterns well-established
- Architecture: HIGH - Token auth and GPS patterns are standard, map pattern is recommended
- Pitfalls: MEDIUM - Identified from code review, some mitigations are assumptions

**Research date:** 2026-04-16
**Valid until:** 2026-05-16 (30 days - stable patterns)