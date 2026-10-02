'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-provider';
import {
  IceIcon,
  BagLossIcon,
  DebtConfusionIcon,
  BlindProfitIcon,
  ZaloMessIcon,
  CalculatorIcon,
  GlobeIcon,
  CloudIcon,
  ServerIcon,
} from '@/components/landing/icons';
import { StatItem, PainCard, LocalCard } from '@/components/landing/cards';

export default function LandingPage() {
  const { user } = useAuth();
  const [bagLoss, setBagLoss] = useState(50);
  const yearlyLoss = Math.round((bagLoss * 12 * 20000) / 1000000);

  const dashboardUrl = user?.role === 'SUPER_ADMIN' ? '/admin/dashboard' : user?.role === 'DRIVER' ? '/driver' : '/dashboard';

  return (
    <div className="min-h-screen bg-surface text-on-surface overflow-x-hidden">
      {/* Background Soft Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-container-high/60 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-container-highest/50 rounded-full blur-[120px]" />
      </div>

      {/* Grid Pattern Overlay */}
      <div
        className="fixed inset-0 overflow-hidden pointer-events-none opacity-[0.4]"
        style={{
          backgroundImage: 'linear-gradient(#e7eeff 1px, transparent 1px), linear-gradient(90deg, #e7eeff 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Navbar */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 max-w-[1200px] mx-auto bg-card/90 backdrop-blur-md border border-outline-variant shadow-xs rounded-xl mt-4 transition-all">
        <div className="flex items-center gap-2.5 text-xl font-bold">
          <div className="w-8 h-8 bg-[#004a99] rounded flex items-center justify-center text-white shadow-2xs">
            <IceIcon />
          </div>
          <span className="text-primary-dark font-black tracking-tight">IceFlow</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#pain" className="text-xs font-bold uppercase tracking-wider text-on-surface-variant hover:text-primary-accent transition-colors">
            Nỗi đau
          </a>
          <a href="#features" className="text-xs font-bold uppercase tracking-wider text-on-surface-variant hover:text-primary-accent transition-colors">
            Tính năng
          </a>
          {user ? (
            <Link
              href={dashboardUrl}
              className="px-4 py-2 bg-[#004a99] hover:bg-[#00346f] text-white font-bold text-xs rounded transition-all shadow-xs"
            >
              VÀO BẢNG ĐIỀU KHIỂN &rarr;
            </Link>
          ) : (
            <div className="flex items-center gap-2.5">
              <Link
                href="/login"
                className="px-3.5 py-1.5 border border-outline-variant bg-card text-primary-deep font-bold text-xs rounded hover:bg-container-high transition-all"
              >
                Đăng nhập
              </Link>
              <Link
                href="/register"
                className="px-4 py-1.5 bg-[#004a99] hover:bg-[#00346f] text-white font-bold text-xs rounded transition-all shadow-xs"
              >
                Dùng thử 14 ngày
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="relative max-w-[900px] mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-tertiary-fixed/60 border border-tertiary-container/20 rounded-full text-xs text-tertiary-container font-bold mb-6">
          <span className="w-2 h-2 bg-[#ba1a1a] rounded-full animate-pulse" />
          <span>Chủ xưởng đá đang thất thoát tiền & vỏ bao mỗi ngày</span>
        </div>

        <h1 className="text-[clamp(2.2rem,5vw,3.5rem)] font-black leading-[1.15] tracking-tight text-on-surface mb-6">
          Quản Lý Xưởng Đá Thảnh Thơi
          <br />
          <span className="text-primary-accent">
            Chống Thất Thoát Tuyệt Đối
          </span>
        </h1>

        <p className="text-base text-on-surface-variant leading-relaxed mb-8 max-w-[620px] mx-auto">
          Số hóa đơn hàng chỉ 30 giây, theo dõi công nợ đại lý và quản lý vỏ bao tự động.
          <span className="text-on-surface font-semibold"> Dễ dùng hơn Zalo, nhanh hơn sổ tay.</span>
        </p>

        <div className="flex items-center justify-center gap-3 flex-wrap">
          {user ? (
            <Link
              href={dashboardUrl}
              className="px-7 py-3.5 bg-[#004a99] hover:bg-[#00346f] text-white font-bold text-sm rounded shadow-sm transition-all"
            >
              TIẾP TỤC QUẢN LÝ XƯỞNG &rarr;
            </Link>
          ) : (
            <>
              <Link
                href="/register"
                className="px-7 py-3.5 bg-[#004a99] hover:bg-[#00346f] text-white font-bold text-sm rounded shadow-sm transition-all"
              >
                DÙNG THỬ MIỄN PHÍ 14 NGÀY
              </Link>
              <Link
                href="/login"
                className="px-7 py-3.5 bg-card text-primary-deep font-bold text-sm rounded border border-outline-variant hover:bg-container-high transition-all"
              >
                ĐĂNG NHẬP NGAY
              </Link>
            </>
          )}
        </div>

        <p className="mt-4 text-xs text-faint">Không cần thẻ tín dụng • Không cần cài đặt phức tạp</p>

        <div className="mt-14 flex items-center justify-center gap-8 flex-wrap border-t border-outline-variant pt-8">
          <StatItem value="50+" label="Nhà máy đá" />
          <div className="w-px h-10 bg-container-highest" />
          <StatItem value="1,000+" label="Đơn hàng / ngày" />
          <div className="w-px h-10 bg-container-highest" />
          <StatItem value="30s" label="Thời gian lên đơn" />
        </div>
      </section>

      {/* Pain Points */}
      <section id="pain" className="relative py-16 px-6 bg-card border-y border-outline-variant">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block px-3 py-1 bg-error-container border border-[#ba1a1a]/20 rounded text-xs font-bold text-error mb-2 uppercase tracking-wider">
              Nỗi đau thực tế
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-on-surface mb-2">Những Vấn Đề Khiến Chủ Xưởng Mất Tiền</h2>
            <p className="text-xs text-on-surface-variant max-w-[500px] mx-auto">Ghi sổ tay và chốt Zalo thủ công gây ra hàng loạt sai sót.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <PainCard
              icon={<BagLossIcon />}
              title="Thất thoát vỏ bao"
              desc="Đến cuối tháng mới biết thiếu hụt hàng trăm bao — không rõ khách nào đang nợ."
              delay={0}
            />
            <PainCard
              icon={<DebtConfusionIcon />}
              title="Sai lệch công nợ"
              desc="Tài xế giao hàng thu tiền nhưng quên nộp, sổ tay ghi chép nhầm lẫn số lượng."
              delay={100}
            />
            <PainCard
              icon={<BlindProfitIcon />}
              title="Mù mờ lợi nhuận"
              desc="Cuối tháng không biết thực sự lãi bao nhiêu sau khi trừ tiền điện, xăng xe và vỏ."
              delay={200}
            />
            <PainCard
              icon={<ZaloMessIcon />}
              title="Lộn xộn tin nhắn Zalo"
              desc="Một ngày 50-80 đơn qua Zalo — bỏ sót đơn, giao nhầm loại đá là chuyện thường."
              delay={300}
            />
          </div>
        </div>
      </section>

      {/* Loss Calculator */}
      <section className="relative py-16 px-6">
        <div className="max-w-[700px] mx-auto">
          <div className="bg-card border border-outline-variant rounded-2xl p-6 md:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-container-high rounded flex items-center justify-center text-primary-accent">
                <CalculatorIcon />
              </div>
              <div>
                <h3 className="text-base font-bold text-on-surface">Tính Toán Thất Thoát Của Xưởng Bạn</h3>
                <p className="text-xs text-on-surface-variant">Ước tính số tiền thất thoát từ vỏ bao trôi nổi mỗi năm</p>
              </div>
            </div>

            <div className="flex gap-6 items-center flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                  Số vỏ bao mất mỗi tháng
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={bagLoss}
                    onChange={(e) => setBagLoss(Number(e.target.value) || 0)}
                    min="0"
                    className="w-28 px-3 py-2 bg-card border border-[#004a99] rounded text-xl font-bold text-center text-on-surface focus:outline-none"
                    placeholder="0"
                  />
                  <span className="text-xs font-bold text-on-surface-variant">vỏ bao / tháng</span>
                </div>
              </div>

              <div className="flex-1 min-w-[200px] text-center p-4 bg-tertiary-fixed/50 border border-tertiary-container/20 rounded-xl">
                <p className="text-xs font-bold text-tertiary-container uppercase tracking-wider mb-1">Thất thoát ước tính / năm</p>
                <p className="data-lg text-3xl font-black text-error mb-0.5">
                  ~{yearlyLoss} triệu đ
                </p>
                <p className="text-[11px] text-faint">*Tính định mức 20,000đ / vỏ bao</p>
              </div>
            </div>

            <p className="mt-5 text-xs text-primary-accent text-center font-bold">
              IceFlow giúp theo dõi từng vỏ bao trả ra / thu về — biết chính xác đại lý nào nợ.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative py-16 px-6 bg-card border-y border-outline-variant">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block px-3 py-1 bg-container-high border border-[#004a99]/20 rounded text-xs font-bold text-primary-accent mb-2 uppercase tracking-wider">
              Tính năng cốt lõi
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-on-surface mb-2">Được Thiết Kế Cho Chủ Lò Đá Việt Nam</h2>
            <p className="text-xs text-on-surface-variant max-w-[500px] mx-auto">Tập trung vào tốc độ, độ chính xác và tính dễ dùng.</p>
          </div>

          <div className="flex flex-col gap-6">
            {/* Feature 1: Speed */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center p-6 md:p-8 bg-surface border border-outline-variant rounded-2xl">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#a0f399]/40 text-secondary text-xs font-bold rounded mb-3">
                  ✓ TỐC ĐỘ CAO
                </span>
                <h3 className="text-xl font-bold text-on-surface mb-2">Lên đơn siêu tốc — chỉ 30 giây</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed mb-4">Vừa nghe điện thoại vừa gõ đơn. Tìm khách hàng bằng tên, số điện thoại hoặc mã đại lý. Tự động áp giá riêng theo từng đại lý.</p>
                <ul className="flex flex-col gap-2 text-xs text-on-surface-variant">
                  <li className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-[#a0f399]/40 text-secondary flex items-center justify-center font-bold text-[10px]">✓</span>
                    Tìm kiếm thông minh (Fuzzy Search)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-[#a0f399]/40 text-secondary flex items-center justify-center font-bold text-[10px]">✓</span>
                    Bảng giá riêng theo từng đại lý
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-[#a0f399]/40 text-secondary flex items-center justify-center font-bold text-[10px]">✓</span>
                    Tự động tính tiền và lưu đơn tức thì
                  </li>
                </ul>
              </div>
              <div className="bg-card rounded border border-outline-variant p-4 shadow-sm">
                <div className="flex items-center gap-2 pb-3 border-b border-outline-soft text-xs font-bold text-primary-accent">
                  <span>🔍</span>
                  <span>Đại lý Minh Tuấn (0912 345 678)</span>
                </div>
                <div className="py-2.5 space-y-2 text-xs">
                  <div className="flex justify-between font-medium text-on-surface">
                    <span>Đá Bi (20kg) × 10 bao</span>
                    <span className="font-bold text-primary-accent">120,000 đ</span>
                  </div>
                  <div className="flex justify-between font-medium text-on-surface">
                    <span>Đá Viên (20kg) × 5 bao</span>
                    <span className="font-bold text-primary-accent">110,000 đ</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-outline-soft font-bold text-sm">
                    <span className="text-on-surface-variant">TỔNG CỘNG:</span>
                    <span className="text-secondary">230,000 đ</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 2: Reconciliation */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center p-6 md:p-8 bg-surface border border-outline-variant rounded-2xl">
              <div className="bg-card rounded border border-outline-variant p-4 shadow-sm order-2 lg:order-1">
                <div className="text-xs font-bold uppercase text-on-surface-variant mb-2 pb-2 border-b border-outline-soft">
                  Đối soát ca xe cuối ngày
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-outline-soft">
                    <span className="text-faint">Tiền mặt tài xế nộp</span>
                    <span className="font-bold text-secondary">+3,200,000 đ</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-outline-soft">
                    <span className="text-faint">Vỏ bao thu về</span>
                    <span className="font-bold text-primary-accent">45 / 50 vỏ</span>
                  </div>
                  <div className="flex justify-between py-1 font-bold">
                    <span className="text-faint">Đơn hoàn tất</span>
                    <span className="text-on-surface">12 / 12 đơn</span>
                  </div>
                </div>
              </div>
              <div className="order-1 lg:order-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-container-high text-primary-accent text-xs font-bold rounded mb-3">
                  ✓ ĐỐI SOÁT TỰ ĐỘNG
                </span>
                <h3 className="text-xl font-bold text-on-surface mb-2">Chốt sổ cuối ca chỉ 5 phút</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed mb-4">Tự động đối chiếu đơn giao, tiền mặt tài xế thu về và số vỏ bao thu hồi. Không cần cộng sổ tay, không sợ thất thoát.</p>
                <ul className="flex flex-col gap-2 text-xs text-on-surface-variant">
                  <li className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-[#a0f399]/40 text-secondary flex items-center justify-center font-bold text-[10px]">✓</span>
                    Tài xế bấm giao hàng trên điện thoại
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-[#a0f399]/40 text-secondary flex items-center justify-center font-bold text-[10px]">✓</span>
                    Công nợ cập nhật ngay lập tức
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-[#a0f399]/40 text-secondary flex items-center justify-center font-bold text-[10px]">✓</span>
                    Báo cáo doanh thu và nợ rõ ràng
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Vietnam-proof */}
      <section className="relative py-16 px-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-10">
            <span className="inline-block px-3 py-1 bg-container-high border border-[#004a99]/20 rounded text-xs font-bold text-primary-accent mb-2 uppercase tracking-wider">
              Cam kết
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-on-surface mb-2">Tối Ưu Cho Môi Trường Nhà Máy Đá</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <LocalCard
              icon={<GlobeIcon />}
              title="100% Tiếng Việt"
              desc="Giao diện thuần Việt, đơn giản, dễ dùng cho cả nhân viên văn phòng và tài xế xe tải."
            />
            <LocalCard
              icon={<CloudIcon />}
              title="Lưu trữ đám mây"
              desc="Không lo mất dữ liệu hay rách sổ sách. Dữ liệu được đồng bộ và sao lưu liên tục."
            />
            <LocalCard
              icon={<ServerIcon />}
              title="Chịu tải mùa cao điểm"
              desc="Xử lý mượt mà 100-200 đơn/ngày trong những đợt nắng nóng cao điểm không hề chậm trễ."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-16 px-6 text-center bg-[#002754] text-white">
        <div className="max-w-[640px] mx-auto">
          <h2 className="text-2xl md:text-3xl font-black text-white mb-3">Bắt Đầu Quản Lý Xưởng Đá Ngay Hôm Nay</h2>
          <p className="text-xs text-[#9bbdff] leading-relaxed mb-6">Đăng ký tài khoản trong 1 phút và trải nghiệm miễn phí 14 ngày không giới hạn tính năng.</p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {user ? (
              <Link
                href={dashboardUrl}
                className="px-6 py-3 bg-[#004a99] hover:bg-[#255dad] text-white font-bold text-xs rounded transition-all shadow-sm"
              >
                TIẾP TỤC QUẢN LÝ XƯỞNG &rarr;
              </Link>
            ) : (
              <>
                <Link
                  href="/register"
                  className="px-6 py-3 bg-[#004a99] hover:bg-[#255dad] text-white font-bold text-xs rounded transition-all shadow-sm"
                >
                  DÙNG THỬ MIỄN PHÍ 14 NGÀY
                </Link>
                <Link
                  href="/login"
                  className="px-6 py-3 bg-transparent border border-[#9bbdff] text-[#ecf1ff] font-bold text-xs rounded hover:bg-[#00346f] transition-all"
                >
                  ĐĂNG NHẬP
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-outline-variant bg-card">
        <div className="max-w-[1200px] mx-auto flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 text-lg font-bold">
            <div className="w-6 h-6 bg-[#004a99] rounded flex items-center justify-center text-white">
              <IceIcon />
            </div>
            <span className="text-primary-dark font-black">IceFlow</span>
          </div>
          <p className="text-xs text-on-surface-variant">Quản lý lò đá thảnh thơi — Chống thất thoát tiền & vỏ bao</p>
          <div className="flex items-center gap-4 text-xs font-bold text-primary-accent">
            <Link href="/terms" className="hover:underline">Điều khoản dịch vụ</Link>
            <span className="text-[#c2c6d3]">•</span>
            <Link href="/privacy" className="hover:underline">Chính sách bảo mật</Link>
          </div>
          <p className="text-[11px] text-faint mt-1">© 2026 IceFlow SaaS • Dành cho xưởng sản xuất đá Việt Nam</p>
        </div>
      </footer>
    </div>
  );
}
