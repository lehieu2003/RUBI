---
status: complete
---

# Quick Task 261011-psf Summary: Phiếu giao hàng in đúng thông tin xưởng

**Date:** 2026-10-11 · **Branch:** `fix/print-slip-factory-info` · **Status:** complete ✓

## Shipped

1. **Tiêu đề phiếu là xưởng thật**: tên, địa chỉ, điện thoại đọc từ bảng `Factory` (sửa trong Cài đặt là phiếu đổi theo), thay cho dòng giữ chỗ "ICEFLOW — 123 Đường ABC".
2. **Phiếu in ghi chú của đơn.**
3. **Nút in ở trang chi tiết ghi "K80"**, đúng với khổ 80mm duy nhất của CSS in.

Ba lỗi có sẵn do bài test trình duyệt mới làm lộ ra, sửa cùng:

4. **Trang chi tiết đơn in ra giấy trắng**: luật CSS in ẩn cả các thẻ chứa phiếu. Nay chỉ ẩn những gì không chứa phiếu.
5. **Bảng sản phẩm trên phiếu bị vỡ dòng**: mọi phần tử trong phiếu bị ép `display: block`, nên tên, SL, đơn giá, thành tiền xếp chồng. Nay chỉ ép riêng khung phiếu.
6. **Phiếu hiện ở cuối màn danh sách đơn** khi mở một đơn. Nay chỉ hiện trên giấy.

## Verification

- lint 0 lỗi · `tsc --noEmit` 0 lỗi · suite 276/276 · build xong.
- Chrome (Playwright, Postgres tạm trong Docker) 28/28, trong đó 2 bài mới của `e2e/print-slip.spec.ts`: phiếu ở danh sách và ở trang chi tiết có tên, địa chỉ, điện thoại xưởng và ghi chú; ở chế độ in phiếu hiện, phần còn lại ẩn, một dòng sản phẩm nằm trên một hàng.
- Xem ảnh chụp chế độ in của cả hai đường in.

## Ghi chú

- Chưa in thử trên máy in nhiệt thật.
- `tests/pricing/scope.test.ts` đếm số action kiểm tra vai trò văn phòng: 3 → 4 (thêm `loadSlipFactory`).
- Một lần chạy, bài `access.spec.ts` "reaches a customer's price page" trượt (bấm link trong ngăn khách không chuyển trang); chạy lại qua, bốn lần còn lại đều qua. Không liên quan thay đổi này.
- Mã đơn trên phiếu vẫn là 6 ký tự cuối, không có tiền tố "DH-" như trên màn hình.
