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

  // ── 売上 計算 ───────────────────────────────────────────────
  const achieveRate = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;

  // ── 人件費 計算 ─────────────────────────────────────────────
  // ① 実績累計：salesActual がある日の実コスト
  const actualCost = monthDailyData.reduce((sum, day) => {
    if ((day.salesActual ?? 0) <= 0) return sum;
    return sum + day.shifts.reduce((s, sh) => {
      const staff = currentStaff.find((st) => st.id === sh.staffId);
      return s + (staff ? calcDailyCost(sh, staff, offDays, day.date) : 0);
    }, 0);
  }, 0);
  const actualCostRate = totalActual > 0 ? (actualCost / totalActual) * 100 : 0;

  // ② 着地予測：全シフト計画コスト vs 予算人件費
  const forecastedLaborCost = totalCost;           // 月の全スケジュールコスト
  const budgetLaborCost = totalBudget * (targetRatio / 100);
  const laborDiff = forecastedLaborCost - budgetLaborCost; // + 超過 / − 良好

  // 差分を時間換算（実績日の平均時給を使用）
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
  const avgHourlyCost = actualWorkedHours > 0 ? actualCost / actualWorkedHours : 0;
  const laborDiffHours = avgHourlyCost > 0 ? Math.abs(laborDiff) / avgHourlyCost : 0;
  const laborDiffRate = totalBudget > 0 ? (laborDiff / totalBudget) * 100 : 0;

  // ③ 人時売上高
  const laborProductivity = actualWorkedHours > 0 ? totalActual / actualWorkedHours : 0;

  // 日次テーブル 2列分割
  const half = Math.ceil(monthDailyData.length / 2);
  const leftDays  = monthDailyData.slice(0, half);
  const rightDays = monthDailyData.slice(half);

  const DayRow = ({ day }: { day: DailyData }) => {
    const dayCost = day.shifts.reduce((s, sh) => {
      const staff = currentStaff.find((st) => st.id === sh.staffId);
      return s + (staff ? calcDailyCost(sh, staff, offDays, day.date) : 0);
    }, 0);
    const ratio = day.salesActual > 0 ? (dayCost / day.salesActual) * 100 : 0;
    const over  = ratio > targetRatio;
    return (
      <tr className="border-b border-slate-100 hover:bg-amber-50/30 transition-colors">
        <td className="px-2 py-1.5 font-bold text-slate-600 whitespace-nowrap text-xs">{formatDate(day.date)}</td>
        <td className="px-2 py-1.5">
          <NumberInput
            className="bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-900 w-24 text-right font-mono outline-none focus:border-amber-500"
            value={day.salesBudget}
            onChange={(val) => updateData((d) => ({ ...d, dailyDataRecord: { ...d.dailyDataRecord, [day.date]: { ...d.dailyDataRecord[day.date], salesBudget: val } } }))}
          />
        </td>
        <td className="px-2 py-1.5">
          <NumberInput
            className="bg-amber-50 border border-amber-100 rounded px-2 py-1 text-xs text-slate-900 w-24 text-right font-mono outline-none focus:border-amber-500"
            value={day.salesActual}
            onChange={(val) => updateData((d) => ({ ...d, dailyDataRecord: { ...d.dailyDataRecord, [day.date]: { ...d.dailyDataRecord[day.date], salesActual: val } } }))}
          />
        </td>
        <td className={`px-2 py-1.5 text-right font-black text-xs ${ratio > 0 ? (over ? "text-rose-600" : "text-emerald-600") : "text-slate-300"}`}>
          {ratio > 0 ? ratio.toFixed(1) + "%" : "—"}
        </td>
        <td className="px-2 py-1.5 text-center">
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
          <th key={h} className="px-2 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
        ))}
      </tr>
    </thead>
  );

  const Row = ({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: "good" | "over" | "neutral" }) => (
    <div className="flex items-baseline justify-between py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-[11px] text-slate-500 font-medium">{label}</span>
      <div className="text-right">
        <span className={`text-sm font-black ${
          highlight === "good" ? "text-emerald-600" :
          highlight === "over" ? "text-rose-600" :
          "text-slate-900"
        }`}>{value}</span>
        {sub && <span className="ml-1.5 text-[10px] text-slate-400 font-medium">{sub}</span>}
      </div>
    </div>
  );

  return (
    <div
      className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col"
      style={{ height: "calc(100dvh - 2rem)" }}
      ref={dashboardRef}
    >
      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-3 shrink-0">
        <div>
          <h1 className="text-base font-black text-slate-900 tracking-tight">
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
      <div className="grid grid-cols-2 gap-3 mb-3 shrink-0">

        {/* 売上ブロック */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm" style={{ borderLeft: "3px solid #3b82f6" }}>
          <div className="flex items-center gap-1.5 mb-2.5">
            <TrendingUp size={13} className="text-blue-500" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">売上</span>
          </div>
          <Row label="実績売上" value={`¥${totalActual.toLocaleString()}`} />
          <Row
            label="着地予測"
            value={`¥${Math.round(forecast).toLocaleString()}`}
            sub={totalBudget > 0 ? `(予算比 ${((forecast / totalBudget) * 100).toFixed(1)}%)` : undefined}
          />
          <Row
            label="予算"
            value={`¥${totalBudget.toLocaleString()}`}
            sub={achieveRate > 0 ? `達成率 ${achieveRate.toFixed(1)}%` : undefined}
            highlight={achieveRate >= 100 ? "good" : "neutral"}
          />
          <div className="mt-2 h-0.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 transition-all duration-700" style={{ width: `${Math.min(100, achieveRate)}%` }} />
          </div>
        </div>

        {/* 人件費ブロック */}
        <div className={`border rounded-xl p-3.5 shadow-sm ${forecastRatio > targetRatio ? "bg-rose-50 border-rose-200" : "bg-white border-slate-200"}`} style={{ borderLeft: `3px solid ${forecastRatio > targetRatio ? "#e11d48" : "#f59e0b"}` }}>
          <div className="flex items-center gap-1.5 mb-2.5">
            <Users size={13} className={forecastRatio > targetRatio ? "text-rose-500" : "text-amber-500"} />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">人件費</span>
          </div>

          {/* ① 実績累計 */}
          <div className="mb-1.5 pb-1.5 border-b border-slate-100">
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">① 実績累計</div>
            <Row
              label="累計コスト"
              value={`¥${Math.round(actualCost).toLocaleString()}`}
              sub={actualCostRate > 0 ? `実績比 ${actualCostRate.toFixed(1)}%` : undefined}
            />
          </div>

          {/* ② 着地予測 */}
          <div className="mb-1.5 pb-1.5 border-b border-slate-100">
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">② 着地予測（月末）</div>
            <Row
              label="予測コスト"
              value={`¥${Math.round(forecastedLaborCost).toLocaleString()}`}
              sub={forecastRatio > 0 ? `予測売上比 ${forecastRatio.toFixed(1)}%` : undefined}
              highlight={forecastRatio > targetRatio ? "over" : "neutral"}
            />
            {budgetLaborCost > 0 && (
              <div className={`mt-1 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 ${
                laborDiff > 0 ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
              }`}>
                <span>{laborDiff > 0 ? "▲ 予算超過" : "▼ 予算良好"}</span>
                <span className="font-black">
                  ¥{Math.abs(Math.round(laborDiff)).toLocaleString()}
                  {laborDiffHours > 0 && ` / ${laborDiffHours.toFixed(1)}h`}
                  {` / ${Math.abs(laborDiffRate).toFixed(1)}%`}
                </span>
              </div>
            )}
          </div>

          {/* ③ 人時売上高 */}
          <div>
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">③ 人時売上高（生産性）</div>
            <Row
              label="売上 ÷ 総労働時間"
              value={laborProductivity > 0 ? `¥${Math.round(laborProductivity).toLocaleString()} / h` : "—"}
              sub={actualWorkedHours > 0 ? `(${actualWorkedHours.toFixed(1)}h)` : undefined}
            />
          </div>
        </div>
      </div>

      {/* 日次テーブル — 2列レイアウト（内部スクロール） */}
      <div className="flex-1 min-h-0 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col shadow-sm">
        <div className="px-4 py-2 border-b border-slate-200 bg-slate-50 shrink-0">
          <span className="font-bold text-xs text-slate-700">日次売上・人件費シミュレーション</span>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="grid grid-cols-2 divide-x divide-slate-100">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <TableHead />
                <tbody>
                  {leftDays.map((day) => <DayRow key={day.date} day={day} />)}
                </tbody>
              </table>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <TableHead />
                <tbody>
                  {rightDays.map((day) => <DayRow key={day.date} day={day} />)}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
