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
    <div className="rounded border border-[#c2c6d3] bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-base font-bold text-[#111c2d]">Thông Tin Chuyển Khoản</h2>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="w-36 text-[#737783]">Ngân hàng:</span>
          <span className="font-bold text-[#111c2d]">Vietcombank</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="w-36 text-[#737783]">Số tài khoản:</span>
          <span className="font-mono font-bold text-[#004a99]">1234567890</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="w-36 text-[#737783]">Tên tài khoản:</span>
          <span className="font-bold text-[#111c2d]">CTY TNHH ICEFLOW</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="w-36 text-[#737783]">Số tiền:</span>
          <span className="data-lg font-bold text-[#1b6d24]">{formattedAmount} đ</span>
        </div>

        <div className="rounded border border-[#004a99]/20 bg-[#dee8ff]/50 p-3">
          <p className="mb-1 text-xs font-bold text-[#00346f] uppercase">Nội dung chuyển khoản (Copy):</p>
          <code className="select-all break-all text-sm font-mono font-bold text-[#002754]">{content}</code>
        </div>
      </div>

      <p className="mt-4 text-xs text-[#737783]">
        Quý khách vui lòng chuyển khoản đúng số tiền và nội dung bên trên để hệ thống tự động kích hoạt.
      </p>
    </div>
  );
}
