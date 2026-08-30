'use client';

import { Phone, MapPin, Check, Navigation } from 'lucide-react';

interface DeliveryCardProps {
  order: {
    id: string;
    status: 'SHIPPING' | 'DELIVERED';
    total: number;
    customer: { name: string; address: string; phone: string };
    orderItems: Array<{ quantity: number; product: { name: string; sizeKg: number } }>;
  };
  index: number;
  onConfirm: (orderId: string) => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatItems(
  items: Array<{ quantity: number; product: { name: string; sizeKg: number } }>
): string {
  return items
    .map((item) => `${item.product.name} ${item.product.sizeKg}kg × ${item.quantity}`)
    .join(', ');
}

function openGoogleMaps(address: string) {
  const encoded = encodeURIComponent(address);
  window.open(
    `https://www.google.com/maps/search/?api=1&query=${encoded}`,
    '_blank'
  );
}

function callCustomer(phone: string) {
  window.open(`tel:${phone}`, '_self');
}

export default function DeliveryCard({ order, index, onConfirm }: DeliveryCardProps) {
  const isDelivered = order.status === 'DELIVERED';

  return (
    <div
      className={`rounded border overflow-hidden transition-all duration-150 ${
        isDelivered
          ? 'bg-[#a0f399]/15 border-[#1b6d24]'
          : 'bg-white border-[#c2c6d3] shadow-sm'
      }`}
    >
      {/* Card Header */}
      <div className="p-4">
        {/* STT and Status Row */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <span className="inline-block px-2 py-0.5 bg-[#d8e3fb] text-[#00346f] data-sm font-bold rounded mb-1">
              ĐIỂM GIAO #{index}
            </span>
            <h3 className="text-lg font-bold text-[#111c2d] leading-snug">
              {order.customer.name}
            </h3>
          </div>
          <span
            className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider text-white ${
              isDelivered ? 'bg-[#1b6d24]' : 'bg-[#004a99]'
            }`}
          >
            {isDelivered ? 'Đã giao' : 'Đang giao'}
          </span>
        </div>

        {/* Items */}
        <div className="rounded bg-[#f0f3ff] p-2.5 my-3 border border-[#dee8ff]">
          <span className="text-xs font-bold uppercase tracking-wider text-[#424751] block mb-1">
            Hàng cần giao:
          </span>
          <p className="data-md font-bold text-[#00346f]">
            {formatItems(order.orderItems)}
          </p>
        </div>

        {/* Address (tappable) */}
        <button
          onClick={() => openGoogleMaps(order.customer.address)}
          className="flex items-center gap-2 text-[#424751] hover:text-[#004a99] text-sm mb-4 w-full text-left py-2 px-2.5 rounded bg-[#f9f9ff] border border-[#e7eeff]"
        >
          <MapPin className="h-4 w-4 shrink-0 text-[#004a99]" />
          <span className="flex-1 font-medium">{order.customer.address}</span>
          <Navigation className="h-4 w-4 shrink-0 text-[#004a99]" />
        </button>

        {/* Money to collect */}
        <div className="flex items-center justify-between bg-[#f8fafc] border border-[#cbd5e1] rounded-xl p-3.5 mb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-[#475569]">
            Tiền cần thu:
          </span>
          <p className="font-mono text-xl font-black text-[#0f172a] tabular-nums">
            {formatCurrency(order.total)}
          </p>
        </div>

        {/* Action Buttons (Strict minimum 52px touch target for driver) */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => callCustomer(order.customer.phone)}
            className="flex items-center justify-center gap-2 h-14 rounded-xl border-2 border-[#004a99] bg-white text-[#004a99] font-bold text-base hover:bg-[#dee8ff] active:scale-[0.98] transition-all shadow-sm"
          >
            <Phone className="h-5 w-5" />
            Gọi khách
          </button>

          {!isDelivered ? (
            <button
              onClick={() => onConfirm(order.id)}
              className="flex items-center justify-center gap-2 h-14 rounded-xl bg-[#15803d] text-white font-bold text-base hover:bg-[#166534] active:scale-[0.98] transition-all shadow-md shadow-emerald-900/20"
            >
              <Check className="h-6 w-6 stroke-[2.5]" />
              Giao xong
            </button>
          ) : (
            <div className="flex items-center justify-center gap-2 h-14 rounded-xl bg-[#f0fdf4] border border-[#86efac] text-[#166534] font-bold text-sm">
              <Check className="h-5 w-5 stroke-[2.5]" />
              Đã hoàn tất
            </div>
          )}
        </div>
      </div>
    </div>
  );
}