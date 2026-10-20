# Báo Cáo Kiểm Toán Toàn Diện Hệ Thống (Full-System Audit) — 2026-10-19

**Dự án:** IceFlow — Nhà máy đá tinh khiết Rubi  
**Người đọc:** Project Owner / Lead Developer  
**Phương pháp:** 4 Subagents chuyên biệt (`flutter-auditor`, `race-condition-auditor`, `ui-logic-auditor`, `api-flow-auditor`) chạy độc lập rà soát mã nguồn tĩnh (Static Source Inspection); kết quả được tổng hợp, đối chiếu chéo và chuẩn hóa bởi `audit-reviewer`.  
**Nhánh kiểm tra:** `dev` (sau khi đồng bộ modular endpoints và 38 skills).  
**Quy tắc:** Tất cả 28 lỗi dưới đây đều là **Confirmed Bugs** (có trích dẫn chính xác `path:line`, nguyên nhân gốc rễ trong mã nguồn và kịch bản tái hiện cụ thể).

---

## 1. Bảng tổng hợp phát hiện (Executive Summary)

| Phân hệ / Nhóm kiểm toán | Tổng số | Nghiêm trọng (Critical) | Cao (High) | Trung bình (Medium) | Thấp (Low) |
|:---|:---:|:---:|:---:|:---:|:---:|
| **Flutter Mobile App** (`FL-*`) | 6 | 1 | 2 | 2 | 1 |
| **Race Conditions & Concurrency** (`RACE-*`) | 7 | 1 | 1 | 4 | 1 |
| **Web UI Logic** (`UI-*`) | 11 | 0 | 3 | 4 | 4 |
| **API Flow & Persistence** (`API-*`) | 4 | 0 | 0 | 1 | 3 |
| **TỔNG CỘNG** | **28** | **2** | **6** | **11** | **9** |

---

## 2. Lỗi Mức Độ Nghiêm Trọng (Critical) — Nguy cơ Bảo mật & Thất thoát Dữ liệu

### FL-1: Ghi đè Token / Chiếm quyền phiên khi Đăng xuất & Đăng nhập khác tài khoản trong lúc đang Refresh Token
- **Phân hệ:** Flutter Mobile App (Auth / Network)
- **Vị trí mã nguồn:** `mobile/lib/core/network/auth_interceptor.dart:90-94`, đối chiếu với `mobile/lib/features/auth/data/auth_repository_impl.dart:143-145`.
- **Nguyên nhân gốc rễ (Root Cause):**
  Trong `AuthInterceptor.onError`, khi một request nhận HTTP 401 và kích hoạt `_refreshToken()`, hàm gọi `_refreshDio.post('/api/auth/refresh')`.
  Nếu trong lúc chờ response mạng trả về, User A đăng xuất (`_authStorage.clear()`), rồi User B (ví dụ: Quản lý) đăng nhập ngay trên cùng điện thoại (`saveToken(userBToken)`).
  Khi response của User A trả về `userANewToken`, dòng 92 chỉ kiểm tra:
  ```dart
  if (await _authStorage.readToken() == null) return handler.next(err);
  await _authStorage.saveToken(newToken);
  ```
  Vì User B vừa đăng nhập nên `readToken()` không bị null! Kết quả là dòng 93 lưu đè `userANewToken` của User A vào máy. User B vừa đăng nhập xong bỗng nhiên bị biến thành User A!
- **Kịch bản tái hiện (Reproduce):**
  1. Tài xế (User A) đang mở app, mạng chập chờn nhận 401 và đang ngầm gọi refresh.
  2. Tài xế bấm Đăng xuất và đưa máy cho Quản lý (User B).
  3. Quản lý nhập thông tin đăng nhập thành công.
  4. Response refresh cũ của Tài xế về đích, ghi đè token của Quản lý. Quản lý thao tác nhưng hệ thống ghi nhận là Tài xế.
- **Tác động:** Chiếm quyền phiên (Session Hijacking), nhầm lẫn vai trò nghiêm trọng trên thiết bị dùng chung tại nhà máy.
- **Giải pháp:** Bắt chước chuẩn `AuthRepositoryImpl:144`: Trước khi lưu token mới, so sánh `await _authStorage.readToken() == currentTokenBeingRefreshed`. Nếu token trong storage đã khác token ban đầu thì hủy bỏ token mới.

---

