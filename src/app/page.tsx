'use client';

import { useState } from 'react';
import Link from 'next/link';
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
  const [bagLoss, setBagLoss] = useState(50);
  const yearlyLoss = Math.round((bagLoss * 12 * 20000) / 1000000);

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white font-system-ui overflow-x-hidden">
      {/* Animated Gradient Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-r from-blue-600/30 to-violet-600/30 rounded-full blur-[120px] animate-[pulse_8s_ease-in-out_infinite]" />
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-full blur-[100px] animate-[pulse_10s_ease-in-out_infinite]" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-1/4 left-1/3 w-[450px] h-[450px] bg-gradient-to-r from-violet-500/20 to-purple-500/20 rounded-full blur-[110px] animate-[pulse_12s_ease-in-out_infinite]" style={{ animationDelay: '4s' }} />
      </div>

      {/* Grid Pattern Overlay */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      {/* Navbar */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 max-w-[1200px] mx-auto bg-white/5 backdrop-blur-xl border border-white/10 shadow-lg rounded-2xl mt-4 mx-4 transition-all duration-500 hover:bg-white/10 hover:border-white/20 hover:shadow-blue-500/10">
        <div className="flex items-center gap-2 text-xl font-extrabold">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-violet-600 rounded-lg flex items-center justify-center">
            <IceIcon />
          </div>
          <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">IceFlow</span>
        </div>
        <div className="flex items-center gap-8">
          <a href="#pain" className="text-sm font-medium text-gray-400 hover:text-white transition-all duration-300 hover:scale-105">Nỗi đau</a>
          <a href="#features" className="text-sm font-medium text-gray-400 hover:text-white transition-all duration-300 hover:scale-105">Tính năng</a>
          <Link href="/login" className="px-5 py-2.5 border border-white/20 text-gray-300 font-medium text-sm rounded-xl hover:border-white/40 hover:text-white transition-all duration-300 hover:bg-white/5">
            Đăng nhập
          </Link>
          <Link href="/register" className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 text-white font-semibold text-sm rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 hover:scale-105 hover:-translate-y-0.5">
            Dùng thử
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative max-w-[900px] mx-auto px-8 pt-28 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-full text-sm text-red-400 font-medium mb-8 animate-[fadeInUp_0.8s_ease-out]">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span>Chủ lò đá đang mất tiền mỗi ngày — và không biết</span>
        </div>

        <h1 className="text-[clamp(2.5rem,6vw,4rem)] font-black leading-[1.1] tracking-tight mb-6 animate-[fadeInUp_0.8s_ease-out_0.1s_both]">
          <span className="bg-gradient-to-b from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
            Quản lý lò đá thảnh thơi
          </span>
          <br />
          <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
            Chống thất thoát tuyệt đối
          </span>
        </h1>

        <p className="text-lg text-gray-400 leading-relaxed mb-10 max-w-[600px] mx-auto animate-[fadeInUp_0.8s_ease-out_0.2s_both]">
          Số hóa đơn hàng, theo dõi công nợ đại lý và quản lý kho lạnh chỉ trên một nền tảng.
          <span className="text-gray-300"> Dễ dùng như Zalo, hiệu quả hơn sổ sách.</span>
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap animate-[fadeInUp_0.8s_ease-out_0.3s_both]">
          <Link href="/register" className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold text-base rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/30 hover:-translate-y-1">
            <span className="relative z-10">Dùng thử miễn phí 14 ngày</span>
            <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </Link>
          <Link href="/login" className="px-8 py-4 text-gray-400 font-semibold text-base rounded-2xl border border-white/10 hover:border-white/20 hover:text-white hover:bg-white/5 transition-all duration-300">
            Đăng nhập ngay
          </Link>
        </div>

        <p className="mt-6 text-sm text-gray-500 animate-[fadeInUp_0.8s_ease-out_0.4s_both]">Không cần thẻ tín dụng • Không cần hỗ trợ kỹ thuật</p>

        <div className="mt-16 flex items-center justify-center gap-8 flex-wrap animate-[fadeInUp_0.8s_ease-out_0.5s_both]">
          <StatItem value="50+" label="Nhà máy đá" />
          <div className="w-px h-10 bg-white/10" />
          <StatItem value="1000+" label="Đơn hàng/ngày" />
          <div className="w-px h-10 bg-white/10" />
          <StatItem value="30s" label="Mỗi đơn" />
        </div>
      </section>

      {/* Pain Points */}
      <section id="pain" className="relative py-24 px-8">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 bg-red-500/10 border border-red-500/20 rounded-full text-xs font-semibold text-red-400 mb-4 uppercase tracking-wider">Nỗi đau thực tế</span>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Những nỗi đau khiến chủ lò đá mất ngủ</h2>
            <p className="text-gray-400 max-w-[500px] mx-auto">Bạn nhận ra mình đang gặp vấn đề — nhưng chưa có cách giải quyết đúng.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <PainCard
              icon={<BagLossIcon />}
              title="Thất thoát vỏ bao"
              desc="Đến cuối tháng mới biết thiếu hụt vài chục bao — mà không biết trôi từ đâu."
              delay={0}
            />
            <PainCard
              icon={<DebtConfusionIcon />}
              title="Sai lệch công nợ"
              desc="Tài xế thu tiền về nhưng quên nộp, sổ tay ghi chép nhầm lẫn."
              delay={100}
            />
            <PainCard
              icon={<BlindProfitIcon />}
              title="Mù mờ lợi nhuận"
              desc="Cuối tháng không biết thực sự lãi bao nhiêu sau khi trừ tiền điện, xăng xe."
              delay={200}
            />
            <PainCard
              icon={<ZaloMessIcon />}
              title="Đơn qua Zalo"
              desc="Một ngày 50-80 đơn — lỗi nhập liệu, chép nhầm là chuyện thường."
              delay={300}
            />
          </div>
        </div>
      </section>

      {/* Loss Calculator */}
      <section className="relative py-24 px-8">
        <div className="max-w-[700px] mx-auto">
          <div className="relative bg-gradient-to-br from-blue-600/10 to-violet-600/10 backdrop-blur-xl border border-white/10 rounded-3xl p-8 overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-gradient-to-b from-blue-500/20 to-transparent blur-2xl" />

            <div className="relative flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-violet-500 rounded-xl flex items-center justify-center">
                <CalculatorIcon />
              </div>
              <h3 className="text-xl font-bold text-white">Tính toán thất thoát của bạn</h3>
            </div>

            <div className="flex gap-8 items-center flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-400 mb-3">Số vỏ bao mất mỗi tháng</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={bagLoss}
                    onChange={(e) => setBagLoss(Number(e.target.value) || 0)}
                    min="0"
                    className="w-28 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-2xl font-bold text-center text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/15 transition-all"
                    placeholder="0"
                  />
                  <span className="text-sm text-gray-400">vỏ bao</span>
                </div>
              </div>

              <div className="flex-1 min-w-[200px] text-center p-5 bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-2xl">
                <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Thất thoát ước tính/năm</p>
                <p className="text-4xl font-black bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent mb-1">
                  ~{yearlyLoss}M
                </p>
                <p className="text-xs text-gray-500">*20,000đ/vỏ bao</p>
              </div>
            </div>

            <p className="mt-6 text-sm text-blue-400 text-center font-medium">
              IceFlow giúp bạn theo dõi từng vỏ bao — biết ai nợ, nợ bao nhiêu, từ khi nào.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative py-24 px-8">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-xs font-semibold text-blue-400 mb-4 uppercase tracking-wider">Tính năng</span>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Thiết kế cho chủ lò đá thực thụ</h2>
            <p className="text-gray-400 max-w-[500px] mx-auto">Không hoa mỹ. Mỗi tính năng đều giải quyết một vấn đề cụ thể.</p>
          </div>

          <div className="flex flex-col gap-8">
            {/* Feature 1: Speed */}
            <div className="group grid grid-cols-1 lg:grid-cols-2 gap-8 items-center p-8 bg-white/5 border border-white/10 rounded-3xl hover:bg-white/10 hover:border-white/20 transition-all duration-500">
              <div>
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-full mb-4">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> Tốc độ
                </span>
                <h3 className="text-2xl font-bold text-white mb-3">Lên đơn siêu tốc — 30 giây</h3>
                <p className="text-gray-400 leading-relaxed mb-5">Vừa nghe điện thoại vừa lên đơn. Search khách → Tab qua sản phẩm → Enter = xong. Tự động áp giá riêng cho từng đại lý.</p>
                <ul className="flex flex-col gap-3">
                  <li className="flex items-center gap-3 text-sm text-gray-300">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs">✓</span>
                    Tự động nhận diện khách qua mã KH hoặc SĐT
                  </li>
                  <li className="flex items-center gap-3 text-sm text-gray-300">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs">✓</span>
                    Bảng giá riêng theo từng khách hàng
                  </li>
                  <li className="flex items-center gap-3 text-sm text-gray-300">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs">✓</span>
                    Tổng tiền tự động cập nhật
                  </li>
                </ul>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-violet-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative bg-[#0f172a] rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                  <div className="flex gap-2 p-3 bg-[#1e1e2e] border-b border-white/5">
                    <div className="w-3 h-3 rounded-full bg-red-500/50" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                    <div className="w-3 h-3 rounded-full bg-green-500/50" />
                  </div>
                  <div className="p-5 flex flex-col gap-3">
                    <div className="flex items-center gap-2 bg-white/5 rounded-xl px-4 py-3 text-sm text-gray-400 border border-white/5">
                      <span className="text-blue-400">🔍</span>
                      <span>Tìm khách hàng...</span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-gray-300 py-2 border-b border-white/5">
                      <span>Đá Bi 5kg</span>
                      <span className="text-blue-400 font-semibold">×10</span>
                      <span className="text-emerald-400">120,000đ</span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-gray-300 py-2 border-b border-white/5">
                      <span>Đá Viên 10kg</span>
                      <span className="text-blue-400 font-semibold">×5</span>
                      <span className="text-emerald-400">220,000đ</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 2: Reconciliation */}
            <div className="group grid grid-cols-1 lg:grid-cols-2 gap-8 items-center p-8 bg-white/5 border border-white/10 rounded-3xl hover:bg-white/10 hover:border-white/20 transition-all duration-500">
              <div className="relative order-2 lg:order-1">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative bg-[#0f172a] rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                  <div className="flex gap-2 p-3 bg-[#1e1e2e] border-b border-white/5">
                    <div className="w-3 h-3 rounded-full bg-red-500/50" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                    <div className="w-3 h-3 rounded-full bg-green-500/50" />
                  </div>
                  <div className="p-5 flex flex-col gap-3">
                    <div className="text-xs font-semibold text-gray-200 mb-2 uppercase tracking-wider">Đối soát cuối ngày</div>
                    <div className="flex justify-between items-center text-sm text-gray-300 py-2 border-b border-white/5">
                      <span>Công nợ</span>
                      <span className="text-emerald-400 font-bold">+3,200,000đ</span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-gray-300 py-2 border-b border-white/5">
                      <span>Vỏ bao</span>
                      <span className="text-red-400 font-bold">-28 vỏ</span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-gray-300 py-2">
                      <span>Đơn hàng</span>
                      <span className="text-blue-400 font-bold">+12 đơn</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="order-1 lg:order-2">
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold rounded-full mb-4">
                  <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" /> Đối soát
                </span>
                <h3 className="text-2xl font-bold text-white mb-3">Cuối ngày chốt sổ 5 phút</h3>
                <p className="text-gray-400 leading-relaxed mb-5">Tự động trừ kho, cộng nợ khách hàng ngay khi tài xế về. Không cần cộng tay, không cần Excel.</p>
                <ul className="flex flex-col gap-3">
                  <li className="flex items-center gap-3 text-sm text-gray-300">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs">✓</span>
                    Tài xế xác nhận giao trên điện thoại
                  </li>
                  <li className="flex items-center gap-3 text-sm text-gray-300">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs">✓</span>
                    Công nợ tự động cập nhật
                  </li>
                  <li className="flex items-center gap-3 text-sm text-gray-300">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs">✓</span>
                    Lịch sử giao dịch đại lý
                  </li>
                </ul>
              </div>
            </div>

            {/* Feature 3: Print */}
            <div className="group grid grid-cols-1 lg:grid-cols-2 gap-8 items-center p-8 bg-white/5 border border-white/10 rounded-3xl hover:bg-white/10 hover:border-white/20 transition-all duration-500">
              <div>
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold rounded-full mb-4">
                  <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse" /> Kho & In ấn
                </span>
                <h3 className="text-2xl font-bold text-white mb-3">In phiếu giao tức thì</h3>
                <p className="text-gray-400 leading-relaxed mb-5">Kết nối máy in văn phòng thông thường, in phiếu giao hàng chuyên nghiệp có sẵn chỗ ký nhận.</p>
                <ul className="flex flex-col gap-3">
                  <li className="flex items-center gap-3 text-sm text-gray-300">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs">✓</span>
                    Đầy đủ thông tin: khách, sản phẩm, số lượng, tổng tiền
                  </li>
                  <li className="flex items-center gap-3 text-sm text-gray-300">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs">✓</span>
                    Khách ký xác nhận trên phiếu
                  </li>
                  <li className="flex items-center gap-3 text-sm text-gray-300">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs">✓</span>
                    Lưu trữ số hóa — không lo mất sổ
                  </li>
                </ul>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative bg-white rounded-2xl p-6 shadow-2xl border border-gray-200">
                  <div className="font-black text-xs text-center border-b-2 border-gray-200 pb-3 mb-4 text-gray-800 uppercase tracking-wider">PHIẾU GIAO HÀNG</div>
                  <div className="text-gray-500 mb-4 leading-relaxed">
                    <span className="font-semibold text-gray-700">Đại lý Minh Tuấn</span><br />
                    18/04/2026 14:30
                  </div>
                  <div className="flex flex-col gap-2 mb-4 text-gray-800">
                    <div className="flex justify-between"><span>Đá Bi 5kg × 10</span><span className="font-semibold">120,000đ</span></div>
                    <div className="flex justify-between"><span>Đá Viên 10kg × 5</span><span className="font-semibold">220,000đ</span></div>
                  </div>
                  <div className="flex justify-between items-center py-3 border-t-2 border-gray-200">
                    <span className="font-bold text-gray-800">TỔNG CỘNG</span>
                    <span className="font-black text-xl text-blue-600">2,340,000đ</span>
                  </div>
                  <div className="text-gray-400 italic text-sm mt-4">Chữ ký khách hàng: ___________</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Vietnam-proof */}
      <section className="relative py-24 px-8">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 bg-violet-500/10 border border-violet-500/20 rounded-full text-xs font-semibold text-violet-400 mb-4 uppercase tracking-wider">Khác biệt</span>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Thực tế tại Việt Nam</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <LocalCard
              icon={<GlobeIcon />}
              title="Tiếng Việt hoàn toàn"
              desc="Giao diện đơn giản, dễ dùng cho cả công nhân và tài xế."
            />
            <LocalCard
              icon={<CloudIcon />}
              title="Dữ liệu đám mây"
              desc="Không lo mất sổ sách. Mọi thứ được sao lưu tự động."
            />
            <LocalCard
              icon={<ServerIcon />}
              title="Hoạt động ổn định"
              desc="50-100 đơn/ngày vẫn mượt. Peak season không chậm."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24 px-8 text-center">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-r from-blue-500/20 via-violet-500/20 to-purple-500/20 rounded-full blur-3xl" />

        <div className="relative max-w-[640px] mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Bắt đầu trong 5 phút</h2>
          <p className="text-gray-400 leading-relaxed mb-10">Đăng ký, kết nối dữ liệu, bắt đầu nhập đơn. Không cần cài đặt phức tạp.</p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/register" className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold text-base rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/30 hover:-translate-y-1">
              <span className="relative z-10">Dùng thử miễn phí 14 ngày</span>
              <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Link>
            <Link href="/login" className="px-8 py-4 text-gray-400 font-semibold text-base rounded-2xl border border-white/10 hover:border-white/20 hover:text-white hover:bg-white/5 transition-all duration-300">
              Đăng nhập
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-12 px-8 border-t border-white/10">
        <div className="max-w-[1200px] mx-auto flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 text-xl font-extrabold">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-violet-600 rounded-lg flex items-center justify-center">
              <IceIcon />
            </div>
            <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">IceFlow</span>
          </div>
          <p className="text-sm text-gray-500">Quản lý lò đá thảnh thơi — Chống thất thoát tiền & vỏ bao</p>
          <p className="text-xs text-gray-600">© 2026 IceFlow SaaS • Cho nhà máy đá Việt Nam</p>
        </div>
      </footer>

      {/* Keyframes */}
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}
