export default function ScheduleLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 pl-64">
      <div className="p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="mb-3 h-5 w-32 animate-pulse rounded bg-white/10" />
            <div className="h-9 w-56 animate-pulse rounded bg-white/10" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-10 animate-pulse rounded-lg bg-white/10" />
            <div className="h-10 w-24 animate-pulse rounded-lg bg-white/10" />
            <div className="h-10 w-10 animate-pulse rounded-lg bg-white/10" />
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
          <div className="grid min-w-[760px] grid-cols-8">
            {Array.from({ length: 32 }).map((_, index) => (
              <div key={index} className="min-h-14 border-r border-t border-white/10 p-3">
                <div className="h-4 animate-pulse rounded bg-white/10" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
