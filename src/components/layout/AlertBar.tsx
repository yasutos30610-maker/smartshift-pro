import { AlertTriangle } from "lucide-react";
import type { Alert } from "../../types";

interface AlertBarProps {
  alerts: Alert[];
}

export default function AlertBar({ alerts }: AlertBarProps) {
  if (alerts.length === 0) return null;
  return (
    <div className="flex items-center gap-3 p-3 bg-white border border-rose-200 rounded-xl mb-6 flex-wrap shadow-sm">
      <AlertTriangle size={16} className="text-rose-600" />
      <span className="font-bold text-xs text-rose-600">労務アラート {alerts.length}件</span>
      {alerts.slice(0, 3).map((a, i) => (
        <span
          key={i}
          className="text-[11px] text-rose-600 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-100 font-medium"
        >
          [{a.name}] {a.msg}
        </span>
      ))}
    </div>
  );
}
