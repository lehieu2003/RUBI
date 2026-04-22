# Super Admin Current State

## Mục tiêu

Super Admin là lớp quản trị hệ thống của IceFlow SaaS. Vai trò này không thuộc một nhà máy cụ thể và được dùng để:

- xem tổng quan các tenant
- quản lý subscription của tenant
- hỗ trợ tenant khi cần
- xem lịch sử thanh toán subscription
- tạo dữ liệu demo/seed phục vụ kiểm thử

Tài liệu này mô tả trạng thái hiện tại của Super Admin trong codebase, chưa phải thiết kế hoàn chỉnh dài hạn.

## Trạng thái sau khi logic lại

Super Admin hiện đã được tổ chức thành một admin surface riêng dưới:

```text
/admin/*
```

Navigation chính:

| Màn hình | Đường dẫn | Mục đích |
| --- | --- | --- |
| Tổng quan | `/admin/dashboard` | Theo dõi health tổng hệ thống |
| Nhà máy | `/admin/tenants` | Quản lý tenant và subscription |
| Chi tiết nhà máy | `/admin/tenants/:factoryId` | Xem sâu một tenant, hỗ trợ và override |
| Thanh toán | `/admin/payments` | Lịch sử payment đã ghi nhận |
| Audit log | `/admin/audit-logs` | Payment audit log, lọc và export CSV |
| Hỗ trợ | `/admin/support` | Hướng dẫn hỗ trợ tenant và impersonation |

Dashboard không còn nhồi tenant table. Tenant management đã chuyển sang `/admin/tenants`.

## Tài khoản Super Admin

Super Admin được seed bởi:

```text
prisma/seed-system-factory.ts
```

Script này tạo:

- `System Factory`
- user role `SUPER_ADMIN`
- trial subscription cho system factory

Thông tin mặc định:

```text
email: admin@iceflow.system
password: change-me-immediately
```

Có thể override bằng env:

```text
SUPER_ADMIN_EMAIL
SUPER_ADMIN_PASSWORD
```

Lưu ý: trong môi trường thật, bắt buộc đổi password mặc định.

## Login và điều hướng

Sau khi login, nếu user có role:

```text
SUPER_ADMIN
```

hệ thống chuyển tới:

```text
/admin/dashboard
```

Super Admin không đi vào dashboard tenant thông thường.

## Màn hình hiện có

### 1. Super Admin Dashboard

Đường dẫn:

```text
/admin/dashboard
```

File:

```text
src/app/admin/dashboard/page.tsx
```

Chức năng hiện tại:

- hiển thị tổng số nhà máy đang active
- hiển thị tổng số tài xế active
- hiển thị doanh thu tháng này
- hiển thị bảng tenant
- thao tác subscription từng tenant

Các stat được lấy từ:

```text
GET /api/admin/stats
```

### 2. Tenant Table

Component:

```text
src/components/admin/tenant-table.tsx
```

Hiển thị mỗi tenant gồm:

- tên nhà máy
- số điện thoại
- trạng thái subscription
- loại gói
- số driver active
- số ngày còn lại
- thao tác quản trị

Thao tác hiện tại:

| Thao tác | Ý nghĩa |
| --- | --- |
| `Tạo trial` | Tạo trial subscription 14 ngày cho tenant chưa có subscription |
| `Tắt` | Chuyển subscription sang `CANCELLED` |
| `Kích hoạt` | Chuyển subscription sang `ACTIVE` |
| `Gia hạn` | Gia hạn subscription thêm số ngày nhập vào |
| `Sửa giá` | Cập nhật `pricePerDriver` |
| `Xem` | Bắt đầu impersonation để xem tenant |

API chính:

```text
GET /api/admin/factories
POST /api/admin/factories/:factoryId
PATCH /api/admin/subscriptions/:id
POST /api/admin/impersonate/:factoryId
```

### 3. Audit Logs

Đường dẫn:

```text
/admin/audit-logs
```

File:

```text
src/app/admin/audit-logs/page.tsx
```

Chức năng hiện tại:

- xem lịch sử payment
- lọc theo nhà máy
- lọc theo ngày bắt đầu
- lọc theo ngày kết thúc
- phân trang
- export CSV

API:

