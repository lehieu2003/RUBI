'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-provider';
import { useTheme } from '@/lib/theme';
import { IceIcon } from '@/components/landing/icons';
import { Reveal } from '@/components/landing/reveal';
import { ZaloFloatingButton } from '@/components/landing/zalo-button';
import { SupportChat } from '@/components/landing/support-chat';
import {
  Moon,
  Snowflake,
  Sun,
  Package,
  TrendingDown,
  Wallet,
  MessagesSquare,
  Gauge,
  ShieldCheck,
  ClipboardCheck,
  MapPinned,
  ChevronDown,
  Check,
  Quote,
  Sparkles,
} from 'lucide-react';

const DASHBOARD_URLS: Record<string, string> = {
  SUPER_ADMIN: '/admin/dashboard',
  DRIVER: '/driver',
};

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded border border-white/10 bg-white/5 px-4 py-3 text-center backdrop-blur-sm">
      <p className="font-data text-2xl font-bold text-white sm:text-3xl">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#9bbdff] sm:text-xs">{label}</p>
    </div>
  );
}

function PainCard({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof TrendingDown;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded border border-outline-variant bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded bg-error-container text-error">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-sm font-bold text-on-surface">{title}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-on-surface-variant">{children}</p>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  badge,
  title,
  children,
  points,
}: {
  icon: typeof Gauge;
  badge: string;
  title: string;
  children: React.ReactNode;
  points: string[];
}) {
  return (
    <div className="rounded border border-outline-variant bg-card p-6 shadow-sm">
      <div className="mb-3 inline-flex items-center gap-1.5 rounded bg-container px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-accent">
        <Icon className="h-3.5 w-3.5" />
        {badge}
      </div>
      <h3 className="text-base font-bold text-on-surface">{title}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-on-surface-variant">{children}</p>
      <ul className="mt-3 space-y-1.5">
        {points.map((point) => (
          <li key={point} className="flex items-center gap-2 text-xs font-medium text-on-surface">
            <Check className="h-3.5 w-3.5 shrink-0 text-secondary" />
            {point}
          </li>
        ))}
      </ul>
    </div>
  );
}


/** Mini replica of the real dashboard — built with markup so it stays crisp
 *  and matches the app's dark palette. Placeholder numbers mirror seed data. */
