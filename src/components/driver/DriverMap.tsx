'use client';

import dynamic from 'next/dynamic';
import { Loader2, X } from 'lucide-react';

// Dynamically import the map component with SSR disabled
const MapInner = dynamic(() => import('./MapInner'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-[#f9f9ff]">
      <div className="text-center flex items-center gap-2 text-xs font-bold text-[#424751]">
        <Loader2 className="h-4 w-4 animate-spin text-[#004a99]" />
        <span>Đang tải bản đồ...</span>
      </div>
    </div>
  ),
});

interface DriverMapProps {
  orders: Array<{
    id: string;
    status: 'SHIPPING' | 'DELIVERED';
    customer: { name: string; address: string };
    deliveryGps: { lat: number; lng: number } | null;
  }>;
  isOpen: boolean;
  onClose: () => void;
}

// Default to Hanoi center
const DEFAULT_CENTER: [number, number] = [21.0285, 105.8542];

export default function DriverMap({ orders, isOpen, onClose }: DriverMapProps) {
  if (!isOpen) return null;

  // Filter orders with GPS for map markers
  const ordersWithGps = orders.filter((o) => o.deliveryGps !== null);

  // Find center point from first order with GPS, or use default
  const center: [number, number] =
    ordersWithGps.length > 0
      ? [ordersWithGps[0].deliveryGps!.lat, ordersWithGps[0].deliveryGps!.lng]
      : DEFAULT_CENTER;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 backdrop-blur-xs"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Map Overlay */}
      <div className="fixed inset-0 z-50 flex flex-col bg-[#f9f9ff]">
        {/* Header */}
        <div className="bg-[#00346f] border-b border-[#002754] px-4 py-3 flex items-center justify-between text-white shadow-sm">
          <h2 className="text-base font-bold text-white">Bản đồ điểm giao hàng</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded bg-[#004a99] hover:bg-[#002754] text-white transition-colors"
            aria-label="Đóng bản đồ"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative">
          <MapInner
            orders={ordersWithGps}
            center={center}
            onMarkerClick={(id) => {
              document.getElementById(`order-${id}`)?.scrollIntoView({ behavior: 'smooth' });
              onClose();
            }}
          />
        </div>

        {/* Legend */}
        <div className="bg-white border-t border-[#c2c6d3] px-4 py-2.5 shadow-sm">
          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#f59e0b] border border-white" />
              <span className="text-[#7f3700]">Chờ giao</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#10b981] border border-white" />
              <span className="text-[#1b6d24]">Đã giao</span>
            </div>
            {ordersWithGps.length !== orders.length && (
              <span className="text-[#737783] text-[11px] ml-auto">
                {orders.length - ordersWithGps.length} đơn chưa có tọa độ GPS
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}