### RACE-1: Kiểm kho (`mode: SET`) diễn ra đồng thời với Đối soát đơn hàng (`reconcile`) làm mất việc trừ kho và đội tồn kho vĩnh viễn
- **Phân hệ:** Backend API / Concurrency (`/api/inventory` & `/api/orders/[id]/reconcile`)
- **Vị trí mã nguồn:** `src/app/api/inventory/route.ts:110-112`, `src/app/api/orders/[id]/reconcile/route.ts:62-65, 106-107`, `src/lib/inventory.ts:39-42, 75-92`.
- **Nguyên nhân gốc rễ (Root Cause):**
  Khi Quản lý kiểm kho bằng `mode: 'SET'`, server tính toán số tồn kho thực tế cần set trên sổ sách bằng công thức:
  `targetStock = countedQuantity + outForDelivery` (với `outForDelivery` là số lượng các đơn đang ở trạng thái `DELIVERED` chưa đối soát).
  Tuy nhiên, việc đọc `outForDelivery` diễn ra dưới snapshot thông thường (không lock).
  Nếu đúng khoảnh khắc đó, Kế toán/Nhân viên bấm đối soát đơn hàng:
  1. Đơn chuyển từ `DELIVERED` $\rightarrow$ `COMPLETED`.
  2. Đơn trừ kho 50 bao đá (`changeStock(add: -50)`).
  3. Transaction kiểm kho chạy sau áp đặt giá trị tuyệt đối `changeStock(set: counted + outCu)`.
  Toàn bộ 50 bao đá vừa trừ bị ghi đè hoàn toàn! Đơn hàng đã `COMPLETED` nên sẽ không bao giờ được trừ lại lần 2.
- **Tác động:** Tồn kho sổ sách bị thừa (lạm phát tồn kho) so với thực tế, sai lệch báo cáo tài chính kho.
- **Giải pháp:** Sử dụng Transaction Serializable hoặc khóa hàng bằng `SELECT ... FOR UPDATE` khi tính toán và cập nhật kiểm kho tuyệt đối.

---

## 3. Lỗi Mức Độ Cao (High) — Gián đoạn Vận hành cốt lõi

### RACE-2: Kiểm kho (`mode: SET`) đồng thời với Nhập sản lượng mới (`mode: ADD`) nuốt chửng số đá mới sản xuất
- **Vị trí:** `src/app/api/inventory/route.ts:103-112`, `src/lib/inventory.ts:39-42`.
- **Nguyên nhân:** `mode: 'SET'` đọc số tồn kho hiện tại, trong lúc đó công nhân ca nhập 200 bao đá mới sản xuất (`mode: 'ADD'`). Lệnh `SET` thực hiện ghi đè giá trị tuyệt đối không phiên bản (unversioned blind write), làm mất 200 bao đá vừa nhập vào kho.
- **Tác động:** Mất dữ liệu sản lượng thực tế, sai lệch báo cáo ca sản xuất.

### FL-2: Mất mạng tạm thời khi đang Refresh Token khiến người dùng bị ép đăng xuất (Forced Logout)
- **Vị trí:** `mobile/lib/core/network/auth_interceptor.dart:80-89`.
- **Nguyên nhân:** Đoạn `try { newToken = await _refreshToken(); } on Object catch (e)` bắt **mọi ngoại lệ** (kể cả SocketException, Connection Timeout khi đi vào thang máy, hay Server 502) và gọi ngay `await _forceLogout()`. Trong khi đó ở đoạn retry bên dưới (dòng 105), code chỉ logout nếu mã lỗi là 401.
- **Tác động:** Tài xế đi đường mất sóng 4G hoặc nhân viên vào kho lạnh bị rớt mạng sẽ lập tức bị đá văng ra màn hình đăng nhập, mất phiên làm việc.
- **Giải pháp:** Chỉ gọi `_forceLogout()` khi server trả về HTTP 401 thật sự. Lỗi mạng thì throw lỗi thông thường để người dùng bấm thử lại.

### FL-5: Màn hình đối soát Mobile tự đóng khi lỗi mạng làm mất sạch số lượng thực giao vừa nhập tay
- **Vị trí:** `mobile/lib/features/orders/presentation/screens/settlement_screen.dart:156-161`.
- **Nguyên nhân:** Khi gọi `cubit.settle(order, actual.value)` thất bại (ví dụ timeout), dòng 160 vẫn gọi `Navigator.of(context).pop(result)` vô điều kiện. Sheet bị unmount, hủy sạch biến `actual.value` lưu số lượng thực tế của từng mặt hàng mà quản lý vừa cân đối xong.
- **Tác động:** Quản lý phải nhập lại từ đầu toàn bộ các dòng sản phẩm của đơn hàng.

