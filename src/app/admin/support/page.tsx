'use client';

import Link from 'next/link';
import { Headphones, ShieldCheck } from 'lucide-react';

export default function AdminSupportPage() {
  return (
    <div>
      <div className="mb-6 border-b border-[#c2c6d3] pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-[#111c2d]">Trung Tâm Hỗ Trợ & Vận Hành</h1>
        <p className="text-xs text-[#424751] mt-1">
          Quy tắc hỗ trợ khách hàng, kiểm soát quyền truy cập tenant và cơ chế hỗ trợ trực tiếp.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded border border-[#c2c6d3] bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-base font-bold text-[#111c2d]">
            <Headphones className="h-5 w-5 text-[#004a99]" />
            Quy trình hỗ trợ Tenant
          </h2>
          <p className="mt-2 text-xs text-[#424751] leading-relaxed">
            Vào danh sách nhà máy, chọn nhà máy cần hỗ trợ rồi bấm nút &ldquo;Hỗ trợ&rdquo; để mở phiên làm việc an toàn hoặc xem chi tiết hồ sơ, thanh toán, đơn hàng và danh sách nhân sự của nhà máy.
          </p>
          <Link
            href="/admin/tenants"
            className="mt-5 inline-flex rounded bg-[#004a99] hover:bg-[#00346f] px-4 py-2.5 text-xs font-bold text-white shadow-2xs transition-colors"
          >
            MỞ DANH SÁCH NHÀ MÁY
          </Link>
        </section>

        <section className="rounded border border-[#c2c6d3] bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-base font-bold text-[#111c2d]">
            <ShieldCheck className="h-5 w-5 text-[#1b6d24]" />
            Quy tắc an toàn & Bảo mật
          </h2>
          <ul className="mt-3 space-y-2.5 text-xs text-[#424751]">
            <li className="flex items-start gap-2">
              <span className="text-[#004a99] font-bold">•</span>
              <span>Phiên hỗ trợ (Impersonation token) tự động hết hạn sau 15 phút.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#004a99] font-bold">•</span>
              <span>Super Admin chỉ thao tác trong phân hệ `/admin/*` có ghi log đầy đủ.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#004a99] font-bold">•</span>
              <span>Mọi hành động gia hạn, đổi giá, đổi trạng thái đều được ghi nhật ký hệ thống.</span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
