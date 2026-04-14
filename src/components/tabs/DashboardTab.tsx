import type { RefObject } from "react";
import { RefreshCw, Share2, TrendingUp, Users } from "lucide-react";
import NumberInput from "../ui/NumberInput";
import type { AppData, Store, Staff, DailyData, UpdateDataFn } from "../../types";
import { formatDate } from "../../utils/date";
import { calcDailyCost, calcMinutes } from "../../utils/calc";

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

  // ── 売上 ──────────────────────────────────────────────────────
  const achieveRate    = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;
  const forecastRate   = totalBudget > 0 ? (forecast    / totalBudget) * 100 : 0;

  // ── 人件費 ────────────────────────────────────────────────────
  // ① 実績累計：salesActual がある日だけ
  const actualCost = monthDailyData.reduce((sum, day) => {
    if ((day.salesActual ?? 0) <= 0) return sum;
    return sum + day.shifts.reduce((s, sh) => {
      const staff = currentStaff.find((st) => st.id === sh.staffId);
      return s + (staff ? calcDailyCost(sh, staff, offDays, day.date) : 0);
    }, 0);
  }, 0);
  const actualCostRate = totalActual > 0 ? (actualCost / totalActual) * 100 : 0;

  // ② 着地予測
  const forecastedLaborCost = totalCost;
  const budgetLaborCost     = totalBudget * (targetRatio / 100);
  const laborDiff           = forecastedLaborCost - budgetLaborCost;
  const laborDiffRate       = totalBudget > 0 ? (laborDiff / totalBudget) * 100 : 0;

  // 実績労働時間（差分の時間換算用）
  const actualWorkedMins = monthDailyData.reduce((sum, day) => {
    if ((day.salesActual ?? 0) <= 0) return sum;
    return sum + day.shifts.reduce((s, sh) => {
      if (!sh.inTime) return s;
      const staff = currentStaff.find((st) => st.id === sh.staffId);
      if (!staff) return s;
      return s + Math.max(0, calcMinutes(sh.inTime, sh.outTime) - (sh.breakMinutes ?? 0));
    }, 0);
  }, 0);
  const actualWorkedHours = actualWorkedMins / 60;
  const avgHourlyCost     = actualWorkedHours > 0 ? actualCost / actualWorkedHours : 0;
  const laborDiffHours    = avgHourlyCost > 0 ? Math.abs(laborDiff) / avgHourlyCost : 0;

  // ③ 人時売上高
  const laborProductivity = actualWorkedHours > 0 ? totalActual / actualWorkedHours : 0;

  // 日次テーブル 2列分割
  const half      = Math.ceil(monthDailyData.length / 2);
  const leftDays  = monthDailyData.slice(0, half);
  const rightDays = monthDailyData.slice(half);

  // ── 共通 Row ────────────────────────────────────────────────
  const KpiRow = ({
    num, label, main, sub, accent,
  }: {
    num?: string; label: string; main: string; sub?: string; accent?: "good" | "over";
  }) => (
    <div className="flex items-baseline justify-between py-[3px]">
      <span className="text-[10px] text-slate-400 font-medium shrink-0">
        {num && <span className="font-black text-slate-500 mr-0.5">{num}</span>}
        {label}
      </span>
      <span className={`text-xs font-black ml-2 ${accent === "good" ? "text-emerald-600" : accent === "over" ? "text-rose-600" : "text-slate-900"}`}>
        {main}
        {sub && <span className="text-[9px] font-medium text-slate-400 ml-1">{sub}</span>}
      </span>
    </div>
  );

  const DayRow = ({ day }: { day: DailyData }) => {
    const dayCost = day.shifts.reduce((s, sh) => {
      const staff = currentStaff.find((st) => st.id === sh.staffId);
      return s + (staff ? calcDailyCost(sh, staff, offDays, day.date) : 0);
    }, 0);
    const ratio = day.salesActual > 0 ? (dayCost / day.salesActual) * 100 : 0;
    const over  = ratio > targetRatio;
    return (
      <tr className="border-b border-slate-100 hover:bg-amber-50/30 transition-colors">
        <td className="px-2 py-1 font-bold text-slate-600 whitespace-nowrap text-xs">{formatDate(day.date)}</td>
        <td className="px-2 py-1">
          <NumberInput
            className="bg-white border border-slate-200 rounded px-2 py-0.5 text-xs text-slate-900 w-24 text-right font-mono outline-none focus:border-amber-500"
            value={day.salesBudget}
            onChange={(val) => updateData((d) => ({ ...d, dailyDataRecord: { ...d.dailyDataRecord, [day.date]: { ...d.dailyDataRecord[day.date], salesBudget: val } } }))}
          />
        </td>
        <td className="px-2 py-1">
          <NumberInput
            className="bg-amber-50 border border-amber-100 rounded px-2 py-0.5 text-xs text-slate-900 w-24 text-right font-mono outline-none focus:border-amber-500"
            value={day.salesActual}
            onChange={(val) => updateData((d) => ({ ...d, dailyDataRecord: { ...d.dailyDataRecord, [day.date]: { ...d.dailyDataRecord[day.date], salesActual: val } } }))}
          />
        </td>
        <td className={`px-2 py-1 text-right font-black text-xs ${ratio > 0 ? (over ? "text-rose-600" : "text-emerald-600") : "text-slate-300"}`}>
          {ratio > 0 ? ratio.toFixed(1) + "%" : "—"}
        </td>
        <td className="px-2 py-1 text-center">
          {ratio > 0 && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${over ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"}`}>
              {over ? "超過" : "良好"}
            </span>
          )}
        </td>
      </tr>
    );
  };

  const TableHead = () => (
    <thead className="sticky top-0 z-10">
      <tr className="bg-slate-50 border-b border-slate-200">
        {["日付", "売上予算", "売上実績", "人件費率", "状態"].map((h) => (
          <th key={h} className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
        ))}
      </tr>
    </thead>
  );

  return (
    <div
      className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col gap-2"
      style={{ height: "calc(100dvh - 2rem)" }}
      ref={dashboardRef}
    >
      {/* ヘッダー */}
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-base font-black text-slate-900 tracking-tight leading-tight">
            {data.year}年{data.month}月 — {currentStore?.name}
          </h1>
          <p className="text-[11px] text-slate-400">ダッシュボード</p>
        </div>
        <button
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-xs font-bold shadow transition-all pdf-hide ${
            isExporting ? "bg-slate-300 cursor-not-allowed" : "bg-amber-500 hover:bg-amber-600"
          }`}
          onClick={exportDashboardToPDF}
          disabled={isExporting}
        >
          {isExporting
            ? <><RefreshCw size={13} className="animate-spin" /> 出力中...</>
            : <><Share2 size={13} /> PDF出力</>}
        </button>
      </div>

      {/* KPI 2ブロック */}
      <div className="grid grid-cols-2 gap-3 shrink-0">

        {/* 売上 */}
        <div className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 shadow-sm" style={{ borderLeft: "3px solid #3b82f6" }}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <TrendingUp size={12} className="text-blue-500" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">売上</span>
          </div>
          <KpiRow label="実績売上"  main={`¥${totalActual.toLocaleString()}`} />
          <KpiRow label="着地予測"  main={`¥${Math.round(forecast).toLocaleString()}`}   sub={forecastRate > 0 ? `予算比 ${forecastRate.toFixed(1)}%` : undefined} />
          <KpiRow label="予算"      main={`¥${totalBudget.toLocaleString()}`}             sub={achieveRate > 0  ? `達成率 ${achieveRate.toFixed(1)}%`   : undefined} accent={achieveRate >= 100 ? "good" : undefined} />
          <div className="mt-2 h-0.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 transition-all duration-700" style={{ width: `${Math.min(100, achieveRate)}%` }} />
          </div>
        </div>

        {/* 人件費 */}
        <div
          className={`border rounded-xl px-3.5 py-2.5 shadow-sm ${forecastRatio > targetRatio ? "bg-rose-50 border-rose-200" : "bg-white border-slate-200"}`}
          style={{ borderLeft: `3px solid ${forecastRatio > targetRatio ? "#e11d48" : "#f59e0b"}` }}
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <Users size={12} className={forecastRatio > targetRatio ? "text-rose-500" : "text-amber-500"} />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">人件費</span>
            <span className="ml-auto text-[9px] text-slate-400 font-medium">目標 {targetRatio}%</span>
          </div>

          {/* ① 実績累計 */}
          <KpiRow
            num="①" label="実績累計"
            main={`¥${Math.round(actualCost).toLocaleString()}`}
            sub={actualCostRate > 0 ? `実績比 ${actualCostRate.toFixed(1)}%` : undefined}
          />

          {/* ② 着地予測 */}
          <KpiRow
            num="②" label="着地予測"
            main={`¥${Math.round(forecastedLaborCost).toLocaleString()}`}
            sub={forecastRatio > 0 ? `予測売上比 ${forecastRatio.toFixed(1)}%` : undefined}
            accent={forecastRatio > targetRatio ? "over" : undefined}
          />
          {budgetLaborCost > 0 && (
            <div className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded my-0.5 ${
              laborDiff > 0 ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
            }`}>
              <span>{laborDiff > 0 ? "▲ 予算超過" : "▼ 予算良好"}</span>
              <span className="font-black">
                ¥{Math.abs(Math.round(laborDiff)).toLocaleString()}
                {laborDiffHours > 0.1 && ` / ${laborDiffHours.toFixed(1)}h`}
                {` / ${Math.abs(laborDiffRate).toFixed(1)}%`}
              </span>
            </div>
          )}

          {/* ③ 人時売上高 */}
          <KpiRow
            num="③" label="人時売上高"
            main={laborProductivity > 0 ? `¥${Math.round(laborProductivity).toLocaleString()} / h` : "—"}
            sub={actualWorkedHours > 0.1 ? `(${actualWorkedHours.toFixed(1)}h稼働)` : undefined}
          />
        </div>
      </div>

      {/* 日次テーブル（残スペースを全部使う） */}
      <div className="flex-1 min-h-0 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col shadow-sm">
        <div className="px-4 py-1.5 border-b border-slate-200 bg-slate-50 shrink-0">
          <span className="font-bold text-xs text-slate-700">日次売上・人件費シミュレーション</span>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="grid grid-cols-2 divide-x divide-slate-100">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <TableHead />
                <tbody>{leftDays.map((day) => <DayRow key={day.date} day={day} />)}</tbody>
              </table>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <TableHead />
                <tbody>{rightDays.map((day) => <DayRow key={day.date} day={day} />)}</tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
