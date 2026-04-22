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
      <div className="mb-8">
        <p className="text-sm font-medium text-blue-400">Super Admin</p>
        <h1 className="mt-1 text-3xl font-black text-white">Nhà máy</h1>
        <p className="mt-2 text-slate-400">
          Quản lý tenant, subscription, giá theo driver và hỗ trợ nhà máy.
        </p>
      </div>

      <TenantTable onError={handleError} />
    </div>
  );
}
