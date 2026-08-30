'use client';

import { Calendar, Bell } from 'lucide-react';
import { OrderEntryDrawer } from '@/components/order/order-entry-drawer';
import type { Customer, Product } from '@prisma/client';

interface QuickActionsProps {
  customers: Customer[];
  products: Product[];
}

export function QuickActions({ customers, products }: QuickActionsProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* New Order Button - Speed-Entry CTA */}
      <div className="rounded border border-[#004a99] bg-[#dee8ff]/40 p-4">
        <span className="text-xs font-bold uppercase tracking-wider text-[#00346f] block mb-2">
          Thao tác phím tắt / Lên đơn
        </span>
        <OrderEntryDrawer customers={customers} products={products} />
      </div>

      {/* Staff Schedule */}
      <div className="rounded border border-[#c2c6d3] bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded bg-[#dee8ff]">
            <Calendar className="h-5 w-5 text-[#004a99]" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#111c2d]">Phân Ca Trực Hôm Nay</h4>
            <p className="text-xs text-[#424751]">Lịch trực hiện hành</p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded bg-[#f0f3ff] border border-[#dee8ff] px-3 py-2">
            <span className="text-xs font-medium text-[#424751]">Ca 1 (06:00 - 09:00)</span>
            <span className="text-xs font-bold text-[#00346f]">Phạm Văn Tài (Xe 1)</span>
          </div>
          <div className="flex items-center justify-between rounded bg-[#f0f3ff] border border-[#dee8ff] px-3 py-2">
            <span className="text-xs font-medium text-[#424751]">Ca 2 (09:00 - 12:00)</span>
            <span className="text-xs font-bold text-[#00346f]">Hoàng Văn Lộc (Xe 2)</span>
          </div>
        </div>
      </div>

      {/* Recent Notifications / Alerts */}
      <div className="rounded border border-[#c2c6d3] bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded bg-[#ffdad6]">
            <Bell className="h-5 w-5 text-[#93000a]" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#111c2d]">Cảnh Báo Vận Hành</h4>
            <p className="text-xs text-[#424751]">Thông tin cần xử lý ngay</p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-start gap-2.5 rounded bg-[#f9f9ff] border border-[#e7eeff] px-3 py-2">
            <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#1b6d24]" />
            <div>
              <p className="text-xs font-semibold text-[#111c2d]">
                Xe 1 vừa giao xong cho Quán Gió Biển
              </p>
              <p className="text-[11px] text-[#737783] font-mono">5 phút trước</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 rounded bg-[#ffdad6]/30 border border-[#ffdad6] px-3 py-2">
            <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#ba1a1a]" />
            <div>
              <p className="text-xs font-bold text-[#93000a]">
                Đại lý Minh Tâm: Nợ vỏ bao vượt mức 50 cái
              </p>
              <p className="text-[11px] text-[#737783] font-mono">15 phút trước</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

