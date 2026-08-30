import Link from 'next/link';
import { Snowflake, ArrowLeft, Home } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '404 - Không tìm thấy trang | IceFlow SaaS',
  description: 'Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.',
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#f9f9ff] text-[#111c2d] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md rounded border border-[#c2c6d3] bg-white p-8 text-center shadow-lg">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded bg-[#dee8ff] text-[#004a99]">
          <Snowflake className="h-8 w-8 text-[#004a99]" />
        </div>

        <h1 className="text-4xl font-black text-[#002754] font-mono tracking-tight">404</h1>
        <h2 className="mt-2 text-lg font-bold text-[#111c2d]">Không tìm thấy trang yêu cầu</h2>
        <p className="mt-2 text-xs text-[#737783] leading-relaxed">
          Đường dẫn bạn vừa truy cập không tồn tại, đã bị xóa hoặc bạn không có quyền truy cập vào nội dung này.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded bg-[#004a99] hover:bg-[#00346f] px-5 py-2.5 text-xs font-bold text-white transition-colors shadow-sm"
          >
            <Home className="h-4 w-4" />
            Về trang Tổng quan
          </Link>
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded border border-[#c2c6d3] bg-white hover:bg-[#f0f3ff] px-5 py-2.5 text-xs font-bold text-[#424751] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Trang chủ
          </Link>
        </div>
      </div>

      <p className="mt-6 text-xs text-[#737783] font-mono">
        IceFlow SaaS — Hệ Thống Quản Lý Xưởng Đá
      </p>
    </div>
  );
}
