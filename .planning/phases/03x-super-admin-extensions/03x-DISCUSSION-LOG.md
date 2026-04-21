# Phase 03x: Super Admin Extensions - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-18
**Phase:** 03x-super-admin-extensions
**Areas discussed:** System Overview Dashboard, Payment Audit Log, Impersonation/Support Tool

---

## Feature 1: System Overview Dashboard

| Option | Description | Selected |
|--------|-------------|----------|
| Subscription only | Doanh thu dựa trên payments đã confirm | ✓ |
| Subscription + Order value | Tính thêm order value (cần data model mới) | |

**User's choice:** Subscription only
**Notes:** Simple approach — implement nhanh vì chỉ dùng existing payment data

---

| Option | Description | Selected |
|--------|-------------|----------|
| Essential | Factory count + Driver count + Revenue | ✓ |
| Full | Essential + Orders count + Growth % | |

**User's choice:** Essential
**Notes:** Chỉ 3 metrics cơ bản, không phức tạp

---

| Option | Description | Selected |
|--------|-------------|----------|
| Manual refresh button | User click button | |
| Auto-refresh 30s | Polling mỗi 30s | ✓ |
| No refresh | User tự reload | |

**User's choice:** Auto-refresh 30s
**Notes:** Real-time feel, acceptable server load

---

## Feature 2: Payment Audit Log

| Option | Description | Selected |
|--------|-------------|----------|
| 12 tháng | Annual tax reporting | ✓ |
| 24 tháng | Review dài hơn | |
| Vĩnh viễn | Không xóa | |

**User's choice:** 12 tháng
**Notes:** Đủ cho annual tax reporting

---

| Option | Description | Selected |
|--------|-------------|----------|
| Standard | Admin + Date + Amount + Factory + DriverCount | ✓ |
| Extended | Standard + Notes field | |

**User's choice:** Standard
**Notes:** Không cần notes field

---

| Option | Description | Selected |
|--------|-------------|----------|
| Có CSV export | Export ra CSV cho báo cáo thuế | ✓ |
| Không cần | Chỉ view trên màn hình | |

**User's choice:** Có CSV export
**Notes:** Hữu ích cho báo cáo thuế

---

## Feature 3: Impersonation / Support Tool

| Option | Description | Selected |
|--------|-------------|----------|
| Special session token | Super Admin stays logged in, có badge indicator | ✓ |
| Actual login as factory admin | Tạo session mới với quyền admin factory | |

**User's choice:** Special session token
**Notes:** An toàn hơn, không có password/session confusion

---

| Option | Description | Selected |
|--------|-------------|----------|
| Read-only | Chỉ xem data | ✓ |
| Full access | Có thể tạo/sửa/xóa | |

**User's choice:** Read-only
**Notes:** An toàn nhất cho support tool

---

| Option | Description | Selected |
|--------|-------------|----------|
| 15 phút | Phát hiện lỗi nhanh | ✓ |
| 30 phút | Cân bằng convenience/security | |
| 1 giờ | Không khuyến khích | |

**User's choice:** 15 phút
**Notes:** An toàn, không bỏ quên session

---

| Option | Description | Selected |
|--------|-------------|----------|
| Ghi log bắt buộc | Log: ai impersonate ai, thời gian bắt đầu/kết thúc | ✓ |
| Không cần log | Không theo dõi | |

**User's choice:** Ghi log bắt buộc
**Notes:** Quan trọng cho multi-tenant data isolation compliance

---

## Deferred Ideas

- Order value revenue — cần data model mới, defer
- Growth % month-over-month — complex calculation, defer
- Extended payment fields (notes) — đã chọn Standard
- Impersonation page-level logs — chỉ log start/end timestamps

---

*Log created: 2026-04-18*
