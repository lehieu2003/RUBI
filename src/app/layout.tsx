import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth-provider';
import { ToastProvider } from '@/components/dashboard/toast';
import { QueryProvider } from '@/lib/query-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'IceFlow SaaS - Quản lý lò đá tốc độ cao',
  description: 'Hệ thống quản lý đơn hàng, kho lạnh & công nợ chuyên dụng cho xưởng sản xuất đá',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#f9f9ff] text-[#111c2d] antialiased">
        <QueryProvider>
          <AuthProvider>
            <ToastProvider>{children}</ToastProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}