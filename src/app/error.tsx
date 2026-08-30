'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to monitoring service if needed
    console.error('[Application Error Caught by Next.js ErrorBoundary]:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#f9f9ff] text-[#111c2d] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg rounded border border-[#ba1a1a]/30 bg-white p-8 text-center shadow-lg">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded bg-[#ffdad6] text-[#ba1a1a]">
          <AlertTriangle className="h-7 w-7 text-[#ba1a1a]" />
        </div>

        <h1 className="text-xl font-bold text-[#93000a]">Đã xảy ra lỗi không mong muốn</h1>
        <p className="mt-2 text-xs text-[#737783] leading-relaxed">
          Hệ thống gặp sự cố trong quá trình xử lý yêu cầu. Dữ liệu của bạn không bị mất.
        </p>

        {error.message && (
          <div className="mt-4 rounded bg-[#f9f9ff] border border-[#e7eeff] p-3 text-left">
            <p className="text-[11px] font-mono font-bold text-[#ba1a1a] break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-[10px] font-mono text-[#737783] mt-1">
                Mã định danh lỗi (Digest): {error.digest}
              </p>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded bg-[#004a99] hover:bg-[#00346f] px-5 py-2.5 text-xs font-bold text-white transition-colors shadow-sm"
          >
            <RefreshCw className="h-4 w-4" />
            Thử tải lại (Retry)
          </button>
          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded border border-[#c2c6d3] bg-white hover:bg-[#f0f3ff] px-5 py-2.5 text-xs font-bold text-[#424751] transition-colors"
          >
            <Home className="h-4 w-4" />
            Về trang Tổng quan
          </Link>
        </div>
      </div>
    </div>
  );
}
