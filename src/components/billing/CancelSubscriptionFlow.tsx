'use client';

import { useState } from 'react';
import type { Subscription } from '@prisma/client';
import { exportCustomerDebtExcel } from '@/lib/export-excel';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/dashboard/toast';

interface CancelSubscriptionFlowProps {
  subscription: Subscription;
  factoryId: string;
}

export function CancelSubscriptionFlow({ subscription, factoryId }: CancelSubscriptionFlowProps) {
  const [showModal, setShowModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const router = useRouter();

  const handleExportAndCancel = async () => {
    setCancelling(true);

    try {
      // 1. Fetch customer debt data for export
      const exportRes = await fetch('/api/customers/debt-export');

      if (!exportRes.ok) {
        throw new Error('Failed to fetch export data');
      }

      const { customers, orders } = await exportRes.json();

      // 2. Trigger Excel download immediately (before cancel)
      if (customers) {
        exportCustomerDebtExcel(customers, orders || []);
      }

      // 3. Call cancel API
      const cancelRes = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId: subscription.id }),
      });

      if (cancelRes.ok) {
        router.refresh();
        setShowModal(false);
        toast({
          type: 'success',
          title: 'Đã hủy dịch vụ',
          message: 'Dữ liệu đã được xuất file Excel.',
        });
      } else {
        toast({ type: 'error', title: 'Có lỗi xảy ra khi hủy dịch vụ.' });
      }
    } catch (error) {
      console.error('Cancel error:', error);
      toast({ type: 'error', title: 'Có lỗi xảy ra khi hủy dịch vụ.' });
    } finally {
      setCancelling(false);
    }
  };

  const handleContinueTrial = () => {
    setShowModal(false);
  };

  const handleContactSupport = () => {
    window.location.href = 'mailto:support@iceflow.vn';
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="text-red-600 text-sm underline hover:no-underline"
      >
        Hủy dịch vụ
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-lg font-semibold mb-4">Hủy dịch vụ</h2>
            <p className="text-gray-600 mb-6">
              Trước khi xác nhận hủy, bạn có muốn xuất dữ liệu công nợ không?
              Dữ liệu sẽ được tải về dưới dạng file Excel.
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleExportAndCancel}
                disabled={cancelling}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {cancelling ? 'Đang xử lý...' : 'Xuất dữ liệu & Hủy'}
              </button>
              <button
                onClick={handleContinueTrial}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
              >
                Tiếp tục dùng thử
              </button>
              <button
                onClick={handleContactSupport}
                className="w-full px-4 py-2 text-gray-500 underline hover:no-underline text-sm"
              >
                Liên hệ hỗ trợ
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
