import Link from 'next/link';
import { Snowflake, ArrowLeft, ShieldCheck, FileText, CheckCircle2 } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Điều Khoản Dịch Vụ | IceFlow SaaS',
  description: 'Điều khoản sử dụng dịch vụ phần mềm quản lý xưởng đá IceFlow SaaS',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-surface text-on-surface">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-outline-variant bg-card px-6 py-4 shadow-xs">
        <div className="mx-auto flex max-w-[1000px] items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded bg-[#004a99] text-white">
              <Snowflake className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-black tracking-tight text-primary-dark">IceFlow SaaS</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded border border-outline-variant bg-card px-3.5 py-1.5 text-xs font-bold text-on-surface-variant hover:bg-container-low transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại trang chủ
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-[1000px] p-6 sm:p-10">
        <div className="rounded border border-outline-variant bg-card p-8 sm:p-12 shadow-sm space-y-8">
          <div className="border-b border-outline-soft pb-6">
            <div className="inline-flex items-center gap-2 rounded bg-container-high px-3 py-1 text-xs font-bold text-primary-accent mb-3">
              <FileText className="h-4 w-4" />
              ĐIỀU KHOẢN SỬ DỤNG
            </div>
            <h1 className="text-3xl font-black text-primary-dark tracking-tight">
              Điều Khoản Dịch Vụ IceFlow SaaS
            </h1>
            <p className="mt-2 text-xs text-faint">
              Cập nhật lần cuối: Ngày 30 tháng 08 năm 2026 • Áp dụng cho tất cả các nhà máy và người dùng hệ thống.
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-primary-dark flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary-accent" />
              1. Chấp thuận điều khoản
            </h2>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Khi đăng ký tài khoản, truy cập hoặc sử dụng phần mềm <strong>IceFlow SaaS</strong>, Quý khách hàng (Bao gồm Chủ xưởng, Kế toán, Nhân viên và Tài xế) đồng ý tuân thủ và chịu sự ràng buộc bởi các điều khoản, điều kiện được quy định tại văn bản này.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-primary-dark flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary-accent" />
              2. Mô tả dịch vụ & Quyền sử dụng
            </h2>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              IceFlow cung cấp giải pháp công nghệ trên nền tảng đám mây hỗ trợ quản lý vận hành xưởng sản xuất đá: Lên đơn hàng, in phiếu nhiệt K80/A5, kiểm soát kho lạnh, định vị phân ca đội xe và đối soát công nợ. Người dùng được cấp quyền truy cập phi độc quyền theo gói cước (Dùng thử, Gói PRO hoặc Gói Doanh nghiệp).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-primary-dark flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary-accent" />
              3. Tài khoản và Bảo mật
            </h2>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Chủ xưởng có trách nhiệm bảo mật thông tin tài khoản quản trị và chịu trách nhiệm cho mọi hoạt động diễn ra dưới tài khoản của mình. Không được chia sẻ tài khoản cho bên thứ ba ngoài mục đích vận hành của xưởng.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-primary-dark flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary-accent" />
              4. Gói cước và Thanh toán
            </h2>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Mỗi nhà máy được dùng thử miễn phí 14 ngày không ràng buộc thẻ. Khi hết hạn dùng thử, nhà máy cần thanh toán phí duy trì dịch vụ theo tháng/năm qua hình thức chuyển khoản VietQR để tiếp tục sử dụng. Phí dịch vụ không được hoàn lại sau khi đã kích hoạt kỳ sử dụng.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-primary-dark flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary-accent" />
              5. Cam kết tính sẵn sàng & Hỗ trợ kỹ thuật
            </h2>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              IceFlow cam kết duy trì thời gian hoạt động của hệ thống (Uptime) tối thiểu 99.5%, đảm bảo xưởng hoạt động ổn định trong các mùa cao điểm nắng nóng. Đội ngũ kỹ thuật hỗ trợ 24/7 qua Zalo và Hotline khi có sự cố khẩn cấp.
            </p>
          </section>

          <div className="rounded bg-surface border border-outline-soft p-5 text-xs text-faint flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-primary-accent shrink-0" />
            <span>
              Nếu có bất kỳ thắc mắc nào liên quan đến điều khoản dịch vụ, xin vui lòng liên hệ Bộ phận Chăm sóc Khách hàng IceFlow qua email <strong>hotro@iceflow.vn</strong> hoặc Hotline <strong>0909 123 456</strong>.
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
