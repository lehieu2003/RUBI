# Quick Task 261010-ops: Bốn việc còn lại, gom một nhánh

**Date:** 2026-10-10
**Nguồn:** User yêu cầu làm cả bốn mục trong một nhánh. Mục 1 làm theo hướng tự gỡ gán (đề xuất trước đó, user không chọn khác).

1. **Tài xế bị vô hiệu hoá còn giữ đơn đang giao** — `src/app/api/staff/[id]/route.ts`, `src/app/settings/page.tsx`: gỡ gán đơn PENDING/SHIPPING khi khoá, xoá hoặc đổi vai trò; báo số đơn.
2. **Link tới trang giá riêng của khách** — `src/app/customers/page.tsx`, `src/app/customers/[id]/page.tsx`: link trong drawer khách hàng (chỉ Quản lý), trang có layout.
3. **Thẻ "Đã đối soát hôm nay" đếm sai** — cột `orders.completed_at` (migration), ghi khi đối soát, lọc `completedDate`, `/settle` đếm theo ngày đối soát.
4. **Lọc và tổng hao hụt cho lịch sử kiểm kho** — lọc theo sản phẩm và khoảng ngày, endpoint tổng hợp, bộ lọc trên màn Kho lạnh.

## Verify

lint, typecheck, test, build, migrate deploy trên DB trống + drift, `contract:verify --record`, kịch bản trình duyệt cho từng mục.
