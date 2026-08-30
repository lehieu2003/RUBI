'use client';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f9f9ff] flex items-center justify-center px-4 relative">
      <div className="relative w-full max-w-md">
        {children}
      </div>
    </div>
  );
}

