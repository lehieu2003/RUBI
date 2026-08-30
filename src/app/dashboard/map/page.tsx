'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Sidebar } from '@/components/dashboard/sidebar';
import { MapPin, Calendar, Truck } from 'lucide-react';
import { API_ENDPOINTS } from '@/lib/api-endpoints';

// Dynamic import MapInner to avoid SSR issues with Leaflet
const MapInner = dynamic(() => import('@/components/driver/MapInner'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-slate-900">
      <div className="text-slate-400">Đang tải bản đồ...</div>
    </div>
  ),
});

interface DriverForSelect {
  id: string;
  name: string;
  phone: string | null;
}

interface OrderForMap {
  id: string;
  status: 'SHIPPING' | 'DELIVERED';
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  deliveryGps: { lat: number; lng: number } | null;
  driverName: string | null;
  driverId: string | null;
  createdAt: string;
}

export default function AdminMapPage() {
  const [orders, setOrders] = useState<OrderForMap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [selectedDriverId, setSelectedDriverId] = useState<string>('all');
  const [drivers, setDrivers] = useState<DriverForSelect[]>([]);

  useEffect(() => {
    async function fetchDrivers() {
      try {
        const res = await fetch(API_ENDPOINTS.DRIVERS.BASE);
        if (res.ok) {
          const data = await res.json();
          setDrivers(data);
        }
      } catch (err) {
        console.error('Failed to fetch drivers:', err);
      }
    }
    fetchDrivers();
  }, []);

  useEffect(() => {
    async function fetchMapData() {
      setLoading(true);
      try {
        let url = `/api/orders/map?date=${selectedDate}`;
        if (selectedDriverId !== 'all') {
          url += `&driverId=${selectedDriverId}`;
        }
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch map data');
        const data = await res.json();
        setOrders(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchMapData();
  }, [selectedDate, selectedDriverId]);

  // Calculate center from orders with GPS
  const ordersWithGps = orders.filter((o) => o.deliveryGps);
  const center: [number, number] = ordersWithGps.length > 0
    ? [
        ordersWithGps.reduce((sum, o) => sum + (o.deliveryGps?.lat || 0), 0) / ordersWithGps.length,
        ordersWithGps.reduce((sum, o) => sum + (o.deliveryGps?.lng || 0), 0) / ordersWithGps.length,
      ]
    : [10.8231, 106.6297]; // Default to Ho Chi Minh City

  const handleMarkerClick = (id: string) => {
    // Could open a popup or highlight the order in a list
    console.log('Marker clicked:', id);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-600/10 to-violet-600/10 rounded-full blur-3xl" />
      </div>

      <Sidebar />

      <main className="pl-64">
        <div className="relative p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-black text-white">Bản đồ Giao hàng</h1>
              <p className="text-slate-400 mt-1">
                {orders.length} đơn hàng • {ordersWithGps.length} có GPS
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-slate-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50"
              />
            </div>

            <select
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(e.target.value)}
              className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50"
            >
              <option value="all" className="bg-slate-900">Tất cả tài xế</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id} className="bg-slate-900">{d.name}</option>
              ))}
            </select>
          </div>

          {/* Map */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden">
            <div className="h-[calc(100vh-280px)] min-h-[500px]">
              {loading ? (
                <div className="h-full flex items-center justify-center bg-slate-900">
                  <div className="text-slate-400">Đang tải bản đồ...</div>
                </div>
              ) : error ? (
                <div className="h-full flex items-center justify-center bg-slate-900">
                  <div className="text-red-400">Lỗi: {error}</div>
                </div>
              ) : (
                <MapInner
                  orders={orders.map((o) => ({
                    id: o.id,
                    status: o.status,
                    customer: { name: o.customerName, address: o.customerAddress },
                    deliveryGps: o.deliveryGps,
                  }))}
                  center={center}
                  onMarkerClick={handleMarkerClick}
                />
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-amber-500 border-2 border-white"></div>
              <span className="text-sm text-slate-400">Đang giao</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-emerald-500 border-2 border-white"></div>
              <span className="text-sm text-slate-400">Đã giao</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}