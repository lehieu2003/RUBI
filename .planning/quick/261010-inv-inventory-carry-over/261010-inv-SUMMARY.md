---
status: complete
---

# Quick Task 261010-inv Summary: Tồn kho luỹ kế và kiểm kho

**Date:** 2026-10-10 · **Branch:** `fix/inventory-carry-over` · **Status:** complete ✓

## Shipped

1. **Số dư luỹ kế** — `stockOnHand` và `changeStock` trong `src/lib/inventory.ts`; màn Kho lạnh, thẻ tồn kho trên dashboard, nhập sản lượng và đối soát đều đi qua hai hàm này.
2. **Kiểm kho** — hộp thoại theo từng sản phẩm trên màn Kho lạnh; số âm hiện màu đỏ kèm gợi ý.

## Verification

- lint 0 lỗi · `tsc --noEmit` 0 lỗi · suite 249/249 (6 test đơn vị cho số dư) · build xong.
- `contract:verify` 52/52 trên DB mới seed, có thêm lượt kiểm kho rồi đọc lại.
- Chrome (Playwright, Postgres tạm) 13/13: lùi mọi dòng tồn kho một ngày → dashboard và Kho lạnh vẫn hiện 150 → nhập 40 thành 190, dòng hôm qua giữ 150 → đối soát trừ 4 từ 200 còn 196 → kiểm kho 182 báo hao hụt 8 → lùi thêm một ngày vẫn mở đầu ngày ở 182.

## Cần biết

- Dữ liệu cũ trên Supabase được ghi theo kiểu "số của riêng từng ngày". Sau khi deploy, dòng mới nhất của mỗi sản phẩm trở thành tồn đầu kỳ, có thể sai hoặc âm: **cần kiểm kho một lượt ngay sau deploy**.
- Kiểm kho chỉ thay số dư, chưa lưu lịch sử điều chỉnh (ai, lúc nào, hao hụt bao nhiêu). Muốn có báo cáo hao hụt thì cần thêm bảng và migration.
