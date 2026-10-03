'use client';

import Link from 'next/link';
import { MapPin, DollarSign, Package, Snowflake, FileSpreadsheet, AlertCircle, ArrowRight } from 'lucide-react';
import { AlertTriangle, CalendarClock } from 'lucide-react';
import { useAuth } from '@/lib/auth-provider';
import type { TenantRole } from '@/lib/rbac/permissions';

interface DueAsset {
  assetName: string;
  assetCode: string;
  type: string;
  dueAt: string;
}

interface QuickActionsProps {
  pendingOrdersCount?: number;
  totalBagsOut?: number;
  dueAssets?: DueAsset[];
}

// Keep in sync with src/lib/rbac/permissions.ts route table.
const ACTION_ROLES: Record<string, TenantRole[]> = {
  '/dashboard/map': ['ADMIN', 'ACCOUNTANT'],
  '/settle': ['ADMIN', 'ACCOUNTANT'],
  '/deposits/shells': ['ADMIN', 'ACCOUNTANT'],
  '/inventory': ['ADMIN', 'ACCOUNTANT'],
  '/reports/debt': ['ADMIN', 'ACCOUNTANT'],
};

export function QuickActions({ pendingOrdersCount = 0, totalBagsOut = 0, dueAssets = [] }: QuickActionsProps) {
  const { user } = useAuth();
  const role = (user?.role as TenantRole | undefined) ?? null;
  const can = (href: string) =>
    !role || (ACTION_ROLES[href]?.includes(role) ?? true);

  return (
    <div className="flex flex-col gap-4">
      {/* Quick Access Shortcuts Grid */}
      <div className="rounded border border-outline-variant bg-card p-5 shadow-sm">
        <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-3">
          Lối tắt nghiệp vụ nhanh
        </h4>
        <div className="grid grid-cols-2 gap-2.5">
          {can('/dashboard/map') && (
          <Link
            href="/dashboard/map"
            className="flex items-center gap-2.5 p-2.5 rounded border border-outline-soft bg-surface hover:bg-container-high hover:border-[#004a99] transition-all group"
          >
            <div className="w-8 h-8 rounded bg-container-high group-hover:bg-[#004a99] group-hover:text-white text-primary-accent flex items-center justify-center transition-colors">
              <MapPin className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-on-surface truncate">Bản đồ GPS</p>
              <p className="text-[10px] text-faint">Vị trí xe & đơn</p>
            </div>
          </Link>
          )}

          {can('/settle') && (
          <Link
            href="/settle"
            className="flex items-center gap-2.5 p-2.5 rounded border border-outline-soft bg-surface hover:bg-container-high hover:border-[#004a99] transition-all group"
          >
            <div className="w-8 h-8 rounded bg-[#a0f399]/40 group-hover:bg-[#1b6d24] group-hover:text-white text-secondary flex items-center justify-center transition-colors">
              <DollarSign className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-on-surface truncate">Chốt ca xe</p>
              <p className="text-[10px] text-faint">Thu tiền tài xế</p>
            </div>
          </Link>
          )}

          {can('/deposits/shells') && (
          <Link
            href="/deposits/shells"
            className="flex items-center gap-2.5 p-2.5 rounded border border-outline-soft bg-surface hover:bg-container-high hover:border-[#004a99] transition-all group"
          >
            <div className="w-8 h-8 rounded bg-tertiary-fixed/60 group-hover:bg-[#7f3700] group-hover:text-white text-tertiary-container flex items-center justify-center transition-colors">
              <Package className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-on-surface truncate">Cọc vỏ bao</p>
              <p className="text-[10px] text-faint">Quản lý vỏ nợ</p>
            </div>
          </Link>
          )}

          {can('/inventory') && (
          <Link
            href="/inventory"
            className="flex items-center gap-2.5 p-2.5 rounded border border-outline-soft bg-surface hover:bg-container-high hover:border-[#004a99] transition-all group"
          >
            <div className="w-8 h-8 rounded bg-container-high group-hover:bg-[#004a99] group-hover:text-white text-primary-accent flex items-center justify-center transition-colors">
              <Snowflake className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-on-surface truncate">Nhập kho đá</p>
              <p className="text-[10px] text-faint">Ghi nhận mẻ đá</p>
            </div>
          </Link>
          )}
        </div>

        {can('/reports/debt') && (
        <Link
          href="/reports/debt"
          className="mt-3 flex items-center justify-between px-3 py-2 rounded bg-container-low border border-outline-soft hover:bg-container-high text-xs font-bold text-primary-deep transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <FileSpreadsheet className="h-4 w-4 text-primary-accent" />
            Xem Báo cáo công nợ tổng hợp
          </span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        )}
      </div>

      {/* Asset maintenance due soon (ops roles only — the parent is role-filtered) */}
      {can('/assets') && dueAssets.length > 0 && (
        <div className="rounded border border-tertiary-fixed/60 bg-tertiary-fixed/30 p-5 shadow-sm">
          <h4 className="text-xs font-bold uppercase tracking-wider text-tertiary-container mb-3 flex items-center gap-1.5">
            <CalendarClock className="h-4 w-4" />
            Tài sản sắp đến hạn
          </h4>
          <div className="space-y-2">
            {dueAssets.map((item, index) => {
              const days = Math.ceil((new Date(item.dueAt).getTime() - Date.now()) / 86400000);
              const urgent = days <= 7;
              return (
                <div
                  key={index}
                  className={`flex items-center justify-between gap-2 p-2.5 rounded border ${
                    urgent ? 'border-error/30 bg-error-container/60' : 'border-outline-soft bg-surface'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {urgent ? (
                      <AlertTriangle className="h-4 w-4 shrink-0 text-error" />
                    ) : (
                      <CalendarClock className="h-4 w-4 shrink-0 text-tertiary-container" />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-on-surface truncate">{item.assetName}</p>
                      <p className="text-[10px] text-on-surface-variant">
                        {item.type === 'ROUTINE' ? 'Bảo dưỡng' : item.type === 'INSPECTION' ? 'Đăng kiểm' : item.type === 'INSURANCE' ? 'Bảo hiểm' : 'Sửa chữa'}
                        {item.assetCode ? ` · ${item.assetCode}` : ''}
                      </p>
                    </div>
                  </div>
                  <span className={`shrink-0 text-xs font-bold font-data ${urgent ? 'text-error' : 'text-tertiary-container'}`}>
                    {days <= 0 ? 'Hết hạn' : `${days} ngày`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Realtime Operational Status / Alerts */}
      <div className="rounded border border-outline-variant bg-card p-5 shadow-sm">
        <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-3 flex items-center justify-between">
          <span>Tình trạng ca trực hôm nay</span>
          {pendingOrdersCount > 0 && (
            <span className="inline-flex items-center rounded bg-tertiary-fixed px-2 py-0.5 text-[10px] font-bold text-tertiary-container">
              {pendingOrdersCount} đơn chờ
            </span>
          )}
        </h4>

        <div className="space-y-2.5 text-xs">
          <div className="flex items-center justify-between p-2.5 rounded bg-surface border border-outline-soft">
            <div className="flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${pendingOrdersCount > 0 ? 'bg-[#f59e0b] animate-pulse' : 'bg-[#10b981]'}`} />
              <span className="text-on-surface-variant font-medium">Đơn hàng cần giao:</span>
            </div>
            <span className="font-bold text-on-surface">{pendingOrdersCount} đơn hàng</span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded bg-surface border border-outline-soft">
            <div className="flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${totalBagsOut > 500 ? 'bg-[#ba1a1a]' : 'bg-[#004a99]'}`} />
              <span className="text-on-surface-variant font-medium">Tổng vỏ bao ở khách:</span>
            </div>
            <span className="font-bold text-primary-accent">{totalBagsOut.toLocaleString('vi-VN')} vỏ</span>
          </div>

          {totalBagsOut > 500 && (
            <div className="flex items-start gap-2 p-2.5 rounded bg-tertiary-fixed/40 border border-tertiary-container/30 text-tertiary-container">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-tertiary-container" />
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
