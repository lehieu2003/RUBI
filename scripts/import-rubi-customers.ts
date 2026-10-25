/**
 * Nhập dữ liệu khách hàng thật từ sổ giấy của nhà máy vào database.
 *
 * Nguồn dữ liệu (ảnh chụp sổ, tuyến 36M, ngày 24/10/2026):
 *  - "DANH SÁCH KHÁCH HÀNG - TUYẾN 36M" 4 trang (STT 1-189, bỏ dòng trống).
 *  - Sổ "CÔNG NỢ" ngày 22/10/2026: nợ mở đầu tính theo số lượng đá chưa
 *    thanh toán x 23.000đ/đơn vị (đơn giá ghi trên chính các tờ tuyến:
 *    23 = 1 đơn vị, 46 = 2, 69 = 3, 92 = 4...).
 *
 * Script idempotent: chạy lại không nhân đôi dữ liệu (khách upsert theo mã,
 * nợ chỉ ghi khi khách chưa có dòng "Nợ đầu kỳ" cùng nguồn).
 *
 *   npx tsx scripts/import-rubi-customers.ts --yes
 */

import { PrismaClient, Prisma, LedgerType } from '@prisma/client';

const FACTORY_NAME = 'Nhà máy đá tinh khiết Rubi';
const DEBT_NOTE = 'Nợ đầu kỳ từ sổ giấy 22/10/2026';
const DEBT_DATE = new Date('2026-10-22T00:00:00+07:00');
// Đơn giá đã nợ trên sổ: 1 đơn vị đá = 23.000đ (đối chiếu cột THANH TOÁN
// trên các tờ tuyến cùng kỳ: 46/69/92/115/138/161/184 đều là bội số của 23).
const UNIT_PRICE = 23000;
const NEW_UNIT_PRICE = 50000;

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// DANH SÁCH KHÁCH HÀNG - TUYẾN 36M (24/10/2026), 4 trang, giữ nguyên tên
// trên sổ; chỉ sửa vài lỗi gõ rõ ràng (TRÁ->TRÀ, ÓC quán ốc->ỐC, CƠM TẤM->TẤM,
// BÚN ĐẦU->BÚN ĐẬU, ĂN VẬT->ĂN VẬT, CÒ 3 LÁ->CỎ 3 LÁ). Địa chỉ = tên đường
// trên sổ (bỏ các số đỏ ghi chú số lượng giao).
// ---------------------------------------------------------------------------
const ROUTE_CUSTOMERS: Array<{ stt: number; name: string; address: string }> = [
  { stt: 1, name: 'DVTC Giang Lan', address: 'Tôn Thất Thuyết' },
  { stt: 2, name: 'Hoàng Gia', address: 'Lê Duẩn' },
  { stt: 3, name: 'CF Enjoy (Súng Đức)', address: 'Lê Duẩn' },
  { stt: 4, name: 'TH Thu Thủy', address: 'Lê Duẩn' },
  { stt: 5, name: 'CF 199', address: 'Lê Duẩn' },
  { stt: 6, name: 'TS 1990 (Ngọc Trúc)', address: 'Lê Duẩn' },
  { stt: 7, name: 'Pha Chế', address: 'Lê Duẩn' },
  { stt: 8, name: 'CF Nâng 48', address: 'Lê Duẩn' },
  { stt: 9, name: 'Linh Thư Mart', address: 'Lê Duẩn' },
  { stt: 10, name: 'Công Trường Chuyên', address: 'Lê Duẩn' },
  { stt: 11, name: 'Mì Cay Khachi', address: 'Quang Trung' },
  { stt: 12, name: 'Ốc Thủy', address: 'Quang Trung' },
  { stt: 13, name: 'TH Cô Dung', address: 'Quang Trung' },
  { stt: 14, name: 'CF Goto Feel', address: 'Quang Trung' },
  { stt: 15, name: 'Duyên Quán', address: 'Quang Trung' },
  { stt: 16, name: 'TH Cô Mai', address: 'Quang Trung' },
  { stt: 17, name: 'CF Xử Quảng', address: 'Quang Trung' },
  { stt: 18, name: 'TH Diệp', address: 'Quang Trung' },
  { stt: 19, name: 'TS Natisa', address: 'Đường 3/2' },
  { stt: 20, name: 'TH Sâm Hà', address: 'Đường 3/2' },
  { stt: 21, name: 'Huyền Thợ Sơn', address: 'Đường 3/2' },
  { stt: 22, name: 'Nước Mía', address: 'Đường 3/2' },
  { stt: 23, name: 'Yuki', address: 'Đường 3/2' },
  { stt: 24, name: 'TS Toco', address: 'Đường 3/2' },
  { stt: 25, name: 'Shop Đồ', address: 'Đường 3/2' },
  { stt: 26, name: 'CF Trúc Xanh', address: 'Quang Trung' },
  { stt: 27, name: 'BBQ Smile', address: 'Quang Trung' },
  { stt: 28, name: 'Vivi', address: '' }, // địa chỉ bị gạch trên sổ
  { stt: 29, name: 'TS Rubi', address: 'Quang Trung' },
  { stt: 30, name: 'CF Thư', address: 'Quang Trung' },
  { stt: 31, name: 'Việt Râu', address: 'Quang Trung' },
  { stt: 32, name: 'CF Stepup', address: 'Quang Trung' },
  { stt: 33, name: 'Yoyo', address: 'Quang Trung' },
  { stt: 34, name: 'TS Tiểu Muội', address: 'Quang Trung' },
  { stt: 35, name: 'Trà Bí Đao', address: 'Quang Trung' },
  { stt: 36, name: 'Net Phantom', address: 'Quang Trung' },
  { stt: 37, name: 'Aroma', address: 'Quang Trung' },
  { stt: 39, name: 'BBQ Gò Chuu', address: 'Quang Trung' },
  { stt: 40, name: 'Hải Sản Cổ Hương 2', address: 'Quang Trung' },
  { stt: 41, name: 'TH Sơn Thủy', address: 'Thái Phiên' },
  { stt: 42, name: 'Mì Sasin', address: 'Quang Trung' },
  { stt: 43, name: 'TS Min', address: 'Quang Trung' },
  { stt: 44, name: 'Chè Buổi', address: 'Quang Trung' },
  { stt: 45, name: 'Lá Chuối', address: 'Quang Trung' },
  { stt: 46, name: 'Gác Măng Rê', address: 'Quang Trung' },
  { stt: 47, name: 'CF Inca', address: 'Quang Trung' },
  { stt: 48, name: 'TH 83', address: 'Quang Trung' },
  { stt: 49, name: 'TH Gao', address: 'Quang Trung' },
  { stt: 50, name: 'CF Oganic', address: 'Quang Trung' },
  { stt: 52, name: 'QN Say', address: 'Thái Phiên' },
  { stt: 54, name: 'CF Tani', address: 'Thái Phiên' },
  { stt: 55, name: 'Nước Mía', address: '' },
  { stt: 56, name: 'CF Gardeen', address: 'Quang Trung' },
  { stt: 57, name: 'Bún Đậu 1999', address: 'Quang Trung' },
  { stt: 58, name: 'Chanh Chanh', address: 'Quang Trung' },
  { stt: 59, name: 'Cơm Gà Ta', address: 'Quang Trung' },
  { stt: 60, name: 'AV Công Trường', address: 'Quang Trung' },
  { stt: 61, name: 'Tú Anh', address: 'Quang Trung' },
  { stt: 62, name: 'AV Hitea', address: 'Quang Trung' },
  { stt: 63, name: 'AV Bonbon', address: 'Quang Trung' },
  { stt: 64, name: 'Bê Thui Hùng Vương', address: 'Quang Trung' },
  { stt: 65, name: 'NM Đèn Đỏ', address: 'Quang Trung' },
  { stt: 66, name: 'Cơm Tấm', address: 'Quang Trung' },
  { stt: 67, name: 'Siu Thái', address: '' },
  { stt: 68, name: 'Aera Mart', address: '' },
  { stt: 69, name: 'CF Queen', address: 'Quang Trung' },
  { stt: 70, name: 'Cơm Bao Cáp', address: 'Quang Trung' },
  { stt: 71, name: 'Hoa Le Mart', address: 'Quang Trung' },
  { stt: 72, name: 'Cơm Toàn Phát', address: 'Đường 23/3' },
  { stt: 73, name: 'Cơm Lộc Phát', address: 'Đường 23/3' },
  { stt: 74, name: 'Mai Ơi', address: 'Tôn Đức Thắng' },
  { stt: 75, name: 'Tyty', address: 'Tôn Đức Thắng' },
  { stt: 76, name: 'Cơm Bà 8', address: '' },
  { stt: 77, name: 'Cơm 68', address: 'Đường 23/3' },
  { stt: 78, name: 'Nước Ép', address: '' },
  { stt: 79, name: 'CF Bee', address: 'Tôn Đức Thắng' },
  { stt: 80, name: 'Ốc Nam', address: 'Tôn Đức Thắng' },
  { stt: 81, name: 'QN K Tân', address: 'Tôn Đức Thắng' },
  { stt: 82, name: 'Nước Mía', address: 'Tôn Đức Thắng' },
  { stt: 83, name: 'TS Milk Tea', address: 'Tôn Đức Thắng' },
  { stt: 84, name: 'NM Hồng', address: 'Huỳnh Thúc Kháng' },
  { stt: 85, name: 'TS Nhà Lâm HT', address: 'Huỳnh Thúc Kháng' },
  { stt: 86, name: 'TH Phương Thảo', address: 'Tôn Đức Thắng' },
  { stt: 87, name: 'Bánh Bò', address: '' },
  { stt: 88, name: 'CF Võng', address: 'Tôn Đức Thắng' },
  { stt: 89, name: 'NM Trang', address: 'Tôn Đức Thắng' },
  { stt: 90, name: 'Khối', address: 'Tôn Đức Thắng' },
  { stt: 91, name: 'Kara Bunthoong', address: 'Tôn Đức Thắng' },
  { stt: 92, name: 'CF Pasion House', address: 'Tôn Đức Thắng' },
  { stt: 93, name: 'Cơm Tân Tân 2', address: 'Đường 23/3' },
  { stt: 94, name: 'Mon CF (Nếp Mía)', address: '' },
  { stt: 95, name: 'TH Thanh Mai', address: '' },
  { stt: 96, name: 'TH Hà Tràng', address: 'Tôn Đức Thắng' },
  { stt: 97, name: 'CF Ken', address: 'Phạm Văn Đồng' },
  { stt: 98, name: "CF M'Nông", address: 'Tôn Đức Thắng' },
  { stt: 99, name: 'Rau Câu', address: '' },
  { stt: 101, name: 'Gà Hấp Chanh', address: '' },
  { stt: 102, name: 'QN Hướng Liệu 1', address: 'Tôn Đức Thắng' },
  { stt: 103, name: 'NH Tiệc Cưới Hướng Liễu', address: 'Tôn Đức Thắng' },
  { stt: 104, name: 'QN Hướng Liệu 2', address: 'Tôn Đức Thắng' },
  { stt: 105, name: 'BBQ Sky Garder', address: 'Đồi Pháo' },
  { stt: 106, name: 'CF Trình', address: 'Thành Giống' },
  { stt: 107, name: 'Trâu Quang Vinh', address: 'Nguyễn Thái Học' },
  { stt: 108, name: 'CF Enjoi (Đội Pháo)', address: 'Tôn Đức Thắng' },
  { stt: 109, name: 'Say Trà (6 Thủy)', address: 'Tôn Đức Thắng' },
  { stt: 110, name: 'Robin', address: 'Đường 23/3' },
  { stt: 111, name: 'Hải Yến', address: 'Thành Giống' },
  { stt: 112, name: 'Kara Viễn Đông', address: 'Phạm Ngọc Thạch' },
  { stt: 113, name: 'Ana', address: 'Đường 23/3' },
  { stt: 114, name: 'Nướng', address: 'Tôn Đức Thắng' },
  { stt: 115, name: 'CF Like', address: 'Tôn Đức Thắng' },
  { stt: 116, name: 'Bá Mập Gâm Cấu', address: 'Đường 23/3' },
  { stt: 117, name: 'TH Bích Quang', address: 'Huỳnh Thúc Kháng' },
  { stt: 118, name: 'Zum!', address: 'Đường 23/3' },
  { stt: 119, name: 'Gà Rán Siêu Thị', address: 'Huỳnh Thúc Kháng' },
  { stt: 120, name: 'CF 19', address: 'Chợ Gia Nghĩa' },
  { stt: 121, name: 'Gàn Phương Hòa', address: 'Đường 23/3' },
  { stt: 122, name: 'CF Now Siêu Thị', address: 'Đường 23/3' },
  { stt: 123, name: 'CF Enjoi (Siêu Thị)', address: 'Đường 23/3' },
  { stt: 124, name: 'CF Land (Hồ Vit)', address: 'Tôn Đức Thắng' },
  { stt: 125, name: 'CF Sweethome', address: 'Tôn Đức Thắng' },
  { stt: 126, name: 'CF Blue', address: 'Tôn Đức Thắng' },
  { stt: 127, name: 'Thiên Sport', address: 'Tôn Đức Thắng' },
  { stt: 128, name: 'Camblu', address: 'Lý Thường Kiệt' },
  { stt: 129, name: 'Cơm Tân Tân', address: 'Lý Thường Kiệt' },
  { stt: 130, name: 'Hoàng Hào', address: '' },
  { stt: 131, name: 'Chill', address: '' },
  { stt: 132, name: 'CF Hốt Tóc', address: '' },
  { stt: 133, name: 'Trà Chanh', address: '' },
  { stt: 134, name: 'Tiệm Trà T3', address: '' },
  { stt: 135, name: "TS M'Lem", address: 'Chu Văn An' },
  { stt: 136, name: 'Net CVA', address: 'Chu Văn An' },
  { stt: 137, name: 'QN Đồn Minh', address: 'Chu Văn An' },
  { stt: 138, name: 'TS Min', address: 'Chu Văn An' },
  { stt: 139, name: 'Tobcki', address: 'Nguyễn Tri Phương' },
  { stt: 140, name: 'CF C1', address: 'Nguyễn Tri Phương' },
  { stt: 141, name: 'NM Cò 3', address: 'Nguyễn Tri Phương' },
  { stt: 142, name: 'Bò Né KT', address: 'Chu Văn An' },
  { stt: 143, name: 'TS Bí Chu', address: 'Chu Văn An' },
  { stt: 144, name: 'Ốc 52', address: 'Chu Văn An' },
  { stt: 145, name: 'Bún Đậu HN', address: 'Chu Văn An' },
  { stt: 146, name: 'Tuấn Khỉ', address: '' },
  { stt: 147, name: 'Gà Mài Dầu', address: '' },
  { stt: 148, name: 'CF Tigon', address: 'Chu Văn An' },
  { stt: 149, name: 'CF Green', address: 'Chu Văn An' },
  { stt: 150, name: 'CF Gác Nhỏ', address: 'Chu Văn An' },
  { stt: 151, name: 'CF Helen', address: 'Chu Văn An' },
  { stt: 152, name: 'CF ACA', address: '' },
  { stt: 153, name: 'Bún Đậu Gánh', address: 'Tôn Đức Thắng' },
  { stt: 154, name: 'Sáu Thủy', address: 'Tôn Đức Thắng' },
  { stt: 155, name: 'Bò Né 79', address: 'Tôn Đức Thắng' },
  { stt: 156, name: 'Ăn Vặt', address: 'Tôn Đức Thắng' },
  { stt: 157, name: 'CF Rio', address: 'Tôn Đức Thắng' },
  { stt: 158, name: 'Chè Sầu Riêng 36M', address: 'Tôn Đức Thắng' },
  { stt: 159, name: 'Met', address: 'Tôn Đức Thắng' },
  { stt: 160, name: 'BBQ Sòng', address: 'Ngô Mày' },
  { stt: 161, name: 'Cá Mèn', address: '' },
  { stt: 162, name: 'CF Thảo Nguyên', address: '' },
  { stt: 163, name: 'TH Cổ Quyết', address: '' },
  { stt: 164, name: 'Ngọc Giang', address: 'Tôn Đức Thắng' },
  { stt: 165, name: 'Net 79', address: 'Tôn Đức Thắng' },
  { stt: 166, name: 'BBQ Hàn', address: 'Tôn Đức Thắng' },
  { stt: 167, name: 'Trà Tắc 36M', address: 'Tôn Đức Thắng' },
  { stt: 169, name: 'CF Muối', address: 'Tôn Đức Thắng' },
  { stt: 170, name: 'Như Ý', address: '' },
  { stt: 171, name: 'QN Độc Vòng', address: 'Tống Duy Tản' },
  { stt: 172, name: 'Bida Nghĩa Tỉn', address: 'Nguyễn Tất Thành' },
  { stt: 173, name: 'Bida Figo 2', address: 'Tôn Đức Thắng' },
  { stt: 174, name: 'CF Mộc Nguyên', address: 'Tôn Đức Thắng' },
  { stt: 175, name: 'CF The New Dano (36M)', address: 'Tôn Đức Thắng' },
  { stt: 176, name: 'CF Enjoi (Tà Đũng)', address: 'Tôn Đức Thắng' },
  { stt: 177, name: 'Quán Net Demons', address: '' },
  { stt: 178, name: 'TS N2', address: '' },
  { stt: 179, name: 'Hương Thu', address: '' },
  { stt: 180, name: 'Cơm Chay', address: '' },
  { stt: 181, name: 'CF Mevela', address: 'Chu Văn An' },
  { stt: 182, name: 'Cơm Sườn', address: '' },
  { stt: 183, name: 'Cỏ 3 Lá', address: '' },
  { stt: 184, name: 'Nem Thanh Sang', address: '' },
  { stt: 185, name: 'TH Cổ Nguyệt', address: '' },
  { stt: 186, name: 'Vân Nguyên', address: '' },
  { stt: 187, name: 'Godere', address: '' },
  { stt: 188, name: 'Lã Nướng', address: '' },
  { stt: 189, name: 'Đội Quán', address: '' },
];

