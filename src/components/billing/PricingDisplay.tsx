interface PricingDisplayProps {
  driverCount: number;
  pricePerDriver?: number;
}

export function PricingDisplay({ driverCount, pricePerDriver = 150000 }: PricingDisplayProps) {
  // Admin account is free — only additional drivers are charged
  const chargeableDrivers = Math.max(0, driverCount - 1);
  const monthlyTotal = chargeableDrivers * pricePerDriver;
  const isFree = driverCount <= 1;

  return (
    <div className="bg-white rounded-lg border p-4">
      <h2 className="text-lg font-semibold mb-4">Bảng giá</h2>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Giá mỗi driver:</span>
          <span className="font-medium">
            {pricePerDriver.toLocaleString('vi-VN')} VND / tháng
          </span>
        </div>
        <div className="flex justify-between">
          <span>Tài khoản Admin:</span>
          <span className="text-green-600">Miễn phí</span>
        </div>
        <div className="flex justify-between">
          <span>Số lượng driver đang hoạt động:</span>
          <span className="font-medium">{driverCount}</span>
        </div>
        <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
          <span>Tổng cộng hàng tháng:</span>
          <span>
            {isFree
              ? 'Miễn phí'
              : `${monthlyTotal.toLocaleString('vi-VN')} VND / tháng`}
          </span>
        </div>
      </div>

      {!isFree && (
        <p className="text-xs text-gray-500 mt-3">
          Bao gồm: 1 Admin (miễn phí) + {chargeableDrivers} Driver ×{' '}
          {pricePerDriver.toLocaleString('vi-VN')} VND
        </p>
      )}
      {isFree && (
        <p className="text-xs text-gray-500 mt-3">
          Gói của bạn hiện miễn phí (chưa có driver hoặc chỉ có Admin).
        </p>
      )}
    </div>
  );
}
