'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Global Layout Error]:', error);
  }, [error]);

  return (
    <html lang="vi">
      <body className="min-h-screen bg-surface text-on-surface flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md rounded border border-outline-variant bg-card p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded bg-error-container text-error">
            <AlertCircle className="h-7 w-7 text-error" />
          </div>
          <h1 className="text-xl font-bold text-on-surface">Lỗi Hệ Thống Toàn Cục</h1>
          <p className="mt-2 text-xs text-faint">
            Ứng dụng gặp sự cố cấp khung giao diện. Vui lòng bấm làm mới ứng dụng.
          </p>
          <button
            onClick={() => reset()}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded bg-[#004a99] hover:bg-[#00346f] px-5 py-2.5 text-xs font-bold text-white transition-colors shadow-sm"
          >
            <RefreshCw className="h-4 w-4" />
            Làm mới ứng dụng
          </button>
        </div>
      </body>
    </html>
  );
}
