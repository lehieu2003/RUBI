'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { PrintSlip } from '@/components/order/print-slip';
import { Printer, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { API_ENDPOINTS } from '@/lib/api-endpoints';

interface OrderItemWithProduct {
  id: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  product: { id: string; name: string; sizeKg: number; unit: string };
}

interface CustomerInfo {
  id: string;
  code: string;
  name: string;
  address: string;
  phone: string;
}

interface OrderDetail {
  id: string;
  code: string;
  status: string;
  total: string;
  notes: string | null;
  createdAt: string;
  customer: CustomerInfo;
  orderItems: OrderItemWithProduct[];
}

export default function OrderDetailPage() {
  const params = useParams();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPrintSlip, setShowPrintSlip] = useState(false);

  useEffect(() => {
    async function fetchOrder() {
      try {
        const res = await fetch(API_ENDPOINTS.ORDERS.BASE);
        const json = await res.json();
        const orders = json?.data !== undefined ? json.data : json;
        // Find this order by id
        const found = Array.isArray(orders) ? orders.find((o: OrderDetail) => o.id === params.id) : null;
        if (found) {
          setOrder(found);
        } else {
          setError('Order not found');
        }
      } catch (err) {
        setError('Failed to load order');
      } finally {
        setLoading(false);
      }
    }
    fetchOrder();
  }, [params.id]);

  // Use effect to print after PrintSlip renders to DOM
  useEffect(() => {
    if (showPrintSlip) {
      // Wait for React to render PrintSlip to DOM, then print
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.print();
          setShowPrintSlip(false); // Reset after print
        });
      });
    }
  }, [showPrintSlip]);

  const handlePrint = () => {
    setShowPrintSlip(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-red-400">{error || 'Order not found'}</div>
      </div>
    );
  }

  // Convert order to PrintSlip format
  const slipOrder = {
    id: order.id,
    code: order.code || `DH-${order.id.slice(-6).toUpperCase()}`,
    customer: order.customer,
    orderItems: order.orderItems.map((item) => ({
      product: { name: item.product.name, sizeKg: item.product.sizeKg },
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      lineTotal: Number(item.lineTotal),
    })),
    total: Number(order.total),
    createdAt: order.createdAt,
  };

  const statusColors: Record<string, string> = {
    PENDING: 'bg-slate-500/20 text-slate-300',
    SHIPPING: 'bg-amber-500/20 text-amber-400',
    DELIVERED: 'bg-blue-500/20 text-blue-400',
    COMPLETED: 'bg-emerald-500/20 text-emerald-400',
    CANCELLED: 'bg-red-500/20 text-red-400',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800">
      {/* Header - hidden when printing */}
      <div className="print:hidden relative p-8">
        {/* Back link */}
        <Link
          href="/orders"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại danh sách
        </Link>

        {/* Page title row with Print button - D-03 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-black text-white">Chi tiết đơn hàng</h1>
            <p className="text-slate-400 mt-1">
              <span className="font-mono text-blue-400">{slipOrder.code}</span>
              <span className={`ml-3 inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${statusColors[order.status]}`}>
                {order.status}
              </span>
            </p>
          </div>

          {/* Print button - D-03: Large button at top of order detail view */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold text-base hover:bg-blue-700 transition-colors shadow-lg"
          >
            <Printer className="h-5 w-5" />
            In phiếu giao hàng
          </button>
        </div>

        {/* Order details card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
          {/* Customer info */}
          <div className="mb-6 pb-6 border-b border-white/10">
            <h2 className="text-sm font-semibold text-slate-400 uppercase mb-3">Thông tin khách hàng</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500">Tên khách hàng</p>
                <p className="text-lg font-medium text-white">{order.customer.name}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Mã khách hàng</p>
                <p className="text-lg font-mono text-blue-400">{order.customer.code}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Địa chỉ</p>
                <p className="text-white">{order.customer.address}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Điện thoại</p>
                <p className="text-white">{order.customer.phone}</p>
              </div>
            </div>
          </div>

          {/* Order items */}
          <div className="mb-6 pb-6 border-b border-white/10">
            <h2 className="text-sm font-semibold text-slate-400 uppercase mb-3">Sản phẩm</h2>
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-white/10">
                  <th className="pb-2">Sản phẩm</th>
                  <th className="pb-2 text-center">Số lượng</th>
                  <th className="pb-2 text-right">Đơn giá</th>
                  <th className="pb-2 text-right">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {order.orderItems.map((item) => (
                  <tr key={item.id} className="border-b border-white/5">
                    <td className="py-3 text-white">
                      {item.product.name} {item.product.sizeKg}kg
                    </td>
                    <td className="py-3 text-center text-slate-300">{item.quantity}</td>
                    <td className="py-3 text-right text-slate-300">
                      {Number(item.unitPrice).toLocaleString('vi-VN')}đ
                    </td>
                    <td className="py-3 text-right font-medium text-white">
                      {Number(item.lineTotal).toLocaleString('vi-VN')}đ
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Total */}
          <div className="flex justify-between items-center">
            <span className="text-lg font-medium text-slate-300">Tổng cộng</span>
            <span className="text-2xl font-bold text-emerald-400">
              {Number(order.total).toLocaleString('vi-VN')}đ
            </span>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-xs text-slate-500">Ghi chú</p>
              <p className="text-white">{order.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Print-only content: PrintSlip hidden on screen, visible in print */}
      {/* D-01: Browser print - CSS @media print hides everything except .print-slip */}
      {showPrintSlip && (
        <div className="hidden print:block">
          <PrintSlip order={slipOrder} />
        </div>
      )}
    </div>
  );
}