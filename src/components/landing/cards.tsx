import React from 'react';

export function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="data-lg text-3xl font-black text-primary-accent">{value}</div>
      <div className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mt-1">{label}</div>
    </div>
  );
}

export function PainCard({ icon, title, desc, delay }: { icon: React.ReactNode; title: string; desc: string; delay: number }) {
  return (
    <div
      className="group relative p-6 bg-card border border-outline-variant rounded-2xl hover:border-[#ba1a1a]/40 hover:bg-card transition-all duration-300 hover:-translate-y-1 shadow-sm"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="w-12 h-12 bg-error-container rounded-xl flex items-center justify-center text-error mb-4 group-hover:scale-110 transition-transform duration-300 shadow-2xs">
        {icon}
      </div>
      <h3 className="text-base font-bold text-on-surface mb-2">{title}</h3>
      <p className="text-xs text-on-surface-variant leading-relaxed">{desc}</p>
    </div>
  );
}

export function LocalCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="group p-6 bg-card border border-outline-variant rounded-2xl hover:border-[#004a99] hover:bg-container-low transition-all duration-300 shadow-sm">
      <div className="w-12 h-12 bg-container-high rounded-xl flex items-center justify-center text-primary-accent mb-4 group-hover:scale-110 transition-transform duration-300 shadow-2xs">
        {icon}
      </div>
      <h4 className="text-base font-bold text-on-surface mb-2">{title}</h4>
      <p className="text-xs text-on-surface-variant leading-relaxed">{desc}</p>
    </div>
  );
}
