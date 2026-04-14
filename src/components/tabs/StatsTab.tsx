import type { AppData, Staff, DailyData } from "../../types";
import { calcMinutes, calcMidnightMinutes, calcDailyCost } from "../../utils/calc";

interface StatsTabProps {
  data: AppData;
  currentStaff: Staff[];
  monthDailyData: DailyData[];
  offDays: number;
}

export default function StatsTab({ data, currentStaff, monthDailyData, offDays }: StatsTabProps) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <h1 className="text-base font-black text-slate-900 mb-3 tracking-tight">
        {data.year}年{data.month}月 — 労働集計
      </h1>
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50">
          <span className="font-bold text-xs text-slate-700">月間スタッフ別集計</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {["スタッフ", "種別", "出勤日数", "実働時間", "残業時間", "深夜労働", "概算支給額"].map((h) => (
                  <th key={h} className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentStaff.map((staff) => {
                let workDays = 0, totalNet = 0, totalMidnight = 0, totalCostS = 0;
                monthDailyData.forEach((day) => {
                  const sh = day.shifts.find((s) => s.staffId === staff.id);
                  if (sh?.inTime) {
                    workDays++;
                    const net = Math.max(0, calcMinutes(sh.inTime, sh.outTime) - (sh.breakMinutes || 0));
                    totalNet += net;
                    totalMidnight += calcMidnightMinutes(sh.inTime, sh.outTime);
                    totalCostS += calcDailyCost(sh, staff, offDays, day.date);
                  }
                });
                const otMins = staff.type === "社員"
                  ? Math.max(0, totalNet - 173 * 60)
                  : Math.max(0, totalNet - 40 * 4 * 60);
                return (
                  <tr key={staff.id} className="border-b border-slate-100 hover:bg-amber-50/20 transition-colors">
                    <td className="px-3 py-2 font-bold text-slate-900 text-xs">
                      {staff.name}
                      {staff.isHelp && (
                        <span className="ml-1.5 text-[9px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded font-black border border-amber-100">HELP</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        staff.type === "社員"
                          ? "bg-blue-50 text-blue-600 border-blue-100"
                          : "bg-slate-50 text-slate-500 border-slate-200"
                      }`}>
                        {staff.type}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-500 text-xs">{workDays}日</td>
                    <td className="px-3 py-2 text-right font-mono text-slate-500 text-xs">
                      {Math.floor(totalNet / 60)}h{totalNet % 60}m
                    </td>
                    <td className={`px-3 py-2 text-right font-mono text-xs ${otMins > 0 ? "text-rose-600 font-bold" : "text-slate-300"}`}>
                      {otMins > 0 ? `${Math.floor(otMins / 60)}h${otMins % 60}m` : "—"}
                      {staff.type === "社員" && otMins > 0 && (
                        <div className="text-[9px] text-slate-400">見込含</div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs text-amber-600">
                      {totalMidnight > 0 ? `${(totalMidnight / 60).toFixed(1)}h` : "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-black text-slate-900 text-xs whitespace-nowrap">
                      ¥{Math.round(totalCostS).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
