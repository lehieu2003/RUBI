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
    <div className="bg-white rounded-lg border p-4">
      <h2 className="text-lg font-semibold mb-4">Thanh toán qua chuyển khoản</h2>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="w-36 text-gray-600">Ngân hàng:</span>
          <span className="font-medium">Vietcombank</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="w-36 text-gray-600">Số tài khoản:</span>
          <span className="font-medium font-mono">1234567890</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="w-36 text-gray-600">Tên tài khoản:</span>
          <span className="font-medium">CTY TNHH ICEFLOW</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="w-36 text-gray-600">Số tiền:</span>
          <span className="font-medium text-blue-600">{formattedAmount} VND</span>
        </div>

        <div className="border rounded p-3 bg-gray-50">
          <p className="text-xs text-gray-500 mb-1">Nội dung chuyển khoản (copy):</p>
          <code className="text-sm break-all text-gray-800 select-all">{content}</code>
        </div>
      </div>

      <p className="text-xs text-gray-500 mt-4">
        Quý khách vui lòng chuyển khoản với nội dung bên trên và nhấn &quot;Xác nhận thanh
        toán&quot; sau khi hoàn tất.
      </p>
    </div>
  );
}
