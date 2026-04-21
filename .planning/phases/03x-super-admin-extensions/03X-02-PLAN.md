---
phase: 03x
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/admin/audit-logs/page.tsx
  - src/app/api/admin/audit-logs/route.ts
  - src/app/api/admin/audit-logs/export/route.ts
autonomous: true
requirements: []
must_haves:
  truths:
    - Super Admin can view all payment records across factories
    - Super Admin can filter audit log by factory and date range
    - Super Admin can export audit log to CSV
    - Audit logs older than 12 months are automatically deleted
  artifacts:
    - path: src/app/api/admin/audit-logs/route.ts
      provides: Paginated audit log with factory/date filters
      exports: [GET]
    - path: src/app/api/admin/audit-logs/export/route.ts
      provides: CSV export of audit logs
      exports: [GET]
    - path: src/app/admin/audit-logs/page.tsx
      provides: Audit log page with table + filters + export button
      lines_min: 120
  key_links:
    - from: src/app/admin/audit-logs/page.tsx
      to: src/app/api/admin/audit-logs/route.ts
      via: fetch with query params (factoryId, startDate, endDate, page)
      pattern: fetch.*api/admin/audit-logs
    - from: src/app/admin/audit-logs/page.tsx
      to: src/app/api/admin/audit-logs/export/route.ts
      via: fetch + download CSV
      pattern: fetch.*api/admin/audit-logs/export
---

<objective>
Create Payment Audit Log page at /admin/audit-logs with searchable/filterable table and CSV export. Logs retained for 12 months only (auto-delete older).

Purpose: Give Super Admin visibility into all payment activity across factories.
Output: New /admin/audit-logs page + API endpoints.
</objective>

<context>
@src/components/admin/tenant-table.tsx
@prisma/schema.prisma

<!-- Existing Payment model (from Phase 03) -->
model Payment {
  id             String   @id @default(cuid())
  factoryId      String
  amount         Decimal  @db.Decimal(10, 2)
  adminId        String   // User who confirmed the payment
  confirmedAt    DateTime @default(now())
  notes          String?
  factory        Factory  @relation(fields: [factoryId], references: [id])
  admin          User     @relation(fields: [adminId], references: [id])
}

<!-- Audit log fields per D-05: Admin + Date + Amount + Factory + DriverCount -->
<!-- CSV columns: Date, Admin Name, Factory Name, Amount, Driver Count -->
<!-- Filter: factory dropdown, date range picker -->
<!-- Pagination: 20 per page -->

Retention (D-04): Auto-delete payments where confirmedAt < NOW() - INTERVAL '12 months'
Can use Prisma raw query or scheduled cleanup. For MVP, implement on each GET request (lightweight filter).
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create /api/admin/audit-logs endpoint</name>
  <files>src/app/api/admin/audit-logs/route.ts</files>
  <action>
Create GET /api/admin/audit-logs route with query params:
- factoryId (optional): filter by factory
- startDate (optional): ISO date string
- endDate (optional): ISO date string
- page (default 1): pagination
- limit (default 20): items per page

Query:
1. Join Payment with Factory (factory.name) and User (admin.name)
2. Filter: WHERE confirmedAt >= startDate AND confirmedAt <= endDate AND factoryId = factoryId (if provided)
3. Retention filter: WHERE confirmedAt >= NOW() - INTERVAL '12 months' (D-04)
4. Order by confirmedAt DESC
5. Include driverCount from Subscription at time of payment (snapshot or current? Use current for simplicity)

Return:
```json
{
  "logs": [{ "id", "confirmedAt", "amount", "adminName", "factoryName", "driverCount" }],
  "total": 150,
  "page": 1,
  "totalPages": 8
}
```

Require SUPER_ADMIN role.
  </action>
  <verify>
    <automated>curl -s -H "Cookie: session=<super_admin>" "http://localhost:3000/api/admin/audit-logs?page=1" | jq .</automated>
  </verify>
  <done>GET /api/admin/audit-logs returns paginated logs with all required fields</done>
</task>

<task type="auto">
  <name>Task 2: Create /api/admin/audit-logs/export endpoint</name>
  <files>src/app/api/admin/audit-logs/export/route.ts</files>
  <action>
Create GET /api/admin/audit-logs/export route with same filters as above (factoryId, startDate, endDate).

Returns CSV with headers:
Date,Admin,Factory,Amount,Driver Count

Format: Vietnam locale for numbers (dot thousand separator, comma decimal). Date format: DD/MM/YYYY HH:mm.

Set headers: Content-Type: text/csv, Content-Disposition: attachment; filename="audit-logs-YYYY-MM-DD.csv"

Query same as above but fetch ALL matching records (no pagination limit) up to reasonable max (10000 rows). Require SUPER_ADMIN role.
  </action>
  <verify>
    <automated>curl -s -H "Cookie: session=<super_admin>" "http://localhost:3000/api/admin/audit-logs/export" -o /tmp/audit.csv && head -5 /tmp/audit.csv</automated>
  </verify>
  <done>GET /api/admin/audit-logs/export returns valid CSV file download</done>
</task>

<task type="auto">
  <name>Task 3: Create /admin/audit-logs page</name>
  <files>src/app/admin/audit-logs/page.tsx</files>
  <action>
Create new page at src/app/admin/audit-logs/page.tsx.

Layout:
- Header: "Audit Log" title + subtitle "Lịch sử thanh toán subscription"
- Filter row: Factory dropdown (fetch /api/admin/factories for list), start date input, end date input, "Lọc" button, "Export CSV" button
- Table: columns = Date, Admin, Factory, Amount, Driver Count
- Pagination: Previous/Next buttons + page indicator

Style: Match admin dark theme (slate-900 bg, white/5 cards, white/10 borders).
Table rows: hover:bg-white/10 on row hover.
Amount: format as VND currency.
Date: format as DD/MM/YYYY HH:mm.

CSV export: fetch /api/admin/audit-logs/export with current filters, create blob, trigger download via anchor click.
  </action>
  <verify>
    <automated>Visit /admin/audit-logs as SUPER_ADMIN, verify table renders with data and export works</automated>
  </verify>
  <done>Audit log page displays with filter controls, table, pagination, and CSV export</done>
</task>

</tasks>

<verification>
- [ ] GET /api/admin/audit-logs returns paginated logs
- [ ] GET /api/admin/audit-logs/export downloads valid CSV
- [ ] /admin/audit-logs page renders with filters and table
- [ ] Retention filter: logs older than 12 months excluded
</verification>

<success_criteria>
Super Admin can view all payment records, filter by factory/date, and export to CSV. Old logs (>12 months) are automatically excluded.
</success_criteria>

<output>
After completion, create `.planning/phases/03x-super-admin-extensions/03X-02-SUMMARY.md`
</output>