// ---------------------------------------------------------------------------
// SỔ CÔNG NỢ 22/10/2026 -> nợ mở đầu. `match` là tên khách trong
// ROUTE_CUSTOMERS; `asWritten` là tên ghi trên sổ công nợ để đối chiếu. Số
// lượng là đơn vị đá chưa thanh toán.
// ---------------------------------------------------------------------------
const OPENING_DEBTS: Array<{
  match: string;
  asWritten: string;
  units: number;
  note?: string;
}> = [
  { match: 'Kara Viễn Đông', asWritten: 'Viễn Đông', units: 15.5 }, // 13,5 + 2
  { match: 'Vân Nguyên', asWritten: 'Văn Nguyễn', units: 6.5, note: 'Đối chiếu tên uncertain: sổ ghi "Văn Nguyễn"' },
  { match: 'BBQ Hàn', asWritten: 'BBQ Hàn', units: 16 }, // 10 + 6
  { match: 'BBQ Sòng', asWritten: 'Sóng', units: 16 }, // 13 + 3
  { match: 'Lã Nướng', asWritten: 'Lõ Nướng', units: 21 },
  { match: 'CF Pasion House', asWritten: 'Passion', units: 23 }, // 22 + 1
  { match: 'Như Ý', asWritten: 'Như Ý', units: 9 }, // 8 + 1
  { match: 'Tuấn Khỉ', asWritten: 'Tuấn Khỉ', units: 13, note: 'Sổ ghi chú CK (chuyển khoản)' }, // 12 + 1
  { match: 'Gà Hấp Chanh', asWritten: 'Gã lắp elanh', units: 16, note: 'Đối chiếu tên uncertain' }, // 13 + 3
  { match: 'CF Mevela', asWritten: 'Mevela', units: 2 },
  { match: 'Cơm Bao Cáp', asWritten: 'Cồn bao cập', units: 8, note: 'Đối chiếu tên uncertain' }, // 6 + 2
  { match: 'Ana', asWritten: 'Ana', units: 8 }, // 6 + 2
  { match: 'Tobcki', asWritten: 'Toboki', units: 7 }, // 6 + 1
  { match: 'CF Gardeen', asWritten: 'CF Garden (56)', units: 2 }, // 8 bị gạch, còn 2
  { match: 'Thiên Sport', asWritten: 'Thiên Sport', units: 1 },
  { match: 'BBQ Smile', asWritten: 'BBQ Smile', units: 2 },
  { match: 'CF Thư', asWritten: 'CF Thư', units: 4, note: 'Sổ ghi 1 và 2+2 hai dòng' },
  { match: 'Gác Măng Rê', asWritten: 'Gác măng rê', units: 1 },
  { match: "CF M'Nông", asWritten: "CF M' nong", units: 2 }, // 1 + 1
  { match: 'CF ACA', asWritten: 'CF ACA', units: 1 },
  { match: 'Cơ Chiu', asWritten: 'Cơ chiu', units: 3, note: 'Không tìm thấy trên tờ tuyến — tạo khách riêng' },
];

