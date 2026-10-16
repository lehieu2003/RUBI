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
          : 'bg-card border-outline-variant shadow-sm'
      }`}
    >
      {/* Card Header */}
      <div className="p-4">
        {/* STT and Status Row */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <span className="inline-block px-2 py-0.5 bg-container-highest text-primary-deep data-sm font-bold rounded mb-1">
              ĐIỂM GIAO #{index}
            </span>
            <h3 className="text-lg font-bold text-on-surface leading-snug">
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
        <div className="rounded bg-container-low p-2.5 my-3 border border-outline-soft">
          <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant block mb-1">
            Hàng cần giao:
          </span>
          <p className="data-md font-bold text-primary-deep">
            {formatItems(order.orderItems)}
          </p>
        </div>

        {/* Address (tappable) */}
        <button
          onClick={() => openGoogleMaps(order.customer.address)}
          className="flex items-center gap-2 text-on-surface-variant hover:text-primary-accent text-sm mb-3 w-full text-left py-2 px-2.5 rounded bg-surface border border-outline-soft"
        >
          <MapPin className="h-4 w-4 shrink-0 text-primary-accent" />
          <span className="flex-1 font-medium">{order.customer.address}</span>
          <Navigation className="h-4 w-4 shrink-0 text-primary-accent" />
        </button>

        {/* Money to collect */}
        <div className="flex items-center justify-between bg-surface border border-outline-variant rounded-xl p-3 mb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            Tiền cần thu:
          </span>
          <p className="font-mono text-xl font-bold text-on-surface tabular-nums">
            {formatCurrency(order.total)}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            onClick={() => callCustomer(order.customer.phone)}
            className="w-full flex items-center justify-center gap-1.5 h-12 rounded-xl border border-[#004a99] bg-card text-primary-accent font-bold text-sm hover:bg-container-high active:scale-[0.98] transition-all shadow-2xs"
          >
            <Phone className="h-4 w-4" />
            Gọi khách
          </button>

          {!isDelivered ? (
            <button
              onClick={() => onConfirm(order.id)}
              className="w-full flex items-center justify-center gap-2 h-14 rounded-xl bg-[#004a99] hover:bg-[#00346f] text-white font-bold text-base active:scale-[0.98] transition-all shadow-sm"
            >
              <Check className="h-6 w-6 stroke-[2.5]" />
              XÁC NHẬN ĐÃ GIAO XONG
            </button>
          ) : (
            <div className="w-full flex items-center justify-center gap-2 h-12 rounded-xl bg-[#a0f399]/40 border border-[#1b6d24]/30 text-secondary font-bold text-sm">
              <Check className="h-5 w-5 stroke-[2.5]" />
              ĐÃ HOÀN TẤT GIAO HÀNG
            </div>
          )}
        </div>
      </div>
    </div>
  );
}