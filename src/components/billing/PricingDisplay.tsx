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
    <div className="rounded border border-outline-variant bg-card p-5 shadow-sm">
      <h2 className="mb-4 text-base font-bold text-on-surface">Bảng Giá Dịch Vụ</h2>

      <div className="space-y-2.5 text-sm">
        <div className="flex justify-between">
          <span className="text-on-surface-variant">Giá mỗi tài xế:</span>
          <span className="font-bold text-on-surface">
            {pricePerDriver.toLocaleString('vi-VN')} đ / tháng
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-on-surface-variant">Tài khoản Quản lý (Admin):</span>
          <span className="font-bold text-secondary">Miễn phí</span>
        </div>
        <div className="flex justify-between">
          <span className="text-on-surface-variant">Số lượng tài xế đang hoạt động:</span>
          <span className="font-bold text-primary-accent">{driverCount}</span>
        </div>
        <div className="mt-3 flex justify-between border-t border-outline-soft pt-3 font-bold text-on-surface">
          <span>Tổng cộng hàng tháng:</span>
          <span className="data-lg font-bold text-primary-accent">
            {isFree
              ? 'Miễn phí'
              : `${monthlyTotal.toLocaleString('vi-VN')} đ / tháng`}
          </span>
        </div>
      </div>

      {!isFree && (
        <p className="mt-3 text-xs text-faint">
          Bao gồm: 1 Admin (miễn phí) + {chargeableDrivers} Tài xế ×{' '}
          {pricePerDriver.toLocaleString('vi-VN')} đ
        </p>
      )}
      {isFree && (
        <p className="mt-3 text-xs text-faint">
          Gói của bạn hiện miễn phí (chưa có tài xế hoặc chỉ có 1 tài xế).
        </p>
      )}
    </div>
  );
}
