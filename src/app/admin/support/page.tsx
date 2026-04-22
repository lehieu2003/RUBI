'use client';

import Link from 'next/link';
import { Headphones, ShieldCheck } from 'lucide-react';

export default function AdminSupportPage() {
  return (
    <div>
      <div className="mb-8">
        <p className="text-sm font-medium text-blue-400">Super Admin</p>
        <h1 className="mt-1 text-3xl font-black text-white">Hỗ trợ</h1>
        <p className="mt-2 text-slate-400">
          Trung tâm hỗ trợ tenant và quy tắc impersonation hiện tại.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold text-white">
            <Headphones className="h-5 w-5 text-blue-400" />
            Hỗ trợ tenant
          </h2>
          <p className="mt-3 text-sm text-slate-400">
            Vào danh sách nhà máy, chọn tenant cần hỗ trợ rồi bấm “Hỗ trợ” hoặc mở trang chi tiết
            tenant để xem subscription, payment, order gần đây và nhân sự.
          </p>
          <Link
            href="/admin/tenants"
            className="mt-5 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Mở danh sách nhà máy
          </Link>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold text-white">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            Quy tắc an toàn
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-400">
            <li>Impersonation token hết hạn sau 15 phút.</li>
            <li>Super Admin chỉ làm việc trực tiếp trong `/admin/*`.</li>
            <li>Tenant app không mở trực tiếp cho Super Admin ngoài luồng hỗ trợ rõ ràng.</li>
            <li>Write impersonation rộng chưa được bật cho tới khi có audit action đầy đủ.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
