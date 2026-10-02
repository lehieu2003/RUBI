'use client';

import { isWithinWarningPeriod, getDaysRemaining } from '@/lib/subscription-status';
import type { Subscription } from '@prisma/client';
import { useRouter } from 'next/navigation';

interface TrialWarningModalProps {
  subscription: Subscription;
  onDismiss?: () => void;
}

export function TrialWarningModal({ subscription, onDismiss }: TrialWarningModalProps) {
  const router = useRouter();
  const daysRemaining = getDaysRemaining(subscription);
  const isWarning = isWithinWarningPeriod(subscription);

  if (!isWarning) return null;

  const handleUpgrade = () => {
    router.push('/settings/billing');
  };

  const handleContact = () => {
    window.location.href = 'mailto:support@iceflow.vn';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-start gap-4">
          <div className="text-4xl">⚠️</div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Thời gian dùng thử sắp kết thúc
            </h2>
            <p className="text-gray-600 mb-4">
              Còn <strong>{daysRemaining} ngày</strong> trước khi tài khoản chuyển sang chế độ chỉ đọc.
              Để không gián đoạn công việc, vui lòng nâng cấp hoặc liên hệ hỗ trợ.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleUpgrade}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
              >
                Nâng cấp ngay
              </button>
              <button
                onClick={handleContact}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
              >
                Liên hệ hỗ trợ
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}