# Assets Module Implementation Plan (2026-10-02)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (native inline — user pre-selected end-to-end execution). Steps use `- [ ]` checkboxes.

**Goal:** Module "Tài sản" quản lý máy móc + xe tải với lịch bảo trì và nhắc hạn, đúng spec.

**Architecture:** 2 model mới (Asset, MaintenanceRecord) + migration; 3 API route groups theo pattern hiện có; trang `/assets` client-side + widget RSC trên dashboard; RBAC `/assets` = opsRoles.

**Tech Stack:** Prisma 6 (migrate dev), Next.js 15 route handlers, Tailwind 4 tokens, node:test.

**Spec:** `docs/superpowers/specs/2026-10-02-assets-design.md`

## Global Constraints

- Schema change CHỈ qua `prisma migrate dev` (tạo migration file cho prod) — không `db push`.
- Mọi query phải có `factoryId` (guard $extends sẽ throw nếu thiếu).
- Theo pattern: `apiSuccess/apiError`, `requireRole`, `requireActiveSubscription` cho writes, double quotes trong route handlers.
- UI dùng token theme (`bg-card`, `text-on-surface`...) — không hex mới.

## Review Focus

1. Tenant leak: mọi query Asset/MaintenanceRecord phải scope factoryId — pinned by Task 2 pattern test.
2. Code uniqueness per factory → 409 — pinned by Task 2 test + curl verify.
3. Cascade delete: xóa asset phải xóa maintenance records — schema `onDelete: Cascade` + Task 2 test.
4. Due-color logic (≤7 đỏ, ≤30 vàng) — computed phía client, Task 3 test pin helper.

---

### Task 1: Schema + migration

- [ ] Thêm enums (AssetType, AssetStatus, MaintenanceType) + 2 models + Factory relations vào `prisma/schema.prisma`
- [ ] `npx prisma migrate dev --name add_asset_management` (nếu yêu cầu reset: chấp nhận, re-seed `npm run db:seed`)
- [ ] Verify: bảng `assets`, `maintenance_records` tồn tại; enums đúng

### Task 2: API routes + tests

**Files:** Create `src/app/api/assets/route.ts`, `src/app/api/assets/[id]/route.ts`, `src/app/api/assets/[id]/maintenance/route.ts`; Test `tests/api/assets.test.ts`; Modify `src/lib/api-endpoints.ts` (ASSETS entries)

- [ ] RED: pattern tests — GET/POST guards (`['ADMIN','ACCOUNTANT']` cho POST, GET cũng ops-only), factoryId trên mọi where, code-unique check trả 409, DELETE chỉ ADMIN, cascade via schema relation, POST maintenance yêu cầu performedAt
- [ ] GREEN: implement 3 routes (GET list: include `_count.maintenanceRecords` + latest dueAt qua subquery map; POST validate name/code; PATCH partial update; DELETE cascade; maintenance GET desc + POST required performedAt + dueAt optional)
- [ ] Verify: curl round-trip (login admin → POST asset → GET → POST maintenance → DELETE)
- [ ] Commit `feat(assets): asset and maintenance API with factory scoping`

### Task 3: UI trang /assets + RBAC + dashboard widget

**Files:** Create `src/app/assets/page.tsx`; Modify `src/lib/rbac/permissions.ts` (thêm `/assets` opsRoles), `src/components/dashboard/sidebar.tsx` (menuMetadata), `src/lib/api-endpoints.ts`, `src/app/dashboard/page.tsx` + `dashboard-client.tsx` (widget due), Test `tests/components/assets-page.test.ts`

- [ ] RED: pattern tests — rbac table có `/assets` với opsRoles; sidebar menuMetadata có '/assets'; dashboard page query MaintenanceRecord dueAt
- [ ] GREEN: trang `/assets` (tabs Máy/Xe, cards grid với due-color helper ≤7 đỏ ≤30 vàng, add modal type-aware, detail drawer với history + record modal + delete confirm); dashboard widget "TÀI SẢN SẮP ĐẾN HẠN" (ẩn khi rỗng)
- [ ] Verify typecheck + suite
- [ ] Commit `feat(assets): assets page, menu entry, dashboard due widget`

### Task 4: QA UI (desktop + mobile, light + dark)

- [ ] Browser 1280: tạo máy móc + xe tải qua UI, ghi nhận bảo trì có dueAt, kiểm tra màu hạn, dashboard widget hiển thị
- [ ] Browser 375px: page + drawer + modals dùng được
- [ ] Dark mode cả trang
- [ ] STAFF login → không thấy menu Tài sản; gọi API → 403
- [ ] Screenshots `gui-test-screenshots/assets-*.png`

### Task 5: Gates + push

- [ ] `npm test` (tất cả pass), typecheck 0, lint 0
- [ ] Commit docs + push
