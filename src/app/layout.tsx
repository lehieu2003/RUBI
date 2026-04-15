import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'IceFlow SaaS',
  description: 'Quản lý đơn hàng nhanh hơn bút giấy',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}