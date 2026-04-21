---
phase: 03x
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/admin/dashboard/page.tsx
  - src/app/api/admin/stats/route.ts
autonomous: true
requirements: []
must_haves:
  truths:
    - Super Admin can see total active factory count at a glance
    - Super Admin can see total active driver count at a glance
    - Super Admin can see monthly revenue from subscriptions
    - Stats auto-refresh every 30 seconds without page reload
  artifacts:
    - path: src/app/api/admin/stats/route.ts
      provides: Aggregated stats across all factories (factory count, driver count, monthly revenue)
      exports: [GET]
    - path: src/app/admin/dashboard/page.tsx
      provides: System overview stat cards above TenantTable
      lines_min: 60
  key_links:
    - from: src/app/admin/dashboard/page.tsx
      to: src/app/api/admin/stats/route.ts
      via: fetch on mount + setInterval(30s)
      pattern: fetch.*api/admin/stats
---

<objective>
Add System Overview Dashboard to Super Admin dashboard at /admin/dashboard. Display 3 stat cards: Total Active Factories, Total Active Drivers, Monthly Revenue. Auto-refresh every 30 seconds.

Purpose: Give Super Admin immediate visibility into system-wide metrics.
Output: Modified /admin/dashboard with stat cards + /api/admin/stats endpoint.
</objective>

<context>
@src/app/admin/dashboard/page.tsx
@src/components/dashboard/stat-card.tsx
@prisma/schema.prisma

<!-- Reusable interface from StatCard -->
interface StatCardProps {
  title: string;
  value: string;
  subValue?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
}

<!-- Key Prisma models -->
model Subscription {
  id             String
  factoryId      String
  planType       SubscriptionPlan  // TRIAL, PAID
  status         SubscriptionStatus // ACTIVE, CANCELLED, EXPIRED
  startDate      DateTime
  endDate        DateTime
  driverCount    Int
  pricePerDriver Decimal?
}

model Factory {
  id        String
  isSystem  Boolean  // true = System factory (backfill), skip from counts
  drivers   Driver[]
}

model Driver {
  id        String
  isActive  Boolean
  factoryId String
}

Revenue calculation: sum of (subscription.driverCount * subscription.pricePerDriver) for ACTIVE subscriptions with endDate in current month. Per D-01: Revenue = Subscription only, not order value.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create /api/admin/stats endpoint</name>
  <files>src/app/api/admin/stats/route.ts</files>
  <action>
Create GET /api/admin/stats route that returns:
```json
{
  "activeFactoryCount": 12,
  "activeDriverCount": 48,
  "monthlyRevenue": 7200000
}
```

Query logic:
- activeFactoryCount: COUNT factories WHERE isSystem=false AND subscription.status='ACTIVE'
- activeDriverCount: COUNT drivers WHERE isActive=true AND factory.isSystem=false (join via factory)
- monthlyRevenue: SUM(subscription.driverCount * subscription.pricePerDriver) for subscriptions WHERE status='ACTIVE' AND endDate >= first day of current month. Use COALESCE to treat NULL pricePerDriver as 0.

Require SUPER_ADMIN role via middleware. Return 401 if not authenticated.
  </action>
  <verify>
    <automated>curl -s -H "Cookie: session=<super_admin_cookie>" http://localhost:3000/api/admin/stats | jq .</automated>
  </verify>
  <done>GET /api/admin/stats returns {activeFactoryCount, activeDriverCount, monthlyRevenue} with valid numbers</done>
</task>

<task type="auto">
  <name>Task 2: Add stat cards to /admin/dashboard</name>
  <files>src/app/admin/dashboard/page.tsx</files>
  <action>
Modify /admin/dashboard page to add 3 StatCard components above the TenantTable section.

Layout: Grid 3 columns (grid-cols-1 md:grid-cols-3 gap-4).

Cards:
1. "Tổng nhà máy đang hoạt động" — Building2 icon (lucide), value from API, subValue: "Active factories"
2. "Tổng tài xế đang hoạt động" — Truck icon, value from API, subValue: "Active drivers"
3. "Doanh thu tháng này" — Currency icon, value formatted as currency (Intl.NumberFormat 'vi-VN'), subValue: "Từ subscription"

Auto-refresh: useEffect with setInterval(() => refetch(), 30000). Cleanup on unmount. Show loading skeleton while fetching. Handle errors silently (don't crash dashboard).

Add import for Building2, Truck from lucide-react.
  </action>
  <verify>
    <automated>Visit /admin/dashboard as SUPER_ADMIN, verify 3 stat cards visible with values and 30s auto-refresh</automated>
  </verify>
  <done>Dashboard shows 3 stat cards with live data, auto-refreshes every 30s</done>
</task>

</tasks>

<verification>
- [ ] GET /api/admin/stats returns correct aggregated numbers
- [ ] Dashboard page renders 3 stat cards above TenantTable
- [ ] Stats refresh automatically every 30 seconds
- [ ] Numbers are accurate (not hardcoded)
</verification>

<success_criteria>
Stat cards display real data from database. Auto-refresh works without page reload. Super Admin sees system-wide metrics immediately upon visiting /admin/dashboard.
</success_criteria>

<output>
After completion, create `.planning/phases/03x-super-admin-extensions/03X-01-SUMMARY.md`
</output>