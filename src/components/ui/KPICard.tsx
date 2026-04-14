interface KPICardProps {
  label: string;
  value: string;
  sub: string;
  color: string;
  accent?: boolean;
  warn?: boolean;
  progress?: number;
}

export default function KPICard({ label, value, sub, color, accent, warn, progress }: KPICardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl p-3.5 border transition-all ${
        warn
          ? "bg-rose-50 border-rose-200"
          : accent
          ? "bg-white border-slate-200"
          : "bg-white border-slate-200"
      }`}
      style={accent ? { borderLeft: `3px solid ${color}` } : {}}
    >
      <div className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-1">{label}</div>
      <div
        className="text-xl font-black tracking-tight leading-tight mb-0.5"
        style={{ color: warn ? "#e11d48" : accent ? color : "#1c1917" }}
      >
        {value}
      </div>
      <div className="text-[11px] text-slate-500 leading-tight">{sub}</div>
      {progress !== undefined && (
        <div className="mt-2 h-0.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-700"
            style={{ background: color, width: `${Math.min(100, progress)}%` }}
          />
        </div>
      )}
    </div>
  );
}
