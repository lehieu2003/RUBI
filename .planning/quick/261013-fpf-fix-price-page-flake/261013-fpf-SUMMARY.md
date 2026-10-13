---
status: complete
---

# Quick Task 261013-fpf Summary: test "mở bảng giá riêng" chập chờn

**Date:** 2026-10-13 · **Branch:** `fix/e2e-customer-price-page-flake` · **Status:** complete ✓

## Nguyên nhân

Không phải lỗi của test mà là lỗi thật của app, chỉ lộ ra khi trình duyệt chậm:

- Link "Bảng giá riêng của khách này" xuất hiện cùng lúc với ngăn khách hàng và Next.js lập tức tải trước (prefetch) trang đích.
- Bấm link khi lượt tải trước còn dang dở thì lượt chuyển trang không bao giờ hoàn tất: server trả đủ dữ liệu (đã thấy trong trace), nhưng trang đứng yên ở danh sách khách, chờ 45 giây vẫn vậy.
- Máy nhanh thì lượt tải trước xong trước khi kịp bấm nên không sao. Máy CI có lượt chậm → cả lần chạy lẫn lần thử lại trong cùng lượt đều rớt, đúng như đã thấy.

Bằng chứng: bóp CPU trình duyệt 4–8 lần thì test rớt 5/5 lượt; làm chậm mạng mà không bóp CPU thì không rớt.

## Shipped

1. `src/app/customers/page.tsx`: `prefetch={false}` cho link đó.
2. `e2e/access.spec.ts`: thêm test "reaches it on a slow browser too" (CPU trình duyệt chậm 6 lần).

## Verification

- Trước khi sửa, dưới CPU chậm: rớt 5/5. Sau khi sửa, cùng điều kiện: qua 6/6.
- `scripts/e2e-local.sh access --repeat-each=4` (Postgres dùng một lần): 24/24.
- `npm run test` 294/294, `lint` 0 lỗi, `typecheck` sạch.

## Ghi chú

- Người dùng thật trên máy chậm cũng có thể gặp: bấm vào link mà không thấy gì xảy ra.
- Chưa rà các link khác xuất hiện trong ngăn / hộp thoại vừa mở; nếu có chỗ nào "bấm không ăn" tương tự thì cùng một cách sửa.
