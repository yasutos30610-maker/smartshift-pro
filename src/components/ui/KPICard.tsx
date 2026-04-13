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
      className={`relative overflow-hidden rounded-2xl p-6 border transition-all duration-300 ${
        accent ? "bg-white border-slate-200" : warn ? "bg-rose-50 border-rose-200" : "bg-white border-slate-200"
      }`}
      style={accent ? { borderLeft: `4px solid ${color}` } : {}}
    >
      {accent && (
        <div
          className="absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-10"
          style={{ background: color }}
        />
      )}
      <div className="text-[11px] font-black text-slate-400 tracking-[0.2em] uppercase mb-2">{label}</div>
      <div
        className="text-3xl font-black tracking-tight mb-1"
        style={{ color: accent ? color : warn ? "#e11d48" : "#0f172a" }}
      >
        {value}
      </div>
      <div className="text-xs text-slate-500 font-medium">{sub}</div>
      {progress !== undefined && (
        <div className="mt-4 h-1 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-1000 ease-out"
            style={{ background: color, width: `${Math.min(100, progress)}%` }}
          />
        </div>
      )}
    </div>
  );
}
