# IceFlow Billing Workflow

## Mục tiêu

Billing của IceFlow phục vụ một luồng đơn giản cho nhà máy đá:

1. Nhà máy đăng ký và dùng thử.
2. Chủ nhà máy xem trạng thái gói tại màn hình Billing.
3. Chủ nhà máy chuyển khoản để nâng cấp hoặc gia hạn.
4. Hệ thống kích hoạt gói trả phí và gia hạn quyền sử dụng.

Nguyên tắc chính: tenant ADMIN là người tự nâng cấp gói cho nhà máy của họ. Super Admin chỉ quản trị, hỗ trợ hoặc override khi cần.

## Vai trò

| Vai trò | Quyền với Billing |
| --- | --- |
| `ADMIN` | Xem billing, chuyển khoản, bấm nâng cấp/gia hạn gói cho nhà máy của mình |
| `ACCOUNTANT` | Xem thông tin billing, không được nâng cấp |
| `STAFF` | Không truy cập billing |
| `SUPER_ADMIN` | Quản trị subscription toàn hệ thống, hỗ trợ tenant, override khi cần |

## Workflow từ đăng ký đến nâng cấp

### 1. Nhà máy đăng ký

Khi nhà máy đăng ký tài khoản mới, hệ thống tạo:

- `Factory`
- user đầu tiên với role `ADMIN`
- `Subscription`

Subscription mặc định:

```text
planType: TRIAL
status: ACTIVE
thời hạn: 14 ngày
```

Tài khoản `ADMIN` đầu tiên được xem là chủ nhà máy hoặc người quản trị chính.

### 2. Dùng thử

Trong thời gian trial còn hạn, nhà máy được dùng hệ thống bình thường.

Nếu subscription còn hiệu lực:

```text
status = ACTIVE
endDate >= hôm nay
```

thì hệ thống cho phép các thao tác vận hành như tạo đơn, phân tài xế, cập nhật dữ liệu.

### 3. Hết hạn

Khi subscription hết hạn, hệ thống chuyển tenant sang trạng thái chỉ đọc.

Ý nghĩa:

- Tenant vẫn xem được dữ liệu cũ.
- Tenant không bị mất dữ liệu.
- Các thao tác ghi dữ liệu mới bị chặn.

Trạng thái hiển thị:

```text
Hết hạn - Chỉ đọc
```

### 4. Chủ nhà máy vào Billing

Tenant `ADMIN` vào:

```text
/settings/billing
```

Màn hình Billing hiển thị:

- trạng thái subscription
- loại gói hiện tại
- ngày hết hạn
- số driver hiện tại
- bảng giá
- thông tin chuyển khoản
- nút nâng cấp/gia hạn gói

### 5. Chuyển khoản

Chủ nhà máy chuyển khoản theo thông tin trên màn hình Billing.

Nội dung chuyển khoản nên có:

```text
THANH TOAN ICEFLOW <TEN_NHA_MAY> <THANG/NAM>
```

Ví dụ:

```text
THANH TOAN ICEFLOW KHACH HANG T4/2026
```

### 6. Bấm nâng cấp

Sau khi chuyển khoản, tenant `ADMIN` bấm:

```text
Tôi đã chuyển khoản - nâng cấp gói
```

Hệ thống xử lý:

```text
planType = PAID
status = ACTIVE
endDate = gia hạn thêm 30 ngày
```

Nếu subscription còn hạn, 30 ngày được cộng từ `endDate` hiện tại.

Nếu subscription đã hết hạn, 30 ngày được tính từ thời điểm nâng cấp.

Ví dụ:

```text
Trial còn hạn đến 2026-04-30
Nâng cấp ngày 2026-04-22
End date mới: 2026-05-30
```

```text
Trial hết hạn ngày 2026-04-10
Nâng cấp ngày 2026-04-22
End date mới: 2026-05-22
```

## Cách tính tiền hiện tại

Quy tắc hiện tại:

```text
1 tài khoản Admin miễn phí
Chỉ tính tiền các driver trả phí
```

Giá mặc định:

```text
150,000 VND / driver / tháng
```

Công thức:

```text
Số driver tính phí = max(0, driverCount - 1)
Số tiền mỗi tháng = Số driver tính phí x pricePerDriver
```

Trong đó:

- `driverCount`: số lượng driver/user đang được dùng để tính quota hiện tại
- `pricePerDriver`: giá mỗi driver mỗi tháng

Ví dụ:

| Trường hợp | Công thức | Số tiền |
| --- | --- | --- |
| Chỉ có Admin | `max(0, 1 - 1) x 150,000` | `0 VND / tháng` |
| Admin + 1 driver | `1 x 150,000` | `150,000 VND / tháng` |
| Admin + 3 driver | `3 x 150,000` | `450,000 VND / tháng` |
| Admin + 5 driver | `5 x 150,000` | `750,000 VND / tháng` |
| Admin + 10 driver | `10 x 150,000` | `1,500,000 VND / tháng` |

## Khi chủ muốn sử dụng nhiều hơn

Luồng nghiệp vụ nên là:

1. Chủ nhà máy muốn thêm nhiều driver hơn.
2. Hệ thống tính số driver trả phí mới.
3. Billing hiển thị số tiền mới.
4. Chủ nhà máy chuyển khoản theo số tiền mới.
5. Chủ nhà máy bấm nâng cấp/gia hạn.
6. Subscription được gia hạn thêm 30 ngày với quota mới.

Ví dụ nếu giá là `150,000 VND / driver / tháng`:

```text
Admin + 2 driver
Tiền tháng = 2 x 150,000 = 300,000 VND
```

```text
Admin + 4 driver
Tiền tháng = 4 x 150,000 = 600,000 VND
```

```text
Admin + 10 driver
Tiền tháng = 10 x 150,000 = 1,500,000 VND
```

## Điểm cần làm sạch trong thiết kế billing

Hiện tại `driverCount` đang dễ gây hiểu nhầm vì có nơi dùng như số driver hiện tại, có nơi dùng như quota đã mua.

Thiết kế rõ hơn nên tách thành:

```text
activeDriverCount = số driver đang hoạt động thực tế
paidDriverLimit = số driver trả phí đã mua
pricePerDriver = giá mỗi driver mỗi tháng
includedAdminCount = 1
```

Khi đó:

```text
Số tiền = paidDriverLimit x pricePerDriver
Số user tối đa = includedAdminCount + paidDriverLimit
```

Và điều kiện sử dụng là:

```text
activeDriverCount <= paidDriverLimit
```

hoặc nếu tính cả admin:

```text
totalUsers <= includedAdminCount + paidDriverLimit
```

## Workflow đề xuất dài hạn

Để workflow nâng cấp gói sạch hơn, Billing nên cho tenant `ADMIN` chọn số driver muốn mua:

```text
Số driver muốn mua: [ 1 ] [-] [+]
```

Sau đó hệ thống tính:

```text
Tổng tiền = số driver muốn mua x pricePerDriver
```

Nút hành động:

```text
Tạo yêu cầu nâng cấp
```

hoặc:

```text
Tôi đã chuyển khoản - nâng cấp gói
```

Tùy mức tự động hóa mong muốn:

- Nếu muốn đơn giản: tenant chuyển khoản rồi bấm nâng cấp, hệ thống tự kích hoạt.
- Nếu muốn kiểm soát tiền chặt: tenant tạo payment request, Super Admin xác nhận khi tiền về.