// Các dòng trên sổ công nợ đã bị gạch (coi như đã thanh toán/xóa nợ) hoặc không
// đọc được số lượng -> KHÔNG nhập, cần chủ nhà máy xác nhận lại.
const DEBT_ROWS_SKIPPED = [
  { asWritten: 'Óc 52', reason: 'số 12+1 bị gạch trên sổ' },
  { asWritten: 'CF Bee', reason: 'số 7 bị gạch trên sổ' },
  { asWritten: 'Bún đầu HN', reason: 'số 1 bị gạch trên sổ' },
  { asWritten: 'Mai ơi', reason: 'số 1 bị gạch trên sổ' },
  { asWritten: 'Cơm tâu tâu 2', reason: 'số 1 bị gạch trên sổ (Cơm Tân Tân 2?)' },
  { asWritten: 'Tigon', reason: 'số 1 bị gạch trên sổ' },
  { asWritten: 'Tiệm trà T3', reason: 'không đọc được số lượng ("NN8 AK")' },
  { asWritten: 'Đốc Vọng', reason: 'không có số lượng trên sổ (QN Độc Vòng)' },
];

// Sản phẩm theo yêu cầu: chỉ có 2 loại đá, đều 20kg, 50.000đ.
const PRODUCTS = [
  { id: 'prod-ong-20', name: 'Đá Ống', sizeKg: 20, unit: 'Bao' },
  { id: 'prod-mi-20', name: 'Đá Mi', sizeKg: 20, unit: 'Bao' },
];

