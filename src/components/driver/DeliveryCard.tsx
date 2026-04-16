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
      className={`rounded-2xl border backdrop-blur-xl overflow-hidden transition-all ${
        isDelivered
          ? 'bg-emerald-500/5 border-emerald-500/20'
          : 'bg-white/5 border-white/10'
      }`}
    >
      {/* Card Header */}
      <div className="p-4">
        {/* STT and Status Row */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <span className="inline-block px-2 py-0.5 bg-slate-700/50 text-slate-300 text-xs rounded mb-1">
              #{index}
            </span>
            <h3 className="text-lg font-bold text-white">{order.customer.name}</h3>
          </div>
          <span
            className={`px-2 py-1 rounded-lg text-xs font-semibold ${
              isDelivered
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-amber-500/20 text-amber-400'
            }`}
          >
            {isDelivered ? 'Đã giao' : 'Chờ giao'}
          </span>
        </div>

        {/* Items */}
        <div className="flex items-center gap-2 text-slate-300 text-sm mb-3">
          <span className="text-cyan-400">❄️</span>
          <span>{formatItems(order.orderItems)}</span>
        </div>

        {/* Address (tappable) */}
        <button
          onClick={() => openGoogleMaps(order.customer.address)}
          className="flex items-center gap-2 text-slate-400 text-sm mb-4 hover:text-white transition-colors w-full text-left"
        >
          <MapPin className="h-4 w-4 shrink-0" />
          <span className="flex-1">{order.customer.address}</span>
          <Navigation className="h-4 w-4 shrink-0" />
        </button>

        {/* Money to collect */}
        <div className="bg-slate-800/50 rounded-xl p-3 mb-4">
          <span className="text-slate-400 text-sm">Tiền cần thu</span>
          <p className="text-xl font-bold text-white">{formatCurrency(order.total)}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => callCustomer(order.customer.phone)}
            className="flex-1 flex items-center justify-center gap-2 min-h-[44px] bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors"
          >
            <Phone className="h-5 w-5" />
            Gọi điện
          </button>
          <button
            onClick={() => openGoogleMaps(order.customer.address)}
            className="flex-1 flex items-center justify-center gap-2 min-h-[44px] bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors"
          >
            <MapPin className="h-5 w-5" />
            Chỉ đường
          </button>
        </div>
      </div>

      {/* Confirm Delivery Footer */}
      {!isDelivered && (
        <button
          onClick={() => onConfirm(order.id)}
          className="w-full min-h-[48px] bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
        >
          <Check className="h-5 w-5" />
          Xác nhận đã giao
        </button>
      )}
      {isDelivered && (
        <div className="w-full min-h-[48px] bg-emerald-500/20 text-emerald-400 font-semibold text-sm flex items-center justify-center gap-2">
          <Check className="h-5 w-5" />
          Đã hoàn thành
        </div>
      )}
    </div>
  );
}