function DashboardMockup() {
  const stats = [
    { label: 'Doanh số hôm nay', value: '1.354.000đ', tone: 'text-[#8ab4ff]' },
    { label: 'Tổng đơn hàng', value: '7', tone: 'text-white' },
    { label: 'Tồn kho lạnh', value: '1.617 bao', tone: 'text-white' },
  ];
  const rows = [
    { code: 'KH-004', name: 'Vựa Hải Sản Năm Căn', items: 'Đá Bi 5kg × 4', total: '48.000đ', status: 'Chờ giao', statusClass: 'bg-[#9bbdff]/20 text-[#9bbdff]' },
    { code: 'KH-001', name: 'Quán Nhậu Gió Biển', items: 'Đá Bi 20kg × 5', total: '274.000đ', status: 'Đang giao', statusClass: 'bg-[#ffdcc2]/20 text-[#ffa878]' },
    { code: 'KH-002', name: 'Đại Lý Minh Tâm', items: 'Đá Bi 10kg × 10', total: '260.000đ', status: 'Hoàn thành', statusClass: 'bg-[#a0f399]/20 text-[#7fd98a]' },
  ];
  return (
    <div className="overflow-hidden rounded-t-xl border border-white/10 bg-[#0d1420] text-left shadow-2xl">
      {/* browser chrome */}
      <div className="flex items-center gap-1.5 border-b border-white/10 bg-white/5 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-3 rounded bg-white/5 px-2 py-0.5 text-[10px] text-[#7f95bb]">iceflow.vn/dashboard</span>
      </div>
      <div className="flex">
        {/* mini sidebar */}
        <div className="hidden w-28 shrink-0 flex-col gap-1 border-r border-white/10 p-3 sm:flex">
          {['Tổng quan', 'Đơn hàng', 'Khách hàng', 'Đối soát', 'Kho lạnh'].map((item, i) => (
            <span
              key={item}
              className={`rounded px-2 py-1.5 text-[10px] font-bold ${i === 0 ? 'bg-[#004a99] text-white' : 'text-[#7f95bb]'}`}
            >
              {item}
            </span>
          ))}
        </div>
        {/* content */}
        <div className="min-w-0 flex-1 p-4">
          <div className="grid grid-cols-3 gap-2">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded border border-white/10 bg-white/5 p-2.5">
                <p className="truncate text-[9px] font-bold uppercase tracking-wider text-[#7f95bb]">{stat.label}</p>
                <p className={`font-data mt-0.5 truncate text-sm font-bold sm:text-base ${stat.tone}`}>{stat.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-2.5 overflow-hidden rounded border border-white/10">
            {rows.map((row) => (
              <div key={row.code} className="flex items-center justify-between gap-2 border-b border-white/5 px-3 py-2 last:border-b-0">
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-bold text-white sm:text-xs">{row.name}</p>
                  <p className="text-[9px] text-[#7f95bb]">{row.items}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-data text-xs font-bold text-white">{row.total}</span>
                  <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${row.statusClass}`}>{row.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Mini replica of the driver delivery card on a phone frame. */
function PhoneMockup() {
  return (
    <div className="w-40 overflow-hidden rounded-[1.75rem] border-4 border-[#1c2735] bg-[#0d1420] shadow-2xl sm:w-48">
      <div className="bg-[#00346f] px-3 py-2.5">
        <p className="text-[10px] font-bold text-white">IceFlow Tài Xế</p>
        <p className="text-[8px] text-[#9bbdff]">Xe / Tài xế: Phạm Văn Tài</p>
      </div>
      <div className="grid grid-cols-2 gap-1.5 p-2">
        <div className="rounded bg-[#9bbdff]/10 p-1.5 text-center">
          <p className="text-[8px] font-bold text-[#9bbdff]">Chờ giao</p>
          <p className="font-data text-sm font-bold text-white">1</p>
        </div>
        <div className="rounded bg-[#a0f399]/10 p-1.5 text-center">
          <p className="text-[8px] font-bold text-[#7fd98a]">Đã giao</p>
          <p className="font-data text-sm font-bold text-white">3</p>
        </div>
      </div>
      <div className="mx-2 rounded border border-[#7fd98a]/40 bg-[#7fd98a]/10 p-2">
        <span className="rounded bg-[#1b6d24] px-1.5 py-0.5 text-[8px] font-bold text-white">Điểm giao #1</span>
        <p className="mt-1 text-[10px] font-bold text-white">Quán Nhậu Gió Biển</p>
        <p className="text-[8px] text-[#b6c5e0]">Đá Bi 20kg × 5, Đá Viên 10kg × 3</p>
        <p className="font-data mt-1.5 text-[11px] font-bold text-white">274.000đ</p>
        <div className="mt-1.5 rounded bg-[#a0f399]/40 py-1.5 text-center text-[8px] font-bold text-[#1b6d24]">
          ✓ ĐÃ HOÀN TẤT GIAO HÀNG
        </div>
      </div>
    </div>
  );
}

function TestimonialCard({ quote, name, factory, detail }: { quote: string; name: string; factory: string; detail: string }) {
  return (
    <figure className="flex flex-col rounded border border-outline-variant bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex gap-0.5 text-[#f59e0b]">
          {[...Array(5)].map((_, i) => (
            <svg key={i} viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.958a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.367 2.446a1 1 0 00-.364 1.118l1.287 3.957c.3.922-.755 1.688-1.539 1.118l-3.366-2.445a1 1 0 00-1.176 0l-3.367 2.445c-.783.57-1.838-.196-1.538-1.118l1.286-3.957a1 1 0 00-.363-1.118L2.062 9.385c-.783-.57-.38-1.81.588-1.81h4.163a1 1 0 00.95-.69l1.286-3.958z" />
            </svg>
          ))}
        </div>
        <Quote className="h-4 w-4 text-primary-accent/40" />
      </div>
      <blockquote className="mt-2.5 flex-1 text-xs leading-relaxed text-on-surface">“{quote}”</blockquote>
      <figcaption className="mt-3 flex items-center gap-2.5 border-t border-outline-soft pt-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-container-high text-xs font-bold text-primary-accent">
          {name.charAt(0)}
        </div>
        <div>
          <p className="text-xs font-bold text-on-surface">{name}</p>
          <p className="text-[10px] text-faint">{factory} · {detail}</p>
        </div>
      </figcaption>
    </figure>
  );
}

function FaqItem({ question, children }: { question: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded border border-outline-variant bg-card">
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
      >
        <span className="text-xs font-bold text-on-surface sm:text-sm">{question}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-faint transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <p className="border-t border-outline-soft px-4 py-3 text-xs leading-relaxed text-on-surface-variant">
          {children}
        </p>
      )}
    </div>
  );
}

export default function LandingPage() {
  const { user } = useAuth();
  const { resolved, toggle: toggleTheme } = useTheme();
  const dashboardUrl = user
    ? DASHBOARD_URLS[user.role ?? ''] ?? '/dashboard'
    : null;

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 mx-auto mt-4 flex max-w-[1200px] items-center justify-between rounded-xl border border-outline-variant bg-card/90 px-4 py-2.5 shadow-xs backdrop-blur-md sm:px-5">
        <div className="flex items-center gap-2 text-lg font-bold">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-primary-container text-white shadow-2xs">
            <IceIcon />
          </div>
          <span className="font-black tracking-tight text-primary-dark">IceFlow</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded border border-outline-variant bg-card text-on-surface-variant transition-all hover:bg-container-low hover:text-primary-accent"
            title={resolved === 'dark' ? 'Chế độ sáng' : 'Chế độ tối'}
            aria-label={resolved === 'dark' ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
          >
            {resolved === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <a
            href="#pricing"
            className="hidden rounded px-3 py-1.5 text-xs font-bold text-on-surface-variant transition-colors hover:bg-container-low hover:text-primary-accent sm:block"
          >
            Bảng giá
          </a>
          <a
            href="#faq"
            className="hidden rounded px-3 py-1.5 text-xs font-bold text-on-surface-variant transition-colors hover:bg-container-low hover:text-primary-accent sm:block"
          >
            Hỏi đáp
          </a>
          {user && dashboardUrl ? (
            <Link
              href={dashboardUrl}
              className="rounded bg-primary-container px-3 py-1.5 text-xs font-bold text-white transition-all hover:bg-primary"
            >
              VÀO BẢNG ĐIỀU KHIỂN →
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded border border-outline-variant bg-card px-3 py-1.5 text-xs font-bold text-primary-deep transition-all hover:bg-container-high"
              >
                Đăng nhập
              </Link>
              <Link
                href="/register"
                className="rounded bg-primary-container px-3 py-1.5 text-xs font-bold text-white transition-all hover:bg-primary"
              >
                Dùng thử
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* ===== HERO — dark industrial ===== */}
      <section className="relative mx-4 mt-4 overflow-hidden rounded-2xl bg-[#0a1628] px-6 py-14 text-center sm:mx-6 sm:py-20">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'linear-gradient(rgba(155,189,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(155,189,255,0.07) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-[#004a99]/40 blur-3xl" />

        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#9bbdff]/30 bg-[#9bbdff]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#9bbdff] sm:text-xs">
            <Sparkles className="h-3 w-3" />
            Dành cho xưởng đá 50–100 đơn mỗi ngày
          </span>
          <h1 className="mx-auto mt-5 max-w-2xl text-3xl font-black leading-tight tracking-tight text-white sm:text-5xl sm:leading-tight">
            Quản Lý Xưởng Đá Thảnh Thơi
            <span className="block text-[#8ab4ff]">Chống Thất Thoát Tuyệt Đối</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-[#b6c5e0] sm:text-base">
            Số hóa đơn hàng trong 30 giây, đối soát công nợ đại lý và theo dõi
            từng vỏ bao tự động. Dễ dùng hơn Zalo, nhanh hơn sổ tay.
          </p>

          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="w-full rounded bg-primary-container px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#004a99]/40 transition-all hover:-translate-y-0.5 hover:bg-primary sm:w-auto"
            >
              DÙNG THỬ MIỄN PHÍ 14 NGÀY
            </Link>
            <a
              href="#features"
              className="w-full rounded border border-white/20 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-white/10 sm:w-auto"
            >
              XEM CÁCH HOẠT ĐỘNG
            </a>
          </div>
          <p className="mt-3 text-[10px] text-[#7f95bb] sm:text-xs">
            Không cần thẻ tín dụng · Cài đặt trong 1 phút · Dữ liệu cloud an toàn
          </p>

          <div className="mx-auto mt-9 grid max-w-2xl grid-cols-3 gap-2.5 sm:gap-4">
            <HeroStat value="30s" label="Lên một đơn" />
            <HeroStat value="0đ" label="Thất thoát vỏ bao" />
            <HeroStat value="100%" label="Tiếng Việt" />
          </div>

          {/* product mockup: dashboard + driver phone */}
          <div className="relative mx-auto mt-12 max-w-3xl">
            <div className="pointer-events-none absolute -inset-4 rounded-3xl bg-[#004a99]/20 blur-2xl" />
            <div className="relative">
              <DashboardMockup />
              <div className="absolute -bottom-6 -right-2 sm:-right-8 sm:top-1/2 sm:-translate-y-1/3">
                <PhoneMockup />
              </div>
            </div>
            <p className="mt-8 text-center text-[10px] font-bold uppercase tracking-wider text-[#7f95bb] sm:mt-10">
              Bảng điều khiển cho văn phòng · App riêng cho tài xế trên điện thoại
            </p>
          </div>
        </div>
      </section>

      {/* ===== NỖI ĐAU ===== */}
      <section className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6">
        <span className="text-[10px] font-bold uppercase tracking-wider text-error">Nỗi đau thực tế</span>
        <h2 className="mt-1.5 text-xl font-black tracking-tight text-on-surface sm:text-2xl">
          Sổ Tay & Zalo Đang Đánh Cắp Tiền Của Bạn Mỗi Ngày
        </h2>
        <p className="mt-2 max-w-2xl text-xs text-on-surface-variant sm:text-sm">
          Ghi chép tay và chốt đơn qua Zalo gây ra hàng loạt sai sót — mỗi sai sót là tiền thật.
        </p>

        <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Reveal>
          <PainCard icon={Package} title="Thất thoát vỏ bao">
            Đến cuối tháng mới biết thiếu hụt hàng trăm bao — không rõ khách nào đang nợ.
          </PainCard>
          </Reveal>
          <Reveal delay={50}>
          <PainCard icon={Wallet} title="Sai lệch công nợ">
            Tài xế giao hàng thu tiền nhưng quên nộp, sổ tay ghi chép nhầm lẫn số lượng.
          </PainCard>
          </Reveal>
          <Reveal delay={100}>
          <PainCard icon={TrendingDown} title="Mù mờ lợi nhuận">
            Cuối tháng không biết thực sự lãi bao nhiêu sau khi trừ tiền điện, xăng xe và vỏ.
          </PainCard>
          </Reveal>
          <Reveal delay={150}>
          <PainCard icon={MessagesSquare} title="Lộn xộn tin nhắn Zalo">
            Một ngày 50-80 đơn qua Zalo — bỏ sót đơn, giao nhầm loại đá là chuyện thường.
          </PainCard>
          </Reveal>
        </div>
      </section>

      {/* ===== TÍNH NĂNG ===== */}
      <section id="features" className="border-y border-outline-variant bg-container-low/50 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-[1200px]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary-accent">Tính năng cốt lõi</span>
          <h2 className="mt-1.5 text-xl font-black tracking-tight text-on-surface sm:text-2xl">
            Được Thiết Kế Cho Nhịp Độ Nhà Máy Đá
          </h2>

          <div className="mt-7 grid grid-cols-1 gap-3 md:grid-cols-2">
            <Reveal>
            <FeatureCard
              icon={Gauge}
              badge="Tốc độ cao"
              title="Lên đơn siêu tốc — chỉ 30 giây"
              points={[
                'Tìm khách bằng tên, SĐT hoặc mã đại lý',
                'Bảng giá riêng tự áp theo từng đại lý',
                'Tự tính tiền, in phiếu K80 tức thì',
              ]}
            >
              Vừa nghe điện thoại vừa gõ đơn — nhanh hơn cả viết sổ tay.
            </FeatureCard>
            </Reveal>
            <Reveal delay={50}>
            <FeatureCard
              icon={ClipboardCheck}
              badge="Đối soát tự động"
              title="Chốt sổ cuối ca chỉ 5 phút"
              points={[
                'Tài xế bấm giao hàng kèm GPS trên điện thoại',
                'Công nợ cập nhật ngay khi chốt đơn',
                'Đối chiếu tiền mặt + vỏ bao thu hồi tự động',
              ]}
            >
              Không cộng sổ tay, không sợ sai lệch giữa tài xế và quầy.
            </FeatureCard>
            </Reveal>
            <Reveal delay={100}>
            <FeatureCard
              icon={ShieldCheck}
              badge="Chống thất thoát"
              title="Công nợ & vỏ bao theo dõi từng bao"
              points={[
                'Cọc vỏ bao ghi nhận ai nợ bao, ai trả đủ',
                'Báo cáo công nợ tổng hợp theo khách hàng',
                'Số vỏ đang ở khách hiển thị ngay dashboard',
              ]}
            >
              Biết chính xác đại lý nào đang nợ tiền và nợ vỏ bao.
            </FeatureCard>
            </Reveal>
            <Reveal delay={150}>
            <FeatureCard
              icon={MapPinned}
              badge="Vận hành"
              title="Phân ca lái xe & bản đồ giao hàng"
              points={[
                'Lịch trình phân ca theo khung giờ 3 tiếng',
                'Bản đồ GPS vị trí giao hàng real-time',
                'Tài xế bấm xác nhận kèm toạ độ giao',
              ]}
            >
              Chủ xưởng nhìn tổng thể đội xe đang chạy ở đâu trên bản đồ.
            </FeatureCard>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ===== BẢNG GIÁ ===== */}
      <section id="pricing" className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6">
        <span className="text-[10px] font-bold uppercase tracking-wider text-primary-accent">Bảng giá</span>
        <h2 className="mt-1.5 text-xl font-black tracking-tight text-on-surface sm:text-2xl">
          Minh Bạch — Trả Theo Số Tài Xế Thực Dùng
        </h2>
        <p className="mt-2 max-w-2xl text-xs text-on-surface-variant sm:text-sm">
          Tài khoản quản lý miễn phí. Chỉ trả tiền cho tài xế hoạt động, tính tháng qua VietQR tự động.
        </p>

        <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:max-w-3xl">
          {/* Trial card */}
          <Reveal>
          <div className="relative rounded border border-outline-variant bg-card p-6 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Dùng thử</p>
            <p className="mt-2 flex items-baseline gap-1">
              <span className="font-data text-3xl font-bold text-on-surface">0đ</span>
              <span className="text-xs text-faint">/ 14 ngày</span>
            </p>
            <ul className="mt-4 space-y-2 text-xs text-on-surface-variant">
              {['Đầy đủ mọi tính năng, không giới hạn', 'Không cần thẻ tín dụng', 'Hỗ trợ cài đặt & nhập khách hàng từ CSV'].map((point) => (
                <li key={point} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-secondary" />
                  {point}
                </li>
              ))}
            </ul>
            <Link
              href="/register"
              className="mt-5 block rounded border border-primary-accent py-2.5 text-center text-xs font-bold text-primary-accent transition-all hover:bg-container-high"
            >
              BẮT ĐẦU DÙNG THỬ
            </Link>
          </div>
          </Reveal>

          {/* PRO card */}
          <Reveal delay={100}>
          <div className="relative rounded border-2 border-primary-accent bg-card p-6 shadow-md">
            <span className="absolute -top-2.5 right-4 rounded bg-primary-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
              Phổ biến
            </span>
            <p className="text-xs font-bold uppercase tracking-wider text-primary-accent">Gói Pro</p>
            <p className="mt-2 flex items-baseline gap-1">
              <span className="font-data text-3xl font-bold text-on-surface">150.000đ</span>
              <span className="text-xs text-faint">/ tài xế / tháng</span>
            </p>
            <ul className="mt-4 space-y-2 text-xs text-on-surface-variant">
              {['Tài khoản quản lý + kế toán miễn phí', 'Thanh toán VietQR — tự động kích hoạt', 'Hủy bất cứ lúc nào, không ràng buộc'].map((point) => (
                <li key={point} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-secondary" />
                  {point}
                </li>
              ))}
            </ul>
            <p className="mt-4 rounded bg-container-low px-3 py-2 text-[10px] text-on-surface-variant">
              Ví dụ: 3 tài xế chạy = <span className="font-data font-bold text-on-surface">300.000đ/tháng</span> (tương đương 1 ca đá bán ra).
            </p>
            <Link
              href="/register"
              className="mt-5 block rounded bg-primary-container py-2.5 text-center text-xs font-bold text-white transition-all hover:bg-primary"
            >
              DÙNG THỬ RỒI NÂNG CẤP
            </Link>
          </div>
          </Reveal>
        </div>
      </section>

      {/* ===== TESTIMONIAL ===== */}
      <section className="border-y border-outline-variant bg-container-low/50 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-[1200px]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary-accent">Cảm nhận</span>
          <h2 className="mt-1.5 text-xl font-black tracking-tight text-on-surface sm:text-2xl">
            Vì Sao Chủ Xưởng Chọn IceFlow?
          </h2>

          <div className="mt-7 grid grid-cols-1 gap-3 md:grid-cols-3">
            <Reveal>
            <TestimonialCard
              quote="Trước mỗi cuối tháng mất 2 ngày ngồi cộng lại vỏ bao từng đại lý. Giờ nhìn dashboard là biết ngay ai nợ bao, ai trả đủ."
              name="Anh Hòa"
              factory="Xưởng Đá Hoa Phát, Thủ Đức"
              detail="~60 đơn/ngày"
            />
            </Reveal>
            <Reveal delay={50}>
            <TestimonialCard
              quote="Nhân viên nghe điện thoại vừa gõ đơn xong, tài xế lên xe là thấy đơn ngay trên điện thoại. Không còn gọi lại hỏi đơn nào cho nhà nào."
              name="Anh Tuấn"
              factory="Xưởng Đá 2 Ca, Dĩ An"
              detail="3 tài xế · ~80 đơn/ngày"
            />
            </Reveal>
            <Reveal delay={100}>
            <TestimonialCard
              quote="Sợ nhất là mất dữ liệu sổ tay. Giờ mọi đơn, công nợ, vỏ bao nằm trên cloud — điện thoại hỏng cũng không mất gì."
              name="Chị Lan"
              factory="Xưởng Đá Gia Đình, Bình Dương"
              detail="~40 đơn/ngày"
            />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section id="faq" className="mx-auto max-w-[800px] px-4 py-16 sm:px-6">
        <span className="text-[10px] font-bold uppercase tracking-wider text-primary-accent">Hỏi đáp</span>
        <h2 className="mt-1.5 text-xl font-black tracking-tight text-on-surface sm:text-2xl">
          Câu Hỏi Thường Gặp
        </h2>

        <div className="mt-6 space-y-2.5">
          <FaqItem question="Mất điện hoặc mất mạng thì sao, có mất đơn không?">
            Đơn lưu trực tiếp lên cloud ngay khi bấm xác nhận. App có banner cảnh báo khi mất mạng;
            sau khi mạng quay lại chỉ cần bấm Làm mới — dữ liệu không bao giờ mất theo điện thoại.
          </FaqItem>
          <FaqItem question="Tài xế lớn tuổi có dùng được không?">
            Có — giao diện cho tài xế thiết kế riêng: chữ to, nút bấm to, chỉ có 2 việc là xem danh
            sách và bấm “Đã giao xong”. Tài xế không cần tài khoản, có thể mở bằng link riêng xưởng gửi.
          </FaqItem>
          <FaqItem question="Thanh toán thế nào? Có bị tự động trừ tiền không?">
            Thanh toán chuyển khoản VietQR theo tháng, không tự động trừ. Hết hạn trước 3 ngày hệ
            thống gửi email nhắc — bạn chuyển khoản là gói tự kích hoạt cộng thêm 30 ngày.
          </FaqItem>
          <FaqItem question="In phiếu giao hàng dùng máy in gì?">
            Bất kỳ máy in nhiệt K80 cắm vào máy tính văn phòng chạy Chrome — bấm “In phiếu K80” là ra
            đúng khổ giấy, không cần cài thêm phần mềm.
          </FaqItem>
          <FaqItem question="Khách hàng cũ ghi sổ tay hàng trăm người, nhập có mất thời gian không?">
            Có công cụ nhập từ file Excel/CSV: chuẩn bị cột tên, SĐT, địa chỉ rồi tải lên là xong
            hàng trăm đại lý trong vài phút, kèm bước xem trước trước khi nhập thật.
          </FaqItem>
          <FaqItem question="Muốn ngừng dùng thì sao?">
            Hủy bất cứ lúc nào trong phần Cài đặt — gói giữ thêm 7 ngày cho bạn xuất toàn bộ công nợ,
            vỏ bao và dữ liệu trước khi chuyển về chế độ chỉ xem.
          </FaqItem>
        </div>
      </section>

      {/* ===== FINAL CTA — dark band ===== */}
      <section className="relative mx-4 mb-8 overflow-hidden rounded-2xl bg-[#0a1628] px-6 py-14 text-center sm:mx-6">
        <div className="pointer-events-none absolute -bottom-24 left-1/2 h-56 w-[32rem] -translate-x-1/2 rounded-full bg-[#004a99]/40 blur-3xl" />
        <div className="relative">
          <Snowflake className="mx-auto h-8 w-8 text-[#8ab4ff]" />
          <h2 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">
            Bắt Đầu Quản Lý Xưởng Đá Ngay Hôm Nay
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-[#b6c5e0]">
            Đăng ký trong 1 phút, dùng thử 14 ngày miễn phí toàn bộ tính năng — không cần thẻ tín dụng.
          </p>
          <Link
            href="/register"
            className="mt-6 inline-block rounded bg-primary-container px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#004a99]/40 transition-all hover:-translate-y-0.5 hover:bg-primary"
          >
            DÙNG THỬ MIỄN PHÍ 14 NGÀY
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-outline-variant px-4 py-8 text-center">
        <div className="flex items-center justify-center gap-2 text-sm font-bold">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-primary-container text-white">
            <IceIcon />
          </div>
          IceFlow
        </div>
        <p className="mt-2 text-[10px] text-faint">Quản lý lò đá thảnh thơi — Chống thất thoát tiền & vỏ bao</p>
        <div className="mt-3 flex items-center justify-center gap-3 text-[10px] text-on-surface-variant">
          <Link href="/terms" className="hover:text-primary-accent">Điều khoản dịch vụ</Link>
          <span>•</span>
          <Link href="/privacy" className="hover:text-primary-accent">Chính sách bảo mật</Link>
        </div>
        <p className="mt-3 text-[10px] text-faint">© 2026 IceFlow SaaS · Dành cho xưởng sản xuất đá Việt Nam</p>
      </footer>

      {/* Floating support chat + Zalo — landing page only */}
      <SupportChat />
      <ZaloFloatingButton />
    </div>
  );
}
