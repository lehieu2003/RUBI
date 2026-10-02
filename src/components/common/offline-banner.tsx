'use client';

import { useSyncExternalStore } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

function subscribe(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getSnapshot() {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

function getServerSnapshot() {
  return true;
}

export function OfflineBanner() {
  const isOnline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (isOnline) return null;

  return (
    <div className="sticky top-0 z-50 flex items-center justify-between bg-[#ba1a1a] px-4 py-2 text-white shadow-md">
      <div className="flex items-center gap-2 text-xs font-bold">
        <WifiOff className="h-4 w-4 animate-pulse" />
        <span>MẤT KẾT NỐI INTERNET — Hệ thống đang ở chế độ ngoại tuyến. Vui lòng kiểm tra lại đường truyền mạng!</span>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="inline-flex items-center gap-1.5 rounded bg-card/20 hover:bg-card/30 px-2.5 py-1 text-xs font-bold transition-colors"
      >
        <RefreshCw className="h-3 w-3" />
        Thử lại
      </button>
    </div>
  );
}
