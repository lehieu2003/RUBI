---
status: complete
---

# Quick Task 261010-r1b Summary: Xoá Bản Đồ/GPS + bỏ Super Admin/SaaS (single-factory Rubi)

**Date:** 2026-10-10 · **Commits:** `09e8eaa` (map/GPS), `28452dc` (SaaS) trên `feat/iceflow-mobile-phase1` · **Status:** complete ✓

## Shipped

1. **Map/GPS (web + Flutter)** — xoá `/dashboard/map`, `/api/orders/map`, `DriverMap`/`MapInner`, `lib/geolocation.ts`, gói `leaflet`/`react-leaflet`/`@types/leaflet`. Xác nhận giao hàng (`/driver`, `/d/[token]`, `PATCH /api/orders/[id]/confirm`, app Flutter) không còn lấy/lưu GPS. Flutter bỏ `core/location`, `geolocator`, 2 quyền vị trí Android. Header `Permissions-Policy` đổi `geolocation=()`.
2. **Super Admin/SaaS** — xoá `/admin/*`, `/api/admin/*`, impersonation, `/register`, subscription/billing/trial, payment webhook, cron subscription-warnings, landing + support chat, `/privacy`, `/terms`, email service, 2 seed script super admin. Gỡ `requireActiveSubscription` khỏi 15 route và giới hạn số tài xế theo gói (schedule + bulk-assign). `/` → middleware redirect `/login` (đã đăng nhập → trang chủ theo vai trò). Nhãn "IceFlow SaaS" → "Nhà máy đá tinh khiết Rubi".
3. **Schema + DB Supabase** — bỏ `SUPER_ADMIN`, `Subscription`, `Payment`, `ImpersonationLog`, `Factory.isSystem`, `Order.deliveryLat/Lng/Gps`. Đã `db push --accept-data-loss`; xoá user `superadmin@iceflow.vn`, system factory rỗng; factory `factory-mien-dong` đổi tên thành "Nhà máy đá tinh khiết Rubi". Dữ liệu bị xoá đều là dữ liệu seed (1 subscription, 2 payment, 1 impersonation log, GPS của 1 đơn).

## Giữ lại có chủ đích

- `Factory` + `factory_id` scoping (user chọn giữ).
- `/onboarding` + `/api/factory/onboarding` + `Factory.onboardingCompleted`: đây là UI duy nhất để import khách hàng từ CSV, không phải tính năng SaaS.
- Nút mở địa chỉ khách trên Google Maps trong `DeliveryCard` (dẫn đường, không dùng GPS/leaflet).

## Verification

- `tsc --noEmit` 0 lỗi · web suite **112/112** (149 trước đó; phần giảm là test của tính năng đã xoá) · eslint không thêm lỗi/cảnh báo mới.
- Flutter: `flutter analyze` sạch · `flutter test` 148 pass.
- Smoke dev server: `/` 307 → `/login`; `/register`, `/admin/dashboard`, `/dashboard/map`, `/billing`, `/api/orders/map`, `/api/admin/stats` → 404; chủ xưởng vào 13 trang chính đều 200; tài xế `/driver` 200; confirm với body `{}` và không body đều tới được bước tìm đơn (404 đơn giả); superadmin login 401.
- `prisma migrate diff` DB ↔ schema: không drift.
- CHƯA chạy `next build` (dev server đang chạy), chưa confirm một đơn thật trên DB.

## Còn tồn

- (Đã xử lý 2026-10-10, commit docs riêng) README, CLAUDE/AGENTS, `docs/*`, `mobile/README.md`, `.planning/PROJECT.md` đã cập nhật sang single-factory; `update.md` và `docs/e2e-bug-report-2026-10-02.md` giữ nguyên nội dung lịch sử, chỉ thêm ghi chú đầu file. `docs/superpowers/*` (plan/spec cũ) không sửa.
- Seed vẫn dùng email `@miendong.vn`, id `factory-mien-dong`, địa chỉ/SĐT demo.
- `prisma/migrations/*` không phản ánh thay đổi (DB này quản lý bằng `db push`).
- `npm run lint` hỏng từ trước (glob `prisma` bị ignore).
