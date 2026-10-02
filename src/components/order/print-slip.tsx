'use client';

interface PrintSlipProps {
  order: {
    id: string;
    code?: string;
    customer: { name: string; address: string; phone: string };
    orderItems: Array<{
      product: { name: string; sizeKg: number };
      quantity: number;
      unitPrice: number;
      lineTotal: number;
    }>;
    total: number;
    createdAt: string | Date;
  };
}

export function PrintSlip({ order }: PrintSlipProps) {
  const formatCurrency = (amount: number) =>
    amount.toLocaleString('vi-VN');

  const formatDate = (dateStr: string | Date) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="print-slip">
      {/* Company header */}
      <div className="text-center font-bold text-base mb-2">
        CÔNG TY TNHH ĐÁ LẠNH ICEFLOW
      </div>
      <div className="text-center text-xs text-faint mb-4">
        123 Đường ABC, Quận XYZ, TP.HCM | Tel: 0909 123 456
      </div>

      {/* Slip title */}
      <div className="text-center font-bold text-sm mb-3 border-t border-b border-black py-1">
        PHIẾU GIAO HÀNG
      </div>

      {/* Order info */}
      <div className="flex justify-between text-xs mb-2">
        <div><strong>Mã đơn:</strong> {order.id.slice(-6).toUpperCase()}</div>
        <div><strong>Ngày:</strong> {formatDate(order.createdAt)}</div>
      </div>

      {/* Customer info */}
      <div className="text-xs mb-3 border border-dashed border-gray-400 p-2 rounded">
        <div><strong>Khách hàng:</strong> {order.customer.name}</div>
        <div><strong>Địa chỉ:</strong> {order.customer.address}</div>
        <div><strong>Điện thoại:</strong> {order.customer.phone}</div>
      </div>

      {/* Products table */}
      <table className="w-full text-xs mb-3 border-collapse">
        <thead>
          <tr className="border-b border-black">
            <th className="text-left py-1">Sản phẩm</th>
            <th className="text-center py-1">SL</th>
            <th className="text-right py-1">Đơn giá</th>
            <th className="text-right py-1">Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          {order.orderItems.map((item, i) => (
            <tr key={i} className="border-b border-dashed border-outline-variant">
              <td className="py-1">{item.product.name} {item.product.sizeKg}kg</td>
              <td className="text-center py-1">{item.quantity}</td>
              <td className="text-right py-1">{formatCurrency(item.unitPrice)}đ</td>
              <td className="text-right py-1">{formatCurrency(item.lineTotal)}đ</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Total */}
      <div className="flex justify-between font-bold text-sm mb-4 border-t border-b border-black py-1">
        <span>TỔNG CỘNG:</span>
        <span>{formatCurrency(order.total)}đ</span>
      </div>

      {/* Signature lines - D-04 */}
      <div className="flex justify-between text-xs mt-6">
        <div className="text-center">
          <div>Người giao hàng</div>
          <div className="h-8"></div>
          <div>(Ký và ghi rõ họ tên)</div>
        </div>
        <div className="text-center">
          <div>Khách hàng xác nhận</div>
          <div className="h-8 border-b border-black"></div>
          <div>Chữ ký khách hàng: _____________</div>
        </div>
      </div>
    </div>
  );
}