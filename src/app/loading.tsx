import { Snowflake } from 'lucide-react';

export default function RootLoading() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-8">
      <div className="flex flex-col items-center gap-3">
        <div className="relative flex h-12 w-12 items-center justify-center rounded bg-[#dee8ff] text-[#004a99] shadow-xs">
          <Snowflake className="h-6 w-6 text-[#004a99] animate-spin" />
        </div>
        <p className="text-xs font-bold text-[#004a99] tracking-wider uppercase font-mono animate-pulse">
          Đang tải dữ liệu IceFlow...
        </p>
      </div>
    </div>
  );
}