// Các sản phẩm demo từ seed không có thật ở nhà máy -> ngừng bán.
const DEPRECATED_PRODUCT_NAMES = ['Đá Bi', 'Đá Viên', 'Đá Cây'];

async function main() {
  if (process.argv.includes('--yes') === false) {
    throw new Error('Thêm cờ --yes để xác nhận chạy (script ghi vào database thật).');
  }

  const dbHost = new URL(process.env.DIRECT_URL || process.env.DATABASE_URL || '').hostname;
  console.log(`▶ Database: ${dbHost}`);

  const factory = await prisma.factory.findFirst({ where: { name: FACTORY_NAME } });
  if (!factory) throw new Error(`Không tìm thấy nhà máy "${FACTORY_NAME}".`);
  console.log(`▶ Nhà máy: ${factory.name} (${factory.id})`);

  // ---- 1. Sản phẩm ---------------------------------------------------------
  for (const p of PRODUCTS) {
    const product = await prisma.product.upsert({
      where: { id: p.id },
      update: { name: p.name, sizeKg: p.sizeKg, unit: p.unit, isActive: true },
      create: { id: p.id, name: p.name, sizeKg: p.sizeKg, unit: p.unit, factoryId: factory.id, isActive: true },
    });
    await prisma.globalPrice.upsert({
      where: { productId: product.id },
      update: { pricePerUnit: new Prisma.Decimal(NEW_UNIT_PRICE) },
      create: { productId: product.id, pricePerUnit: new Prisma.Decimal(NEW_UNIT_PRICE) },
    });
    console.log(`  ✓ Sản phẩm: ${product.name} ${product.sizeKg}kg @ ${NEW_UNIT_PRICE.toLocaleString('vi-VN')}đ`);
  }

  const deprecated = await prisma.product.updateMany({
    where: { factoryId: factory.id, name: { in: DEPRECATED_PRODUCT_NAMES } },
    data: { isActive: false },
  });
  console.log(`  ✓ Ngừng bán ${deprecated.count} sản phẩm demo (Đá Bi / Đá Viên / Đá Cây)`);

  // ---- 2. Khách hàng -------------------------------------------------------
  let customerSeq = 5; // KH-001..005 đã dùng cho dữ liệu demo cũ
  const customersByName = new Map<string, string>(); // name -> id
  for (const c of ROUTE_CUSTOMERS) {
    customerSeq += 1;
    const code = `KH-${String(customerSeq).padStart(3, '0')}`;
    const customer = await prisma.customer.upsert({
      where: { code_factoryId: { code, factoryId: factory.id } },
      update: { name: c.name, address: c.address },
      create: { code, name: c.name, address: c.address, phone: '', factoryId: factory.id, isActive: true },
    });
    customersByName.set(c.name, customer.id);
  }
  console.log(`  ✓ ${ROUTE_CUSTOMERS.length} khách hàng từ Danh sách khách hàng - Tuyến 36M (KH-006 → KH-${String(customerSeq).padStart(3, '0')})`);

  // Khách có công nợ nhưng không nằm trên tờ tuyến
  for (const d of OPENING_DEBTS) {
    if (!customersByName.has(d.match)) {
      customerSeq += 1;
      const code = `KH-${String(customerSeq).padStart(3, '0')}`;
      const customer = await prisma.customer.create({
        data: { code, name: d.match, address: '', phone: '', factoryId: factory.id, isActive: true },
      });
      customersByName.set(d.match, customer.id);
      console.log(`  ✓ Tạo khách riêng cho công nợ: ${d.match} (${code}) — "${d.asWritten}" trên sổ`);
    }
  }

  // ---- 3. Công nợ mở đầu ---------------------------------------------------
  let debtCount = 0;
  let debtTotal = new Prisma.Decimal(0);
  for (const d of OPENING_DEBTS) {
    const customerId = customersByName.get(d.match);
    if (!customerId) throw new Error(`Lỗi nội bộ: không tìm thấy khách "${d.match}"`);
    const amount = new Prisma.Decimal(d.units).mul(UNIT_PRICE);
    const existing = await prisma.customerDebtLedger.findFirst({
      where: { customerId, notes: { startsWith: DEBT_NOTE } },
    });
    if (existing) continue;
    await prisma.customerDebtLedger.create({
      data: {
        customerId,
        type: LedgerType.DEBT,
        amount,
        notes: d.note ? `${DEBT_NOTE} — "${d.asWritten}": ${d.units} đơn vị x 23.000đ. ${d.note}` : `${DEBT_NOTE} — "${d.asWritten}": ${d.units} đơn vị x 23.000đ`,
        createdAt: DEBT_DATE,
      },
    });
    debtCount += 1;
    debtTotal = debtTotal.add(amount);
  }
  console.log(`  ✓ ${debtCount} khoản nợ mở đầu, tổng ${debtTotal.toNumber().toLocaleString('vi-VN')}đ`);

  console.log('\nDòng công nợ đã bỏ (cần xác nhận lại trên sổ):');
  for (const s of DEBT_ROWS_SKIPPED) console.log(`  - ${s.asWritten}: ${s.reason}`);
}

main()
  .catch((e) => {
    console.error('✖ Import thất bại:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
