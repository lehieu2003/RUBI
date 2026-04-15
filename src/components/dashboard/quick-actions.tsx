'use client';

import { Plus, Calendar, Bell } from 'lucide-react';
import { OrderEntryDrawer } from '@/components/order/order-entry-drawer';
import type { Customer, Product } from '@prisma/client';

interface QuickActionsProps {
  customers: Customer[];
  products: Product[];
}

export function QuickActions({ customers, products }: QuickActionsProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* New Order Button - Largest CTA */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <OrderEntryDrawer customers={customers} products={products} />
      </div>

      {/* Staff Schedule */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20">
            <Calendar className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Lịch trực ca</h4>
            <p className="text-xs text-slate-400">Hôm nay</p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-lg bg-slate-800/50 px-3 py-2">
            <span className="text-sm text-slate-300">Ca sáng (6h-14h)</span>
            <span className="text-sm font-medium text-white">Anh Minh</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-slate-800/50 px-3 py-2">
            <span className="text-sm text-slate-300">Ca chiều (14h-22h)</span>
            <span className="text-sm font-medium text-white">Chị Hương</span>
          </div>
        </div>
      </div>

      {/* Recent notifications */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20">
            <Bell className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Thông báo</h4>
            <p className="text-xs text-slate-400">Gần đây</p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-start gap-2 rounded-lg bg-slate-800/50 px-3 py-2">
            <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
            <div>
              <p className="text-xs text-slate-300">
                Đơn #A3F2B1 đã giao xong
              </p>
              <p className="text-[10px] text-slate-500">5 phút trước</p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-lg bg-slate-800/50 px-3 py-2">
            <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
            <div>
              <p className="text-xs text-slate-300">
                Công nợ khách ABC tăng cao
              </p>
              <p className="text-[10px] text-slate-500">15 phút trước</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
