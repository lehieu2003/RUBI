'use client';

import type { Subscription } from '@prisma/client';
import { useState } from 'react';

interface PaymentRecorderProps {
  subscription: Subscription;
  driverCount: number;
  onPaymentConfirmed?: () => void;
}

export function PaymentRecorder({
  subscription,
  driverCount,
  onPaymentConfirmed,
}: PaymentRecorderProps) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const expectedAmount = Math.max(0, driverCount - 1) * 150000;

  const handleConfirm = async () => {
    setLoading(true);
    setMessage(null);

    const parsedAmount = parseInt(amount) || expectedAmount;
    if (parsedAmount <= 0) {
      setMessage({ type: 'error', text: 'Số tiền phải lớn hơn 0' });
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/payments/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId: subscription.id,
          amount: parsedAmount,
          paidAt: new Date().toISOString(),
        }),
      });

      if (res.ok) {
        setMessage({
          type: 'success',
          text: 'Đã xác nhận thanh toán! Đăng ký đã được gia hạn thêm 30 ngày.',
        });
        setAmount('');
        onPaymentConfirmed?.();
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || 'Có lỗi xảy ra' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Không thể kết nối server' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border p-4">
      <h2 className="text-lg font-semibold mb-4">Xác nhận thanh toán</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Số tiền (VND)
          </label>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={String(expectedAmount)}
          />
          <p className="text-xs text-gray-500 mt-1">
            Số tiền mong đợi: {expectedAmount.toLocaleString('vi-VN')} VND
          </p>
        </div>

        <button
          onClick={handleConfirm}
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Đang xử lý...' : 'Xác nhận thanh toán'}
        </button>

        {message && (
          <div
            className={`p-3 rounded-lg text-sm ${
              message.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
}
