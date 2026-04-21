# Phase 03x: Super Admin Extensions - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Extend Super Admin dashboard with 3 new capabilities beyond the v2.0 roadmap:

1. **System Overview Dashboard** — aggregate stats across all factories (factory count, driver count, monthly revenue)
2. **Payment Audit Log** — searchable log of all subscription payments with CSV export
3. **Impersonation / Support Tool** — SUPER_ADMIN can temporarily view any factory's data as read-only

This phase does NOT modify existing Phase 03 deliverables (TenantTable, /admin/dashboard page already built).

</domain>

<decisions>
## Implementation Decisions

### Feature 1: System Overview Dashboard

- **D-01: Revenue = Subscription only** — Doanh thu = tổng payments đã confirm (subscription fee × driver count × months). Không tính order value.
- **D-02: Metrics = Essential** — Chỉ 3 metrics: Tổng factory active, Tổng driver active, Doanh thu tháng này. Không có orders count hay growth %.
- **D-03: Auto-refresh 30s** — Dashboard auto-refresh mỗi 30 giây bằng polling.

### Feature 2: Payment Audit Log

- **D-04: Retention = 12 tháng** — Payment logs được giữ lại 12 tháng, sau đó tự động xóa. Đủ cho annual tax reporting.
- **D-05: Fields = Standard** — Audit fields: Admin duyệt + Ngày duyệt + Amount + Factory + Driver count. Không có notes field.
- **D-06: CSV Export** — Cho phép export payment logs ra CSV file.

### Feature 3: Impersonation / Support Tool

- **D-07: Special session token approach** — Super Admin stays logged in as SUPER_ADMIN, có badge/indicator cho biết đang xem với tư cách factory X. Không tạo session mới.
- **D-08: Read-only access** — Khi impersonate, chỉ có quyền xem data. Không tạo/sửa/xóa gì.
- **D-09: Auto-logout 15 phút** — Impersonate session tự động logout sau 15 phút không hoạt động.
- **D-10: Audit log bắt buộc** — Ghi lại: ai impersonate ai, thời gian bắt đầu/kết thúc. Không ghi lại xem page nào (chỉ có start/end timestamps).

### Folded Todos
Không có todos được fold vào phase này.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Documents
- `.planning/ROADMAP.md` — Phase 03 deliverables (SADM-02/03/04/05 đã hoàn thành)
- `.planning/phases/03-subscription-management-super-admin-dashboard/03-CONTEXT.md` — Phase 03 decisions (layout, inline actions, extend UX)
- `.planning/PROJECT.md` — Current milestone: v2.0 Multi-tenant Factory Architecture
- `.planning/phases/01-foundation-order-entry/01-CONTEXT.md` — Phase 01 decisions (SUPER_ADMIN bypass, factoryId filter)

### Existing Code
- `src/app/admin/dashboard/page.tsx` — Existing Super Admin dashboard page
- `src/components/admin/TenantTable.tsx` — Existing TenantTable component (reuse patterns)
- `src/components/dashboard/stat-card.tsx` — Existing StatCard component (reuse for overview stats)
- `src/lib/subscription-status.ts` — `isSubscriptionActive()`, `getDaysRemaining()`
- `src/middleware.ts` — Role-based routing, SUPER_ADMIN check

### Database
- `prisma/schema.prisma` — Factory, Subscription, Payment models

</canonical_refs>

<codebase_context>
## Existing Code Insights

### Reusable Assets
- `StatCard` component — dùng lại cho overview stats cards
- `TenantTable` patterns — dùng lại cho audit log table (pagination, filter, sortable columns)
- `toast()` from global ToastContext — dùng cho notifications

### Integration Points
- `/admin/dashboard` — thêm System Overview section (above TenantTable)
- `/admin/audit-logs` — trang mới cho payment audit log
- `/api/admin/impersonate` — endpoint mới để bắt đầu impersonate session
- `/api/admin/audit-logs` — endpoint mới cho payment log list + CSV export
- `Prisma model Payment` — cần thêm fields cho audit trail (adminId, factoryId, amount, driverCount, createdAt)

### Patterns to Follow
- Admin dashboard dark theme (slate-900 background, bg-white/5 surfaces)
- Row-level inline actions (same as TenantTable)
- Auto-refresh: setInterval trong client component, cleanup on unmount
- Impersonation badge: floating indicator ở góc màn hình khi đang impersonate

</codebase_context>

<specifics>
## Specific Ideas

1. **System Overview placement**: Hiển thị ở đầu `/admin/dashboard`, trước TenantTable hiện tại. Stats cards 3 cột.

2. **Impersonation UX**: Click "Xem" button trong TenantTable row → tạo impersonate token → redirect đến `/factory/{factoryId}` với badge indicator "Đang xem với tư cách: {FactoryName}" ở góc trên.

3. **Payment Audit Log**: Trang riêng `/admin/audit-logs`. Filter theo factory dropdown + date range. Paginated table. Export CSV button.

4. **Audit log schema**: `ImpersonationLog` model — fields: superAdminId, factoryId, startedAt, endedAt, reason (optional).

</specifics>

<deferred>
## Deferred Ideas

- Order value revenue (tính thêm tổng giá trị orders thực tế) — cần data model mới
- Growth % month-over-month — complex calculation, defer đến phase sau
- Extended payment fields (notes) — đã chọn Standard
- Impersonation xem page logs — chỉ log start/end timestamps

</deferred>

---

*Phase: 03x-super-admin-extensions*
*Context gathered: 2026-04-18*
