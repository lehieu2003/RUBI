'use client';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-gradient-to-r from-blue-600/20 to-violet-600/20 rounded-full blur-[120px] animate-[pulse_8s_ease-in-out_infinite]" />
        <div className="absolute bottom-1/3 right-1/4 w-[350px] h-[350px] bg-gradient-to-r from-violet-500/15 to-purple-500/15 rounded-full blur-[100px] animate-[pulse_10s_ease-in-out_infinite]" style={{ animationDelay: '2s' }} />
      </div>

      {/* Grid overlay */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-violet-600 rounded-xl flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 2v20M2 12h20" />
                <circle cx="12" cy="12" r="4" />
              </svg>
            </div>
            <span className="text-2xl font-extrabold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">IceFlow</span>
          </div>
        </div>
        {children}
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}