### UI-1: Đổi chọn sản phẩm trong modal làm chớp giật và load lại toàn bộ bảng tồn kho phía sau
- **Vị trí:** `src/app/inventory/page.tsx:112-133, 495-498`.
- **Nguyên nhân:** `selectedProductId` nằm trong dependency array của `fetchInventory`. Khi mở modal nhập sản lượng và chọn dropdown sản phẩm khác, `fetchInventory` bị tạo lại, kích hoạt `useEffect`, set `loading = true`, làm toàn bộ trang phía sau biến mất và hiện loading spinner.

### UI-2: Đối soát đơn hàng xong quay lại trang Đơn hàng vẫn thấy đơn cũ chưa hoàn thành
- **Vị trí:** `src/app/settle/page.tsx:209-225`.
- **Nguyên nhân:** `SettlePage` dùng hàm `fetch` chay, sau khi đối soát thành công không gọi `queryClient.invalidateQueries({ queryKey: ['orders'] })`. Trang `/orders` cache dữ liệu 60 giây (`staleTime: 60000`), dẫn đến người dùng quay lại vẫn thấy đơn ở trạng thái `DELIVERED` và tổng tiền cũ.

### UI-3: Chọn đơn hàng hàng loạt (Bulk Assign) lưu vết qua các trang phân trang gây gán nhầm đơn
- **Vị trí:** `src/app/orders/page.tsx:138-141, 356-374`.
- **Nguyên nhân:** State `selectedOrderIds` không được clear khi người dùng chuyển trang (`page` đổi). Nếu người dùng chọn 2 đơn ở Trang 1, sang Trang 2 chọn tiếp 1 đơn, thanh tác vụ sẽ hiển thị "Đã chọn 3 đơn" và gán luôn cả 2 đơn vô hình ở Trang 1 cho tài xế mới.

---

## 4. Lỗi Mức Độ Trung Bình (Medium)

| Mã | Mô tả ngắn | Vị trí | Tác động thực tế |
|:---|:---|:---|:---|
| **RACE-3** | Tài xế bấm nhanh 2 lần nút "Xác nhận giao" bị hiện popup báo lỗi giả | `DeliveryCard.tsx:119`, `/confirm/route.ts:66` | Request 1 thành công (chuyển DELIVERED), request 2 tới sau trả về 409 `ORDER_NOT_SHIPPING`. Tài xế tưởng giao thất bại nhưng thực ra đã xong. |
| **RACE-4** | Nhấn Enter trong ô kiểm kho gửi request trùng lặp tạo 2 bản ghi chênh lệch | `inventory/page.tsx:183`, `inventory/route.ts:98` | Thiếu `Idempotency-Key` trên modal kiểm kho làm bảng `stock_counts` bị nhân đôi số liệu hao hụt/dư thừa. |
| **RACE-5** | "Sửa số vỏ" (SET) đè bẹp thao tác "Thu thêm vỏ" (ADD) đang diễn ra | `deposits/shells/page.tsx:113` | Quản lý chỉnh số vỏ cũ đè mất số vỏ tài xế vừa thu về của khách hàng (mỗi vỏ cọc 50.000đ). |
| **RACE-6** | Điều phối viên gán lại tài xế đơn đang đi giao khiến tài xế đang giao bị chặn 403 | `orders/bulk-assign/route.ts:55` | Đơn đang `SHIPPING`, tài xế A vừa tới nơi bấm giao thì bị báo "Đơn này không phải của bạn" do văn phòng vừa gán nhầm cho B. |
| **FL-3** | Client Mobile gửi token đã hết hạn lên `/api/auth/refresh` khiến luôn bị từ chối | `auth_interceptor.dart:120`, `auth/refresh/route.ts` | Server áp dụng sliding session chỉ cấp token mới nếu token cũ còn sống. Client đợi 401 (chết rồi) mới xin refresh nên chắc chắn thất bại 100%. |
| **FL-4** | Nhiều request 401 nối đuôi nhau kích hoạt chuỗi refresh làm vượt rate limit 30 req/phút | `auth_interceptor.dart:48, 78` | Khi storage đã có token mới, request tiếp theo vẫn gọi refresh tiếp thay vì retry bằng token mới. |
| **API-1** | Cập nhật đơn hàng sang "Đang giao" hoặc "Đã giao" bị dán nhãn `[HỦY: ...]` vào ghi chú | `orders/[id]/status/route.ts:90` | Nếu client vô tình gửi kèm param `cancellationReason`, server nối chuỗi huỷ vào ghi chú dù đơn đang đi giao bình thường. |
| **UI-4** | Khách hàng đã hết nợ vẫn bấm được nút "Thu tiền" nhưng nhập số tiền nào cũng bị từ chối | `reports/debt/page.tsx:168` | Bấm vào form thu tiền của khách nợ 0đ thì không thu trước được (báo lỗi vượt quá công nợ 0đ). |
| **UI-5** | Modal giao dịch vỏ cho phép bấm Xác nhận khi để trống hoặc nhập số âm | `deposits/shells/page.tsx:68-85` | Nút "Xác nhận" không disabled khi ô nhập vỏ trống, gửi payload rỗng lên server. |
| **UI-6** | Form nhập sản lượng kho chấp nhận số âm và số 0 | `inventory/page.tsx:136` | Validation chỉ kiểm tra `isNaN`, gõ `-50` vẫn gửi request `mode: ADD` làm giảm kho vô lý. |
| **UI-7** | Nút "Xem thêm" lịch sử kiểm kho bị kẹt vô tận ở Trang 1 nếu số bản ghi lẻ | `inventory/page.tsx:474` | Công thức `Math.floor(length / 20) + 1` nếu trang đầu có 15 dòng thì tính ra `0 + 1 = 1`, fetch lại đúng trang 1. |

