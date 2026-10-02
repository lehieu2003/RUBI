'use client';

import Link from 'next/link';
import { MapPin, DollarSign, Package, Snowflake, FileSpreadsheet, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/auth-provider';
import type { TenantRole } from '@/lib/rbac/permissions';

interface QuickActionsProps {
  pendingOrdersCount?: number;
  totalBagsOut?: number;
}

// Keep in sync with src/lib/rbac/permissions.ts route table.
const ACTION_ROLES: Record<string, TenantRole[]> = {
  '/dashboard/map': ['ADMIN', 'ACCOUNTANT'],
  '/settle': ['ADMIN', 'ACCOUNTANT'],
  '/deposits/shells': ['ADMIN', 'ACCOUNTANT'],
  '/inventory': ['ADMIN', 'ACCOUNTANT'],
  '/reports/debt': ['ADMIN', 'ACCOUNTANT'],
};

export function QuickActions({ pendingOrdersCount = 0, totalBagsOut = 0 }: QuickActionsProps) {
  const { user } = useAuth();
  const role = (user?.role as TenantRole | undefined) ?? null;
  const can = (href: string) =>
    !role || (ACTION_ROLES[href]?.includes(role) ?? true);

  return (
    <div className="flex flex-col gap-4">
      {/* Quick Access Shortcuts Grid */}
      <div className="rounded border border-[#c2c6d3] bg-white p-5 shadow-sm">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#424751] mb-3">
          Lối tắt nghiệp vụ nhanh
        </h4>
        <div className="grid grid-cols-2 gap-2.5">
          {can('/dashboard/map') && (
          <Link
            href="/dashboard/map"
            className="flex items-center gap-2.5 p-2.5 rounded border border-[#e7eeff] bg-[#f9f9ff] hover:bg-[#dee8ff] hover:border-[#004a99] transition-all group"
          >
            <div className="w-8 h-8 rounded bg-[#dee8ff] group-hover:bg-[#004a99] group-hover:text-white text-[#004a99] flex items-center justify-center transition-colors">
              <MapPin className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#111c2d] truncate">Bản đồ GPS</p>
              <p className="text-[10px] text-[#737783]">Vị trí xe & đơn</p>
            </div>
          </Link>
          )}

          {can('/settle') && (
          <Link
            href="/settle"
            className="flex items-center gap-2.5 p-2.5 rounded border border-[#e7eeff] bg-[#f9f9ff] hover:bg-[#dee8ff] hover:border-[#004a99] transition-all group"
          >
            <div className="w-8 h-8 rounded bg-[#a0f399]/40 group-hover:bg-[#1b6d24] group-hover:text-white text-[#1b6d24] flex items-center justify-center transition-colors">
              <DollarSign className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#111c2d] truncate">Chốt ca xe</p>
              <p className="text-[10px] text-[#737783]">Thu tiền tài xế</p>
            </div>
          </Link>
          )}

          {can('/deposits/shells') && (
          <Link
            href="/deposits/shells"
            className="flex items-center gap-2.5 p-2.5 rounded border border-[#e7eeff] bg-[#f9f9ff] hover:bg-[#dee8ff] hover:border-[#004a99] transition-all group"
          >
            <div className="w-8 h-8 rounded bg-[#ffdcc2]/60 group-hover:bg-[#7f3700] group-hover:text-white text-[#7f3700] flex items-center justify-center transition-colors">
              <Package className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#111c2d] truncate">Cọc vỏ bao</p>
              <p className="text-[10px] text-[#737783]">Quản lý vỏ nợ</p>
            </div>
          </Link>
          )}

          {can('/inventory') && (
          <Link
            href="/inventory"
            className="flex items-center gap-2.5 p-2.5 rounded border border-[#e7eeff] bg-[#f9f9ff] hover:bg-[#dee8ff] hover:border-[#004a99] transition-all group"
          >
            <div className="w-8 h-8 rounded bg-[#dee8ff] group-hover:bg-[#004a99] group-hover:text-white text-[#004a99] flex items-center justify-center transition-colors">
              <Snowflake className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#111c2d] truncate">Nhập kho đá</p>
              <p className="text-[10px] text-[#737783]">Ghi nhận mẻ đá</p>
            </div>
          </Link>
          )}
        </div>

        {can('/reports/debt') && (
        <Link
          href="/reports/debt"
          className="mt-3 flex items-center justify-between px-3 py-2 rounded bg-[#f0f3ff] border border-[#dee8ff] hover:bg-[#dee8ff] text-xs font-bold text-[#00346f] transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <FileSpreadsheet className="h-4 w-4 text-[#004a99]" />
            Xem Báo cáo công nợ tổng hợp
          </span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        )}
      </div>

      {/* Realtime Operational Status / Alerts */}
      <div className="rounded border border-[#c2c6d3] bg-white p-5 shadow-sm">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#424751] mb-3 flex items-center justify-between">
          <span>Tình trạng ca trực hôm nay</span>
          {pendingOrdersCount > 0 && (
            <span className="inline-flex items-center rounded bg-[#ffdcc2] px-2 py-0.5 text-[10px] font-bold text-[#7f3700]">
              {pendingOrdersCount} đơn chờ
            </span>
          )}
        </h4>

        <div className="space-y-2.5 text-xs">
          <div className="flex items-center justify-between p-2.5 rounded bg-[#f9f9ff] border border-[#e7eeff]">
            <div className="flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${pendingOrdersCount > 0 ? 'bg-[#f59e0b] animate-pulse' : 'bg-[#10b981]'}`} />
              <span className="text-[#424751] font-medium">Đơn hàng cần giao:</span>
            </div>
            <span className="font-bold text-[#111c2d]">{pendingOrdersCount} đơn hàng</span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded bg-[#f9f9ff] border border-[#e7eeff]">
            <div className="flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${totalBagsOut > 500 ? 'bg-[#ba1a1a]' : 'bg-[#004a99]'}`} />
              <span className="text-[#424751] font-medium">Tổng vỏ bao ở khách:</span>
            </div>
            <span className="font-bold text-[#004a99]">{totalBagsOut.toLocaleString('vi-VN')} vỏ</span>
          </div>

          {totalBagsOut > 500 && (
            <div className="flex items-start gap-2 p-2.5 rounded bg-[#ffdcc2]/40 border border-[#7f3700]/30 text-[#7f3700]">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-[#7f3700]" />
              <p className="text-[11px] leading-tight">
                Lượng vỏ bao đang ở khách tăng cao. Cần nhắc tài xế thu hồi vỏ khi giao đơn mới.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
