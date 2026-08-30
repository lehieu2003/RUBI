'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { Calendar, Loader2, RefreshCw } from 'lucide-react';
import { API_ENDPOINTS } from '@/lib/api-endpoints';

// Dynamic import MapInner to avoid SSR issues with Leaflet
const MapInner = dynamic(() => import('@/components/driver/MapInner'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-[#f9f9ff]">
      <div className="flex items-center gap-2 text-xs font-bold text-[#424751]">
        <Loader2 className="h-4 w-4 animate-spin text-[#004a99]" />
        Đang tải bản đồ...
      </div>
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
          const json = await res.json();
          const data = json?.data !== undefined ? json.data : json;
          setDrivers(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Failed to fetch drivers:', err);
      }
    }
    fetchDrivers();
  }, []);

  const fetchMapData = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `${API_ENDPOINTS.ORDERS.MAP}?date=${selectedDate}`;
      if (selectedDriverId !== 'all') {
        url += `&driverId=${selectedDriverId}`;
      }
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('Không thể tải dữ liệu bản đồ');
      }
      const json = await res.json();
      const data = json?.data !== undefined ? json.data : json;
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi tải bản đồ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMapData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedDriverId]);

  const ordersWithGps = orders.filter((o) => o.deliveryGps !== null);
  const center: [number, number] = ordersWithGps.length > 0
    ? [
        ordersWithGps.reduce((sum, o) => sum + (o.deliveryGps?.lat || 0), 0) / ordersWithGps.length,
        ordersWithGps.reduce((sum, o) => sum + (o.deliveryGps?.lng || 0), 0) / ordersWithGps.length,
      ]
    : [10.8231, 106.6297]; // Default to Ho Chi Minh City

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#c2c6d3] pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#111c2d]">Bản Đồ Giao Hàng & GPS</h1>
            <p className="text-xs text-[#424751] mt-1">
              {orders.length} đơn hàng hôm nay • {ordersWithGps.length} đơn có định vị GPS
            </p>
          </div>
          <button
            onClick={fetchMapData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 border border-[#c2c6d3] bg-white hover:bg-[#dee8ff] text-[#00346f] font-bold text-xs rounded transition-all shadow-sm"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            LÀM MỚI
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6 bg-white p-3 rounded border border-[#c2c6d3] shadow-2xs">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#737783]" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 bg-[#f9f9ff] border border-[#c2c6d3] rounded text-xs text-[#111c2d] focus:border-[#004a99] outline-none"
            />
          </div>

          <select
            value={selectedDriverId}
            onChange={(e) => setSelectedDriverId(e.target.value)}
            className="px-3 py-1.5 bg-[#f9f9ff] border border-[#c2c6d3] rounded text-xs text-[#111c2d] focus:border-[#004a99] outline-none"
          >
            <option value="all">Tất cả tài xế</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          <div className="ml-auto flex items-center gap-4 text-xs font-medium text-[#424751]">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#f59e0b] border border-white shadow-2xs"></span>
              <span>Đang giao</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#10b981] border border-white shadow-2xs"></span>
              <span>Đã giao</span>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="rounded border border-[#c2c6d3] bg-white overflow-hidden shadow-sm">
          <div className="h-[calc(100vh-280px)] min-h-[500px]">
            {loading && orders.length === 0 ? (
              <div className="h-full flex items-center justify-center bg-[#f9f9ff]">
                <Loader2 className="h-8 w-8 animate-spin text-[#004a99]" />
              </div>
            ) : error ? (
              <div className="h-full flex items-center justify-center bg-[#f9f9ff]">
                <div className="text-xs font-bold text-[#ba1a1a]">Lỗi: {error}</div>
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
              />
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}