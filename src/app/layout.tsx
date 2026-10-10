import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth-provider';
import { ThemeProvider } from '@/lib/theme';
import { ToastProvider } from '@/components/dashboard/toast';
import { QueryProvider } from '@/lib/query-provider';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Nhà máy đá tinh khiết Rubi — Quản Lý Đơn Hàng & Kho',
    template: '%s | Nhà máy đá tinh khiết Rubi',
  },
  description: 'Hệ thống quản lý đơn hàng, in phiếu K80, kho lạnh, phân ca xe & đối soát công nợ của Nhà máy đá tinh khiết Rubi.',
};

// Applies the stored theme before first paint to avoid a light-flash.
const themeInitScript = `(function(){try{var t=localStorage.getItem('iceflow-theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){}})()`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-surface text-on-surface antialiased">
        <ThemeProvider>
          <QueryProvider>
            <AuthProvider>
              <ToastProvider>{children}</ToastProvider>
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}