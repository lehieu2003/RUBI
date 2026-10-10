# Quick Task 261010-qol: Bốn cải tiến cho văn phòng, gom một nhánh

**Date:** 2026-10-10
**Nguồn:** User chọn làm cả bốn mục "nên làm trước khi xưởng dùng thật" và yêu cầu test cẩn thận.

1. **Số còn bán được trong drawer lên đơn** — `src/lib/actions/orders.ts`, `order-entry-drawer.tsx`, `order-matrix.tsx`: tồn trên sổ trừ các đơn chưa đối soát, hiện dưới mỗi ô; chỉ là gợi ý, không chặn lên đơn.
2. **Hỏi lại khi ngừng bán sản phẩm còn tồn hoặc còn trong đơn chưa đối soát** — `config/prices/page.tsx`, `product-table.tsx`.
3. **Sửa số vỏ bao gõ nhầm** — `api/deposits/shells/route.ts` (`mode: SET`), `deposits/shells/page.tsx`.
4. **SĐT nhân viên và tài xế** — `api/staff/*`, `contracts/accounts.ts`, `settings/page.tsx`: cột SĐT, sửa họ tên + SĐT, SĐT khi tạo; SĐT tài xế chép sang hồ sơ tài xế.

Không đổi schema.

## Verify

lint, typecheck, test, build, `contract:verify --record`, kịch bản trình duyệt trên Postgres tạm, rồi thử trên Supabase (user cho phép) với thao tác hoàn tác được.
