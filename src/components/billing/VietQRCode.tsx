interface VietQRCodeProps {
  amount: number;
  factoryName?: string;
  monthYear?: string;
}

export function buildVietQRContent(factoryName: string, monthYear: string): string {
  return `THANH TOAN ICEFLOW ${factoryName.toUpperCase()} ${monthYear}`;
}

export function VietQRCode({ amount, factoryName = 'KHACH HANG', monthYear }: VietQRCodeProps) {
  const now = new Date();
  const currentMonthYear =
    monthYear || `T${now.getMonth() + 1}/${now.getFullYear()}`;
  const content = buildVietQRContent(factoryName, currentMonthYear);
  const formattedAmount =
    amount > 0 ? new Intl.NumberFormat('vi-VN').format(amount) : '0';

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4 backdrop-blur">
      <h2 className="mb-4 text-lg font-semibold text-white">Thanh toán qua chuyển khoản</h2>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="w-36 text-slate-400">Ngân hàng:</span>
          <span className="font-medium text-white">Vietcombank</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="w-36 text-slate-400">Số tài khoản:</span>
          <span className="font-mono font-medium text-white">1234567890</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="w-36 text-slate-400">Tên tài khoản:</span>
          <span className="font-medium text-white">CTY TNHH ICEFLOW</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="w-36 text-slate-400">Số tiền:</span>
          <span className="font-medium text-blue-400">{formattedAmount} VND</span>
        </div>

        <div className="rounded border border-white/10 bg-slate-950/40 p-3">
          <p className="mb-1 text-xs text-slate-400">Nội dung chuyển khoản (copy):</p>
          <code className="select-all break-all text-sm text-slate-100">{content}</code>
        </div>
      </div>

      <p className="mt-4 text-xs text-slate-400">
        Quý khách vui lòng chuyển khoản với nội dung bên trên và nhấn &quot;Xác nhận thanh
        toán&quot; sau khi hoàn tất.
      </p>
    </div>
  );
}
