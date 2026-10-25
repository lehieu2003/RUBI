import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chính sách bảo mật — IceFlow',
  description:
    'Chính sách bảo mật của ứng dụng IceFlow và hệ thống quản lý bán hàng của Nhà máy đá tinh khiết Rubi.',
};

// Trang công khai (không cần đăng nhập) — Google Play Console yêu cầu URL
// chính sách bảo mật khi đăng ứng dụng.
const SECTIONS: Array<{ title: string; paragraphs: string[] }> = [
  {
    title: '1. Ứng dụng này là gì?',
    paragraphs: [
      'IceFlow là hệ thống quản lý đơn hàng, giao hàng và công nợ của Nhà máy đá tinh khiết Rubi (TP. Gia Nghĩa, Đắk Nông), gồm ứng dụng web dành cho nhân viên và quản lý, cùng ứng dụng di động dành cho tài xế.',
      'Tài khoản trên ứng dụng không được đăng ký công khai — chỉ Quản lý nhà máy trực tiếp tạo và cấp cho nhân viên, tài xế của mình.',
    ],
  },
  {
    title: '2. Dữ liệu chúng tôi thu thập',
    paragraphs: [
      'Thông tin tài khoản: email, họ tên, số điện thoại (nếu có) — do Quản lý nhập khi tạo tài khoản cho bạn.',
      'Dữ liệu công việc: đơn hàng, thông tin khách hàng, công nợ, lịch làm việc, kho hàng và các thao tác trên hệ thống.',
      'Ảnh chụp biên bản giao hàng: khi tài xế xác nhận giao, ứng dụng có thể dùng camera của điện thoại để chụp chứng từ giao hàng.',
      'Ứng dụng không thu thập vị trí thiết bị, không đọc danh bạ, không truy cập tệp ngoài ảnh chụp giao hàng do bạn chủ động chụp.',
    ],
  },
  {
    title: '3. Mục đích sử dụng',
    paragraphs: [
      'Dữ liệu chỉ được dùng để vận hành nghiệp vụ của nhà máy: tiếp nhận đơn, điều phối giao hàng, xác nhận đã giao, đối soát công nợ và thống kê sản xuất — không dùng cho quảng cáo hay bất kỳ mục đích nào khác.',
    ],
  },
  {
    title: '4. Lưu trữ và bảo vệ',
    paragraphs: [
      'Dữ liệu được lưu trên hạ tầng đám mây của Supabase và truyền qua kết nối HTTPS mã hóa.',
      'Mọi truy cập đều yêu cầu đăng nhập bằng tài khoản do Quản lý cấp (mã phiên JWT, tự hết hạn). Mỗi người chỉ thấy được phần dữ liệu liên quan đến vai trò của mình: tài xế chỉ thấy danh sách giao hàng của mình, nhân viên không thấy báo cáo quản trị.',
      'Mật khẩu được mã hóa one-way (bcrypt); hệ thống không lưu mật khẩu dạng gốc.',
    ],
  },
  {
    title: '5. Chia sẻ với bên thứ ba',
    paragraphs: [
      'Chúng tôi không bán và không chia sẻ dữ liệu cho bên thứ ba cho mục đích thương mại. Dữ liệu chỉ có thể được cung cấp khi pháp luật yêu cầu.',
    ],
  },
  {
    title: '6. Quyền của bạn',
    paragraphs: [
      'Bạn có quyền xem, sửa thông tin tài khoản của mình trong ứng dụng và yêu cầu xóa tài khoản khi không còn làm việc cho nhà máy — liên hệ trực tiếp Quản lý để thực hiện.',
      'Dữ liệu giao dịch đã phát sinh có thể được lưu lại theo yêu cầu kế toán của nhà máy ngay cả sau khi tài khoản bị xóa.',
    ],
  },
  {
    title: '7. Trẻ em',
    paragraphs: [
      'Ứng dụng dành cho nhân viên, tài xế trong độ tuổi lao động và không hướng đến trẻ em dưới 13 tuổi.',
    ],
  },
  {
    title: '8. Thay đổi chính sách',
    paragraphs: [
      'Chính sách có thể được cập nhật theo thay đổi của hệ thống; phiên bản mới luôn đăng tại địa chỉ này.',
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-5 py-12">
      <h1 className="text-2xl font-bold text-on-surface">Chính sách bảo mật</h1>
      <p className="mt-1 text-sm text-on-surface-variant">
        Ứng dụng IceFlow — Nhà máy đá tinh khiết Rubi
      </p>

      <div className="mt-8 space-y-7">
        {SECTIONS.map((section) => (
          <section key={section.title}>
            <h2 className="text-base font-bold text-on-surface">{section.title}</h2>
            <div className="mt-2 space-y-2">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph.slice(0, 24)} className="text-sm leading-relaxed text-on-surface-variant">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        ))}
        <p className="border-t border-outline-variant pt-6 text-xs text-on-surface-variant">
          Liên hệ: Quản trị viên hệ thống — Nhà máy đá tinh khiết Rubi, TP. Gia Nghĩa, Đắk Nông.
        </p>
      </div>
    </main>
  );
}
