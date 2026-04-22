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
    <div className="rounded-lg border border-white/10 bg-white/5 p-4 backdrop-blur">
      <h2 className="mb-4 text-lg font-semibold text-white">Bảng giá</h2>

      <div className="space-y-2 text-sm text-slate-300">
        <div className="flex justify-between">
          <span className="text-slate-400">Giá mỗi driver:</span>
          <span className="font-medium text-white">
            {pricePerDriver.toLocaleString('vi-VN')} VND / tháng
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Tài khoản Admin:</span>
          <span className="text-emerald-400">Miễn phí</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Số lượng driver đang hoạt động:</span>
          <span className="font-medium text-white">{driverCount}</span>
        </div>
        <div className="mt-2 flex justify-between border-t border-white/10 pt-2 font-semibold text-white">
          <span>Tổng cộng hàng tháng:</span>
          <span>
            {isFree
              ? 'Miễn phí'
              : `${monthlyTotal.toLocaleString('vi-VN')} VND / tháng`}
          </span>
        </div>
      </div>

      {!isFree && (
        <p className="mt-3 text-xs text-slate-400">
          Bao gồm: 1 Admin (miễn phí) + {chargeableDrivers} Driver ×{' '}
          {pricePerDriver.toLocaleString('vi-VN')} VND
        </p>
      )}
      {isFree && (
        <p className="mt-3 text-xs text-slate-400">
          Gói của bạn hiện miễn phí (chưa có driver hoặc chỉ có Admin).
        </p>
      )}
    </div>
  );
}
