---
status: complete
---

# Quick Task 261010-qol Summary: Bốn cải tiến cho văn phòng

**Date:** 2026-10-10 · **Branch:** `feat/office-quality-of-life` · **Status:** complete ✓

## Shipped

1. Drawer lên đơn hiện "Còn N" dưới mỗi ô (tồn sổ − đơn PENDING/SHIPPING/DELIVERED); đỏ khi hết hoặc đặt quá; sản phẩm chưa có bản ghi tồn thì không hiện; không chặn lên đơn.
2. Ngừng bán sản phẩm còn tồn hoặc còn trong đơn chưa đối soát thì hỏi lại, nêu rõ số tồn và số đơn.
3. Màn Vỏ bao có "Sửa số" thay hai tổng bằng số đúng (`mode: SET`); giao dịch thường vẫn cộng dồn.
4. Màn Cài đặt: cột SĐT, hộp thoại sửa họ tên + SĐT, ô SĐT khi tạo. SĐT tài xế chép sang hồ sơ tài xế, trùng số tài xế khác trả 409 `PHONE_TAKEN`.

## Lỗi có sẵn sửa kèm

Tạo nhân sự xong thì hộp thoại không đóng và không báo gì: màn hình đọc `data.user` trong khi tài khoản nằm trong envelope (`data.data.user`). Bấm lại sẽ gặp "Email đã được đăng ký".

## Lỗi trong code mới, bắt được khi test

- SĐT trùng với tài xế chưa có tài khoản trả 500: điều kiện `NOT { userId }` bỏ sót dòng có `userId` null. Đổi sang so theo id hồ sơ tài xế.
- Khoá hoặc đổi tên tài xế xoá SĐT đang lưu ở hồ sơ tài xế (dữ liệu cũ chỉ có SĐT ở đó). Giờ chỉ chép SĐT khi request có gửi `phone`; danh sách lấy SĐT hồ sơ khi tài khoản chưa có.

## Verification

- lint 0 lỗi · `tsc --noEmit` 0 lỗi · suite 276/276 · build xong.
- `contract:verify --record` 54/54, 164 lượt gọi (thêm sửa số vỏ, SĐT tài xế đọc lại từ danh sách tài xế).
- Chrome (Playwright, Postgres tạm) 33/33 cho cả bốn mục.