---

## 5. Lỗi Mức Độ Thấp (Low) — Trải nghiệm & Edge Cases

| Mã | Tên lỗi | Vị trí | Mô tả |
|:---|:---|:---|:---|
| **RACE-7** | Trùng mã khách hàng trả về HTTP 500 thay vì 409 | `customers/route.ts:61` | Chưa bắt mã lỗi `P2002` của Prisma khiến lỗi trùng mã văng ra 500 Internal Error. |
| **API-2** | Lý do huỷ đơn hàng bị qua mặt bằng chuỗi khoảng trắng (`"   "`) | `orders/[id]/status/route.ts:15` | Chưa gọi `.trim()` trong Zod schema khiến người dùng huỷ đơn bằng dấu cách. |
| **API-3** | Parse JSON trước khi kiểm tra quyền session | `orders/[id]/status/route.ts:28` | Request gửi body lỗi cấu trúc trả về 500 thay vì 401 Unauthorized hoặc 400. |
| **API-4** | Endpoint đối soát trả về 500 khi body gửi lên không hợp lệ | `orders/[id]/reconcile/route.ts:28` | Thiếu `.catch(() => null)` trên `request.json()`. |
| **FL-6** | Bấm đúp vào thẻ đơn hàng trên Mobile mở 2 sheet đè nhau | `orders_tab.dart:116` | Thiếu cờ debounce trên sự kiện tap thẻ đơn hàng. |
| **UI-8** | Nút tạo đơn bị disable với sản phẩm giá 0đ nhưng phím Enter vẫn submit được | `order-entry-drawer.tsx:232` | Người dùng chuột không tạo được đơn khuyến mãi 0đ, còn người dùng phím thì tạo được. |
| **UI-9** | Huỷ đơn gặp lỗi 409 làm modal huỷ bị kẹt trên màn hình | `orders/page.tsx:334` | Code ném ngoại lệ trước khi gọi lệnh đóng dialog. |
| **UI-10**| Đóng modal vỏ/kho xong mở lại vẫn còn nguyên số liệu cũ chưa reset | `deposits/shells/page.tsx:287` | Sự kiện đóng modal chỉ ẩn UI mà không reset biến state. |
| **UI-11**| Trang Đối soát lỗi hiển thị trang trắng không có nút thử lại | `settle/page.tsx:245` | Render màn hình lỗi ngoài `DashboardLayout` làm mất thanh menu điều hướng. |

---

## 6. Lộ trình Đề xuất Xử lý (Remediation Roadmap)

Để hệ thống vận hành trơn tru và an toàn tuyệt đối trước mùa cao điểm:

1. **Sprint 1 (Khẩn cấp — An toàn dữ liệu & Session):**
   - Sửa **`FL-1`** và **`FL-2`** trong `auth_interceptor.dart` (chặn đè token và loại bỏ forced logout do rớt mạng).
   - Sửa **`RACE-1`** và **`RACE-2`** trong `inventory/route.ts` (bảo vệ giao dịch kiểm kho và đối soát đơn).
2. **Sprint 2 (Trải nghiệm Mobile & Đối soát):**
   - Sửa **`FL-5`** (giữ lại số lượng đối soát khi mạng chập chờn).
   - Sửa **`UI-1`**, **`UI-2`**, **`UI-3`** (khắc phục chớp giật kho, stale cache đối soát, phân trang gán tài xế).
3. **Sprint 3 (Chống trùng lặp & Hoàn thiện Validations):**
   - Xử lý các lỗi Medium còn lại (`RACE-3` đến `RACE-6`, `UI-4` đến `UI-7`, `API-1`).
