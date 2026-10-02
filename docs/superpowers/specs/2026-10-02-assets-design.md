# Spec: Module "Tài sản" — Quản lý máy móc & xe tải (2026-10-02)

**Mục tiêu:** Xưởng đá có nhiều máy móc (lò đá, máy ống) và xe tải; app cần nơi theo dõi tài sản + lịch bảo trì/đăng kiểm/bảo hiểm + nhắc hạn để không bị phạt và không mất sản lượng do hỏng máy.

**Đã chốt với user:** phạm vi cả máy móc + xe tải; có lịch bảo trì + nhắc hạn; chỉ ADMIN + Kế toán dùng.

## 1. Dữ liệu (Prisma + migration)

```prisma
enum AssetType    { MACHINE VEHICLE }
enum AssetStatus  { ACTIVE MAINTENANCE BROKEN INACTIVE }
enum MaintenanceType { ROUTINE INSPECTION INSURANCE REPAIR }

model Asset {
  id           String @id @default(cuid())
  factoryId    String
  factory      Factory @relation(fields: [factoryId], references: [id])
  type         AssetType
  name         String
  code         String            // duy nhất trong xưởng
  licensePlate String?           // chỉ VEHICLE
  capacityTons Float?            // chỉ MACHINE
  status       AssetStatus @default(ACTIVE)
  notes        String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  maintenanceRecords MaintenanceRecord[]
  @@unique([factoryId, code])
  @@index([factoryId])
}

model MaintenanceRecord {
  id          String @id @default(cuid())
  factoryId   String               // denormalized cho tenant guard
  factory     Factory @relation(fields: [factoryId], references: [id])
  assetId     String
  asset       Asset @relation(fields: [assetId], references: [id], onDelete: Cascade)
  type        MaintenanceType
  performedAt DateTime
  dueAt       DateTime?            // hạn tiếp theo
  cost        Float?
  notes       String?
  createdAt DateTime @default(now())
  @@index([factoryId, dueAt])
  @@index([assetId])
}
```

Factory model thêm relation `assets Asset[]` và `maintenanceRecords MaintenanceRecord[]`.

"Nhắc hạn" **không lưu bảng riêng** — tính từ `dueAt` gần nhất mỗi asset: đỏ ≤7 ngày, vàng ≤30 ngày, xanh còn lại; không có record/`dueAt` → không hiển thị hạn.

## 2. API (pattern chuẩn: apiSuccess/apiError, requireRole, factoryId scoping, $extends guard)

| Route | Guard | Mô tả |
|---|---|---|
| `GET /api/assets?type=` | ADMIN, ACCOUNTANT | list + `dueAt` gần nhất + count records |
| `POST /api/assets` | ADMIN, ACCOUNTANT + subscription | tạo (validate: name+code bắt buộc, code unique trong xưởng → 409) |
| `PATCH /api/assets/[id]` | ADMIN, ACCOUNTANT + subscription | sửa name/status/plate/capacity/notes |
| `DELETE /api/assets/[id]` | ADMIN | xóa cứng (cascade maintenance records) — confirm dialog phía UI |
| `GET /api/assets/[id]/maintenance` | ADMIN, ACCOUNTANT | lịch sử (mới nhất trước) |
| `POST /api/assets/[id]/maintenance` | ADMIN, ACCOUNTANT + subscription | ghi nhận (performedAt bắt buộc; dueAt/cost/notes optional) |

Dashboard widget **không cần API** — RSC `dashboard/page.tsx` truy vấn Prisma trực tiếp (pattern sẵn có): top 5 record có `dueAt` trong 30 ngày tới, join asset.

## 3. UI

**Trang `/assets` (client component, pattern `/inventory`):**
- Header + nút "+ THÊM TÀI SẢN" + xuất CSV (reuse `exportToCSV`)
- Tabs Máy móc | Xe tải (filter `type`)
- Grid cards: tên, mã, chip trạng thái (màu theo status), plate/công suất, hạn gần nhất có màu (đỏ/vàng/xanh)
- Card click → **drawer chi tiết** (dùng `ui/drawer`): thông tin + nút sửa (modal) + nút xóa (confirm) + danh sách maintenance + nút "GHI NHẬN" mở modal (type select, performedAt date, dueAt date, cost number, notes)
- Modal thêm: type toggle quyết định hiện licensePlate hay capacityTons

**Dashboard:** card "TÀI SẢN SẮP ĐẾN HẠN" — top 5 dueAt ≤30 ngày (asset name, loại hạn, ngày còn lại, màu); rỗng → ẩn card.

**Sidebar:** menu "Tài sản" (icon `Wrench`) — chỉ ADMIN + ACCOUNTANT (thêm `/assets` vào `tenantRoutePermissions` + `menuMetadata`).

## 4. Không làm (YAGNI)

Nhiên liệu, GPS máy, QR/ảnh tài sản, phân công tài xế-xe, báo cáo chi phí bảo trì theo tháng.

## 5. Testing

- Pattern tests: route guards (ops roles, subscription), factory scoping trên mọi query, code-unique → 409, cascade delete
- UI QA cả light/dark, desktop 1280 + mobile 375: tạo asset máy + xe, ghi nhận bảo trì có hạn, kiểm tra màu hạn + dashboard widget + sidebar menu
- Migration: `prisma migrate dev --name add_asset_management` (reset local test data chấp nhận được, re-seed)
