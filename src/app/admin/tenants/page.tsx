'use client';

import { useState } from 'react';
import { TenantTable } from '@/components/admin/tenant-table';
import { toast } from '@/components/dashboard/toast';

export default function AdminTenantsPage() {
  const [toastShown, setToastShown] = useState(false);

  const handleError = (message: string) => {
    if (!toastShown) {
      toast({ type: 'error', title: message });
      setToastShown(true);
      window.setTimeout(() => setToastShown(false), 3000);
    }
  };

  return (
    <div>
      <div className="mb-6 border-b border-[#c2c6d3] pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-[#111c2d]">Quản Lý Nhà Máy (Tenants)</h1>
        <p className="text-xs text-[#424751] mt-1">
          Danh sách tenant, trạng thái thuê bao, cấu hình giá theo tài xế và công cụ hỗ trợ trực tiếp.
        </p>
      </div>

      <TenantTable onError={handleError} />
    </div>
  );
}
