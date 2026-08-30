import Link from 'next/link';
import { Snowflake, ArrowLeft, ShieldCheck, Lock, EyeOff, Database } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chính Sách Bảo Mật | IceFlow SaaS',
  description: 'Chính sách bảo mật thông tin và dữ liệu kinh doanh của khách hàng tại IceFlow SaaS',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#f9f9ff] text-[#111c2d]">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[#c2c6d3] bg-white px-6 py-4 shadow-xs">
        <div className="mx-auto flex max-w-[1000px] items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded bg-[#004a99] text-white">
              <Snowflake className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-black tracking-tight text-[#002754]">IceFlow SaaS</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded border border-[#c2c6d3] bg-white px-3.5 py-1.5 text-xs font-bold text-[#424751] hover:bg-[#f0f3ff] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại trang chủ
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-[1000px] p-6 sm:p-10">
        <div className="rounded border border-[#c2c6d3] bg-white p-8 sm:p-12 shadow-sm space-y-8">
          <div className="border-b border-[#e7eeff] pb-6">
            <div className="inline-flex items-center gap-2 rounded bg-[#a0f399]/30 px-3 py-1 text-xs font-bold text-[#1b6d24] mb-3">
              <ShieldCheck className="h-4 w-4" />
              CHÍNH SÁCH BẢO VỆ DỮ LIỆU
            </div>
            <h1 className="text-3xl font-black text-[#002754] tracking-tight">
              Chính Sách Bảo Mật Dữ Liệu
            </h1>
            <p className="mt-2 text-xs text-[#737783]">
              Hiệu lực từ: Tháng 08/2026 • Cam kết bảo mật tuyệt đối dữ liệu khách hàng và công nợ của xưởng đá.
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#002754] flex items-center gap-2">
              <Database className="h-5 w-5 text-[#004a99]" />
              1. Thu thập dữ liệu
            </h2>
            <p className="text-sm text-[#424751] leading-relaxed">
              Chúng tôi chỉ thu thập các thông tin cần thiết phục vụ cho việc vận hành phần mềm: Họ tên, số điện thoại, email của chủ xưởng; danh sách khách hàng đại lý, số lượng đặt hàng, định vị GPS khi giao hàng và lịch sử cọc vỏ bao.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#002754] flex items-center gap-2">
              <EyeOff className="h-5 w-5 text-[#004a99]" />
              2. Quyền sở hữu dữ liệu kinh doanh
            </h2>
            <p className="text-sm text-[#424751] leading-relaxed">
              Toàn bộ danh bạ đại lý, bảng giá bán riêng, doanh thu và số liệu công nợ thuộc <strong>quyền sở hữu độc quyền của nhà máy</strong>. IceFlow cam kết <strong>KHÔNG</strong> chia sẻ, bán hoặc sử dụng dữ liệu khách hàng của bạn cho bất kỳ đối thủ hay bên thứ ba nào dưới mọi hình thức.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#002754] flex items-center gap-2">
              <Lock className="h-5 w-5 text-[#004a99]" />
              3. Cơ chế mã hóa và Cách ly dữ liệu (Multi-tenant Isolation)
            </h2>
            <p className="text-sm text-[#424751] leading-relaxed">
              - <strong>Cách ly tuyệt đối (Row-Level Multi-Tenancy)</strong>: Dữ liệu của từng xưởng được mã hóa và phân tách bằng định danh `factoryId`. Nhân viên hoặc chủ xưởng khác hoàn toàn không thể truy cập dữ liệu của nhà máy bạn.
              <br />
              - <strong>Mã hóa chuẩn ngân hàng</strong>: Mọi giao tiếp dữ liệu đều được truyền tải qua giao thức bảo mật SSL/HTTPS (TLS 1.3). Mật khẩu được mã hóa một chiều bằng thuật toán `bcrypt` với 12 vòng lặp.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-[#002754] flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#004a99]" />
              4. Sao lưu và Xuất dữ liệu linh hoạt
            </h2>
            <p className="text-sm text-[#424751] leading-relaxed">
              Dữ liệu được sao lưu định kỳ hàng ngày. Chủ xưởng có toàn quyền xuất toàn bộ dữ liệu (Đơn hàng, Báo cáo nợ, Tồn kho, Lịch sử vỏ bao) ra file Excel bất kỳ lúc nào để lưu trữ nội bộ.
            </p>
          </section>

          <div className="rounded bg-[#dee8ff]/40 border border-[#004a99]/20 p-5 text-xs text-[#00346f]">
            <strong>Liên hệ về quyền riêng tư:</strong> Nếu bạn có bất kỳ câu hỏi hoặc yêu cầu xóa dữ liệu tài khoản, vui lòng gửi email về <strong>privacy@iceflow.vn</strong>. Chúng tôi sẽ phản hồi trong vòng 24 giờ làm việc.
          </div>
        </div>
      </main>
    </div>
  );
}
