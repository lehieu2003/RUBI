'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon issue in Next.js
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Create custom colored marker icons
function createColoredIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background-color: ${color};
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
}

const shippingIcon = createColoredIcon('#f59e0b'); // amber
const deliveredIcon = createColoredIcon('#22c55e'); // emerald

interface OrderForMap {
  id: string;
  status: 'SHIPPING' | 'DELIVERED';
  customer: { name: string; address: string };
  deliveryGps: { lat: number; lng: number } | null;
}

interface MapInnerProps {
  orders: OrderForMap[];
  center: [number, number];
  onMarkerClick: (id: string) => void;
}

// Component to handle map events
function MapEvents({ onMarkerClick }: { onMarkerClick: (id: string) => void }) {
  const map = useMap();

  useEffect(() => {
    // Fix Leaflet map not rendering properly
    setTimeout(() => {
      map.invalidateSize();
    }, 100);
  }, [map]);

  return null;
}

export default function MapInner({ orders, center, onMarkerClick }: MapInnerProps) {
  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
      className="z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapEvents onMarkerClick={onMarkerClick} />
      {orders.map((order) => {
        if (!order.deliveryGps) return null;
        const icon = order.status === 'SHIPPING' ? shippingIcon : deliveredIcon;
        return (
          <Marker
            key={order.id}
            position={[order.deliveryGps.lat, order.deliveryGps.lng]}
            icon={icon}
            eventHandlers={{
              click: () => onMarkerClick(order.id),
            }}
          >
            <Popup>
              <div className="text-center">
                <strong className="text-base">{order.customer.name}</strong>
                <p className="text-sm text-faint">{order.customer.address}</p>
                <span
                  className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${
                    order.status === 'SHIPPING'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-emerald-100 text-secondary'
                  }`}
                >
                  {order.status === 'SHIPPING' ? 'Chờ giao' : 'Đã giao'}
                </span>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}