```text
GET /api/admin/audit-logs
GET /api/admin/audit-logs/export
```

Retention hiện tại:

```text
chỉ lấy payment trong 12 tháng gần nhất
```

CSV export giới hạn:

```text
tối đa 10,000 dòng
```

## API Super Admin hiện tại

### GET `/api/admin/stats`

Yêu cầu:

```text
role = SUPER_ADMIN
```

Trả về:

```text
activeFactoryCount
activeDriverCount
monthlyRevenue
```

Cách tính hiện tại:

- `activeFactoryCount`: số factory không phải system và có subscription `ACTIVE`
- `activeDriverCount`: số driver active thuộc factory không phải system
- `monthlyRevenue`: tổng `subscription.driverCount x pricePerDriver` của active subscription trong tháng

### GET `/api/admin/factories`

Yêu cầu:

```text
role = SUPER_ADMIN
```

Trả về danh sách tenant factory, mỗi item gồm:

- `id`
- `name`
- `phone`
- `address`
- `createdAt`
- subscription mới nhất
- `activeDriverCount`

Không trả về system factory.

### GET `/api/admin/factories/:factoryId`

Yêu cầu:

```text
role = SUPER_ADMIN
```

Trả về chi tiết một factory:

- thông tin factory
- active subscription
- số driver active
- tổng order 30 ngày gần nhất
- pending order 30 ngày gần nhất

### POST `/api/admin/factories/:factoryId`

Yêu cầu:

```text
role = SUPER_ADMIN
```

Tạo trial subscription 14 ngày cho factory chưa có subscription.

Nếu factory đã có subscription, API trả về subscription hiện có.

### PATCH `/api/admin/subscriptions/:id`

Yêu cầu:

```text
role = SUPER_ADMIN
```

Body hỗ trợ:

```text
status
extendDays
pricePerDriver
driverCount
recordPayment
```

Hành vi:

- `status = ACTIVE | CANCELLED`: đổi trạng thái subscription
- `extendDays > 0`: gia hạn từ `endDate` nếu còn hạn, hoặc từ hôm nay nếu đã hết hạn
- `pricePerDriver >= 0`: cập nhật giá mỗi driver
- `driverCount >= 0`: override quota/số driver trên subscription
- `recordPayment = true`: tạo payment audit khi gia hạn

Khi gia hạn:

```text
planType = PAID
status = ACTIVE
```

### GET `/api/admin/audit-logs`

Yêu cầu:

```text
role = SUPER_ADMIN
```

Query hỗ trợ:

```text
factoryId
startDate
endDate
page
limit
```

Trả về:

- `logs`
- `total`
- `page`
- `totalPages`

### GET `/api/admin/audit-logs/export`

Yêu cầu:

```text
role = SUPER_ADMIN
```

Query hỗ trợ:

```text
factoryId
startDate
endDate
```

Trả về CSV gồm:

```text
Date, Admin, Factory, Amount
```

### POST `/api/admin/impersonate/:factoryId`

Yêu cầu:

```text
role = SUPER_ADMIN
```

Hành vi:

- kiểm tra factory tồn tại
- tạo `ImpersonationLog`
- set cookie `impersonate_token`
- token hết hạn sau 15 phút

### GET `/api/admin/impersonate/status`

Đọc cookie:

```text
impersonate_token
```

Trả về:

```text
active
factoryId
```

Token hợp lệ khi:

- tồn tại
- chưa quá 15 phút
- chưa kết thúc

### POST `/api/admin/impersonate/end`

Yêu cầu:

```text
role = SUPER_ADMIN
```

Hành vi:

- set `endedAt` cho impersonation log
- clear cookie `impersonate_token`

## Data model liên quan

### User

Role có:

```text
ADMIN
ACCOUNTANT
STAFF
SUPER_ADMIN
```

Super Admin hiện có:

```text
role = SUPER_ADMIN
factoryId = null
```

### Factory

Có flag:

```text
isSystem
```

System factory dùng cho hệ thống, không phải tenant thật.

Tenant thật:

```text
isSystem = false
```

### Subscription

Fields chính:

```text
factoryId
planType
status
startDate
endDate
driverCount
pricePerDriver
```

### Payment

Fields chính:

```text
factoryId
amount
adminId
confirmedAt
notes
```

