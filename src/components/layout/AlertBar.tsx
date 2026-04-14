import { AlertTriangle } from "lucide-react";
import type { Alert } from "../../types";

interface AlertBarProps {
  alerts: Alert[];
}

export default function AlertBar({ alerts }: AlertBarProps) {
  if (alerts.length === 0) return null;
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-rose-50 border border-rose-200 rounded-lg mb-3 flex-wrap shadow-sm">
      <AlertTriangle size={13} className="text-rose-500 shrink-0" />
      <span className="font-bold text-xs text-rose-600">労務アラート {alerts.length}件</span>
      {alerts.slice(0, 3).map((a, i) => (
        <span
          key={i}
          className="text-[11px] text-rose-600 bg-white px-2 py-0.5 rounded border border-rose-100 font-medium"
        >
          [{a.name}] {a.msg}
        </span>
      ))}
    </div>
  );
}
