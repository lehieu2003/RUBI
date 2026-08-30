import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth-provider';
import { ToastProvider } from '@/components/dashboard/toast';
import { QueryProvider } from '@/lib/query-provider';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'IceFlow SaaS — Quản Lý Xưởng Sản Xuất Đá Tốc Độ Cao',
    template: '%s | IceFlow SaaS',
  },
  description: 'Hệ thống số hóa đơn hàng, in phiếu K80, kho lạnh, phân ca xe & đối soát công nợ chuyên dụng cho xưởng đá 50-100 đơn/ngày.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
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