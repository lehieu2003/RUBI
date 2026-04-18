'use client';
import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { TenantTable } from '@/components/admin/tenant-table';
import { toast } from 'sonner';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [toastShown, setToastShown] = useState(false);

  const handleError = (message: string) => {
    if (!toastShown) {
      toast.error(message);
      setToastShown(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header with back navigation */}
      <div className="max-w-7xl mx-auto px-4 pt-6 pb-4">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">Quay lại Tổng quan</span>
          </button>
        </div>

        {/* Page title */}
        <h1 className="text-2xl font-black text-slate-50">Quản lý thuê bao</h1>
        <p className="text-sm text-slate-400 mt-1">
          Quản lý subscription cho tất cả các nhà máy
        </p>
      </div>

      {/* Tenant table */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <TenantTable onError={handleError} />
        </div>
      </div>
    </div>
  );
}