Payment hiện tại đại diện cho thanh toán đã được ghi nhận, chưa có trạng thái pending.

### ImpersonationLog

Fields chính:

```text
superAdminId
factoryId
token
startedAt
endedAt
```

## Seed/demo hiện có

### System Super Admin seed

File:

```text
prisma/seed-system-factory.ts
```

Chạy để tạo Super Admin thật cho hệ thống.

### Demo tenant seed

File:

```text
prisma/seed-admin-demo.ts
```

Chức năng:

- tạo tenant demo
- tạo subscription paid
- tạo driver
- tạo customer
- tạo order mẫu
- tạo payment mẫu

Mục tiêu: kiểm thử Super Admin dashboard.

## Những điểm còn sơ sài hiện tại

### 1. Chưa có navigation admin đầy đủ

Hiện có:

```text
/admin/dashboard
/admin/audit-logs
```

Nhưng chưa có sidebar/header admin rõ ràng để chuyển giữa các màn hình.

### 2. Dashboard Super Admin còn rất đơn giản

Dashboard hiện chủ yếu là:

- 3 stat cards
- tenant table

Chưa có:

- chart doanh thu theo tháng
- tenant growth
- churn/expired subscriptions
- payment pending
- alert vận hành

### 3. Billing/payment chưa có pending state

Model `Payment` hiện là payment đã ghi nhận.

Chưa có:

```text
PENDING
CONFIRMED
REJECTED
```

Vì vậy Super Admin chưa có màn hình duyệt payment request đúng nghĩa.

### 4. Revenue calculation chưa khớp hoàn toàn billing rule mới

Billing tenant đang dùng rule:

```text
1 admin miễn phí
chỉ tính driver trả phí
```

Một số chỗ Super Admin vẫn còn dùng:

```text
driverCount x pricePerDriver
```

Nên cần rà lại để thống nhất:

```text
max(0, driverCount - 1) x pricePerDriver
```

hoặc tốt hơn là tách rõ:

```text
activeDriverCount
paidDriverLimit
pricePerDriver
```

### 5. Audit log UI/API chưa hoàn toàn khớp

Audit UI đang có cột:

```text
Driver Count
```

Nhưng API audit logs hiện chưa trả `driverCount` trong log response.

Kết quả có thể là cột trống hoặc undefined.

### 6. Impersonation mới dừng ở mức hỗ trợ xem

Hiện Super Admin có thể tạo impersonation token và mở drawer thông tin tenant.

Chưa rõ:

- Super Admin có thật sự thao tác như tenant trong toàn app không
- các write action trong impersonation có được audit riêng không
- có banner toàn cục khi đang impersonate không

### 7. Chưa có quản lý tenant đầy đủ

Hiện có tenant table nhưng chưa có:

- tạo tenant từ Super Admin UI
- khóa/mở tenant cấp factory
- chỉnh thông tin factory
- xem chi tiết user/staff của từng tenant
- xem order/debt/inventory của tenant từ admin panel

### 8. Chưa có phân quyền admin nội bộ

Hiện chỉ có một role:

```text
SUPER_ADMIN
```

Chưa có:

- support admin
- finance admin
- read-only admin
- audit-only admin

## Hướng nâng cấp đề xuất

### Phase 1: Làm Super Admin usable hơn

- thêm admin sidebar/layout
- thêm link rõ ràng tới Dashboard và Audit Logs
- thêm trang tenant detail
- sửa audit log `driverCount`
- sửa revenue calculation theo billing rule thống nhất

### Phase 2: Làm billing/payment đúng nghiệp vụ

- thêm model `PaymentRequest`
- tenant ADMIN tạo yêu cầu nâng cấp/gia hạn
- Super Admin xác nhận hoặc từ chối payment
- audit toàn bộ hành động thanh toán

### Phase 3: Làm admin vận hành hệ thống

- tenant lifecycle management
- filter/search tenant table
- subscription health dashboard
- expired/near-expired alert
- revenue chart
- export báo cáo doanh thu

### Phase 4: Làm admin bảo mật hơn

- phân quyền admin nội bộ
- audit impersonation write actions
- session timeout rõ ràng
- admin activity log
- bắt buộc đổi password mặc định khi seed
