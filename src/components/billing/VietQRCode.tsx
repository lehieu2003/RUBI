import { formatPaymentNote } from '@/lib/vietqr-template';

interface VietQRCodeProps {
  amount: number;
  factoryName?: string;
  subscriptionId?: string;
}

export function VietQRCode({ amount, factoryName, subscriptionId }: VietQRCodeProps) {
  // The subscription id prefix is what the payment webhook matches on;
  // the factory name is cosmetic context for the payer.
  const content = subscriptionId
    ? formatPaymentNote(factoryName || 'IceFlow', subscriptionId).toUpperCase()
    : 'THANH TOAN ICEFLOW - VUI LONG LIEN HE VAN PHONG';
  const formattedAmount =
    amount > 0 ? new Intl.NumberFormat('vi-VN').format(amount) : '0';

  return (
    <div className="rounded border border-outline-variant bg-card p-5 shadow-sm">
      <h2 className="mb-4 text-base font-bold text-on-surface">Thông Tin Chuyển Khoản</h2>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="w-36 text-faint">Ngân hàng:</span>
          <span className="font-bold text-on-surface">Vietcombank</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="w-36 text-faint">Số tài khoản:</span>
          <span className="font-mono font-bold text-primary-accent">1234567890</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="w-36 text-faint">Tên tài khoản:</span>
          <span className="font-bold text-on-surface">CTY TNHH ICEFLOW</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="w-36 text-faint">Số tiền:</span>
          <span className="data-lg font-bold text-secondary">{formattedAmount} đ</span>
        </div>

        <div className="rounded border border-[#004a99]/20 bg-container-high/50 p-3">
          <p className="mb-1 text-xs font-bold text-primary-deep uppercase">Nội dung chuyển khoản (Copy):</p>
          <code className="select-all break-all text-sm font-mono font-bold text-primary-dark">{content}</code>
        </div>
      </div>

      <p className="mt-4 text-xs text-faint">
        Quý khách vui lòng chuyển khoản đúng số tiền và nội dung bên trên để hệ thống tự động kích hoạt.
      </p>
    </div>
  );
}
