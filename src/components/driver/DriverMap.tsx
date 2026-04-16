'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the map component with SSR disabled
const MapInner = dynamic(() => import('./MapInner'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="h-12 w-12 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center mx-auto mb-4 animate-pulse">
          <span className="text-2xl">🗺️</span>
        </div>
        <p className="text-slate-400 text-sm">Đang tải bản đồ...</p>
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
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Set isClient to true after initial mount to avoid SSR hydration issues
    setIsClient(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        className="fixed inset-0 bg-black/70 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Map Overlay */}
      <div className="fixed inset-0 z-50 flex flex-col">
        {/* Header */}
        <div className="bg-slate-900/95 backdrop-blur-xl border-b border-white/10 px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Bản đồ giao hàng</h2>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg transition-colors"
          >
            Đóng
          </button>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative">
          {isClient ? (
            <MapInner
              orders={ordersWithGps}
              center={center}
              onMarkerClick={(id) => {
                document.getElementById(`order-${id}`)?.scrollIntoView({ behavior: 'smooth' });
                onClose();
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-slate-400">Đang tải bản đồ...</p>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="bg-slate-900/95 backdrop-blur-xl border-t border-white/10 px-4 py-3">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-amber-500" />
              <span className="text-slate-300">Chờ giao</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full bg-emerald-500" />
              <span className="text-slate-300">Đã giao</span>
            </div>
            {ordersWithGps.length !== orders.length && (
              <span className="text-slate-500 text-xs ml-auto">
                {orders.length - ordersWithGps.length} đơn chưa có GPS
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}