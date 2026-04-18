'use client';
import { useEffect, useState } from 'react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [impersonating, setImpersonating] = useState<string | null>(null);

  useEffect(() => {
    // Check URL param for active impersonation
    const params = new URLSearchParams(window.location.search);
    const factoryName = params.get('impersonating');
    if (factoryName) setImpersonating(factoryName);
  }, []);

  const handleEndImpersonation = async () => {
    await fetch('/api/admin/impersonate/end', { method: 'POST' });
    setImpersonating(null);
    window.location.href = '/admin/dashboard';
  };

  return (
    <>
      {impersonating && (
        <div className="fixed top-4 right-4 z-50 bg-violet-500/90 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
          Đang xem với tư cách: {impersonating}
          <button
            onClick={handleEndImpersonation}
            className="ml-3 underline hover:no-underline"
          >
            Kết thúc
          </button>
        </div>
      )}
      {children}
    </>
  );
}
