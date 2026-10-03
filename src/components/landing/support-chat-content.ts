/**
 * Canned Q&A cho support chat widget trên landing — nội dung trùng khớp
 * phần FAQ + Bảng giá trong src/app/page.tsx. Sửa câu chữ/giá ở ĐÂY (một
 * nguồn duy nhất, không nằm trong JSX). Không có LLM: câu nào không có
 * ở đây, widget sẽ dẫn khách sang Zalo.
 */
export const SUPPORT_GREETING =
  'Chào bạn! Chủ xưởng hay hỏi nhất mấy câu bên dưới — bấm để xem trả lời ngay nhé.';

export interface SupportQa {
  question: string;
  answer: string;
}

export const SUPPORT_QA: SupportQa[] = [
  {
    question: 'IceFlow giá bao nhiêu?',
    answer:
      'Tài khoản quản lý + kế toán miễn phí. Gói Pro tính theo tài xế hoạt động: 150.000đ/tài xế/tháng — ví dụ 3 tài xế chạy = 300.000đ/tháng. Thanh toán VietQR theo tháng, không tự động trừ.',
  },
  {
    question: 'Dùng thử miễn phí thế nào?',
    answer:
      'Dùng thử 14 ngày đầy đủ mọi tính năng, không cần thẻ tín dụng. Đăng ký trong 1 phút, có công cụ nhập khách hàng cũ từ file CSV kèm xem trước khi nhập thật.',
  },
  {
    question: 'Tài xế lớn tuổi có dùng được không?',
    answer:
      'Có. App tài xế thiết kế riêng: chữ to, nút to, chỉ có 2 việc — xem danh sách và bấm "Đã giao xong". Tài xế không cần tài khoản, mở bằng link riêng xưởng gửi.',
  },
  {
    question: 'Mất mạng có mất đơn không?',
    answer:
      'Không. Đơn lưu lên cloud ngay khi bấm xác nhận. Mất mạng app có banner cảnh báo — mạng quay lại bấm Làm mới là xong, dữ liệu không mất theo điện thoại.',
  },
  {
    question: 'In phiếu giao hàng cần máy in gì?',
    answer:
      'Bất kỳ máy in nhiệt K80 cắm vào máy tính văn phòng chạy Chrome. Bấm "In phiếu K80" là ra đúng khổ giấy, không cần cài thêm phần mềm.',
  },
  {
    question: 'Nhập khách hàng cũ có mất thời gian không?',
    answer:
      'Có công cụ nhập từ Excel/CSV: chuẩn bị cột tên, SĐT, địa chỉ rồi tải lên — hàng trăm đại lý xong trong vài phút, có bước xem trước khi nhập thật.',
  },
];
