import type { RefObject } from "react";
import { RefreshCw, Share2 } from "lucide-react";
import KPICard from "../ui/KPICard";
import NumberInput from "../ui/NumberInput";
import type { AppData, Store, Staff, DailyData, UpdateDataFn } from "../../types";
import { formatDate } from "../../utils/date";
import { calcDailyCost } from "../../utils/calc";

interface DashboardTabProps {
  data: AppData;
  currentStore: Store | undefined;
  currentStaff: Staff[];
  monthDailyData: DailyData[];
  offDays: number;
  targetRatio: number;
  totalActual: number;
  totalBudget: number;
  totalCost: number;
  forecast: number;
  forecastRatio: number;
  updateData: UpdateDataFn;
  isExporting: boolean;
  exportDashboardToPDF: () => void;
  dashboardRef: RefObject<HTMLDivElement | null>;
}

export default function DashboardTab({
  data, currentStore, currentStaff, monthDailyData, offDays, targetRatio,
  totalActual, totalBudget, totalCost, forecast, forecastRatio,
  updateData, isExporting, exportDashboardToPDF, dashboardRef,
}: DashboardTabProps) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300" ref={dashboardRef}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          {data.year}年{data.month}月：{currentStore?.name}ーダッシュボード
        </h1>
        <button
          className={`flex items-center gap-2 px-5 py-2 rounded-xl text-white text-sm font-bold shadow-lg transition-all pdf-hide ${
            isExporting ? "bg-slate-400 cursor-not-allowed" : "bg-blue-600 shadow-blue-500/20 hover:bg-blue-500"
          }`}
          onClick={exportDashboardToPDF}
          disabled={isExporting}
        >
          {isExporting ? (
            <><RefreshCw size={16} className="animate-spin" /> 出力中...</>
          ) : (
            <><Share2 size={16} /> PDF出力</>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <KPICard label="売上実績" value={`¥${totalActual.toLocaleString()}`} sub={`予算合計: ¥${totalBudget.toLocaleString()} / 達成率 ${totalBudget > 0 ? ((totalActual / totalBudget) * 100).toFixed(1) : 0}%`} color="#3b82f6" progress={totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0} />
        <KPICard label="月間予測着地" value={`¥${Math.round(forecast).toLocaleString()}`} sub={`予算比 ${totalBudget > 0 ? ((forecast / totalBudget) * 100).toFixed(1) : 0}%`} color="#6366f1" accent />
        <KPICard label="予測着地での人件費率" value={`${forecastRatio.toFixed(1)}%`} sub={`目標 ${targetRatio}% / 差 ${(forecastRatio - targetRatio).toFixed(1)}%`} color={forecastRatio > targetRatio ? "#ef4444" : "#22c55e"} warn={forecastRatio > targetRatio} />
        <KPICard label="人件費累計" value={`¥${Math.round(totalCost).toLocaleString()}`} sub={`公休設定 ${offDays}日/月`} color="#f59e0b" />
        <KPICard label="人件費率（予算比）" value={`${totalBudget > 0 ? ((totalCost / totalBudget) * 100).toFixed(1) : 0}%`} sub="月間売上予算に対する比率" color="#64748b" />
        <KPICard label="人件費率（実績比）" value={`${totalActual > 0 ? ((totalCost / totalActual) * 100).toFixed(1) : 0}%`} sub="現在までの実績に対する効率" color="#64748b" />
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
          <span className="font-bold text-sm text-slate-900">日次売上・人件費シミュレーション</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50">
                {["日付", "売上予算", "売上実績", "想定人件費率", "状態"].map((h) => (
                  <th key={h} className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthDailyData.map((day) => {
                const dayCost = day.shifts.reduce((s, sh) => {
                  const staff = currentStaff.find((st) => st.id === sh.staffId);
                  return s + (staff ? calcDailyCost(sh, staff, offDays, day.date) : 0);
                }, 0);
                const ratio = day.salesActual > 0 ? (dayCost / day.salesActual) * 100 : 0;
                const over = ratio > targetRatio;
                return (
                  <tr key={day.date} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-500">{formatDate(day.date)}</td>
                    <td className="px-6 py-4">
                      <NumberInput
                        className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-900 text-sm w-full text-right font-mono outline-none focus:border-blue-500/50 transition-all"
                        value={day.salesBudget}
                        onChange={(val) => updateData((d) => ({ ...d, dailyDataRecord: { ...d.dailyDataRecord, [day.date]: { ...d.dailyDataRecord[day.date], salesBudget: val } } }))}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <NumberInput
                        className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5 text-slate-900 text-sm w-full text-right font-mono outline-none focus:border-blue-500/50 transition-all"
                        value={day.salesActual}
                        onChange={(val) => updateData((d) => ({ ...d, dailyDataRecord: { ...d.dailyDataRecord, [day.date]: { ...d.dailyDataRecord[day.date], salesActual: val } } }))}
                      />
                    </td>
                    <td className={`px-6 py-4 text-right font-black ${ratio > 0 ? (over ? "text-rose-600" : "text-emerald-600") : "text-slate-400"}`}>
                      {ratio > 0 ? ratio.toFixed(1) + "%" : "—"}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {ratio > 0 && (
                        <span className={`text-[10px] font-bold px-3 py-1 rounded-full border ${over ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"}`}>
                          {over ? "予算超過" : "良好"}
                        </span>
                      )}
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
