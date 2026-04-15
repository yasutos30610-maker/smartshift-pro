import type { RefObject } from "react";
import { RefreshCw, Share2 } from "lucide-react";
import type { AppData, Staff, Store, DayInfo } from "../../types";
import { formatDate, DOW } from "../../utils/date";
import { calcDailyCost } from "../../utils/calc";

interface ViewTabProps {
  data: AppData;
  weeks: DayInfo[][];
  weekIdx: number;
  setWeekIdx: (i: number) => void;
  currentStaff: Staff[];
  currentStore: Store | undefined;
  offDays: number;
  targetRatio: number;
  isExporting: boolean;
  exportToPDF: (allWeeks?: boolean) => void;
  printRef: RefObject<HTMLDivElement | null>;
}

const START_HOUR = 9;
const END_HOUR = 26; // 2:00 next day

function timeToPercent(time: string): number {
  const [h, m] = time.split(":").map(Number);
  let total = h + m / 60;
  if (h < START_HOUR) total += 24;
  return Math.max(0, Math.min(100, ((total - START_HOUR) / (END_HOUR - START_HOUR)) * 100));
}

const HOUR_LABELS = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => {
  const h = START_HOUR + i;
  return h >= 24 ? `${h - 24}:00` : `${h}:00`;
});

export default function ViewTab({
  data, weeks, weekIdx, setWeekIdx, currentStaff, currentStore,
  offDays, targetRatio, isExporting, exportToPDF, printRef,
}: ViewTabProps) {
  const week = weeks[weekIdx] ?? [];
  const confirmedDates = new Set(data.confirmedDates ?? []);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Header */}
      <div className="flex justify-between items-center mb-3 shrink-0">
        <div>
          <h1 className="text-base font-black text-slate-900 tracking-tight">
            {data.year}年{data.month}月 — {currentStore?.name}
          </h1>
          <p className="text-[11px] text-slate-400">シフト(Daily) — 日別タイムライン</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5 bg-slate-100 border border-slate-200 rounded-lg p-0.5">
            {weeks.map((_, i) => (
              <button
                key={i}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                  weekIdx === i
                    ? "bg-white text-amber-700 shadow-sm border border-amber-100"
                    : "text-slate-400 hover:text-slate-600"
                }`}
                onClick={() => setWeekIdx(i)}
              >
                W{i + 1}
              </button>
            ))}
          </div>
          <button
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-xs font-bold shadow transition-all ${
              isExporting ? "bg-slate-300 cursor-not-allowed" : "bg-amber-500 hover:bg-amber-600"
            }`}
            onClick={() => exportToPDF(false)}
            disabled={isExporting}
          >
            {isExporting
              ? <><RefreshCw size={13} className="animate-spin" /> 出力中...</>
              : <><Share2 size={13} /> PDF出力</>}
          </button>
        </div>
      </div>

      {/* Gantt */}
      <div ref={printRef} className="space-y-2">
        {week.map((d) => {
          const date = d.date;
          const dayData = data.dailyDataRecord[date];
          if (!dayData) return null;

          const isConfirmed = confirmedDates.has(date);

          const shifts = dayData.shifts
            .filter((sh) => sh.inTime && currentStaff.some((s) => s.id === sh.staffId))
            .sort((a, b) => {
              const sA = currentStaff.find((s) => s.id === a.staffId);
              const sB = currentStaff.find((s) => s.id === b.staffId);
              if (a.isHelp !== b.isHelp) return a.isHelp ? 1 : -1;
              if (sA?.type !== sB?.type) return sA?.type === "社員" ? -1 : 1;
              return a.inTime.localeCompare(b.inTime);
            });

          const dayCost = dayData.shifts.reduce((s, sh) => {
            const staff = currentStaff.find((st) => st.id === sh.staffId);
            return s + (staff ? calcDailyCost(sh, staff, offDays, date) : 0);
          }, 0);
          const ratio = dayData.salesBudget > 0 ? (dayCost / dayData.salesBudget) * 100 : 0;
          const over = ratio > targetRatio;

          return (
            <div key={date} className={`bg-white border rounded-xl overflow-hidden shadow-sm transition-colors ${isConfirmed ? "border-emerald-300" : "border-slate-200"}`}>
              {/* Day header */}
              <div className={`flex items-center justify-between px-3 py-1.5 border-b ${isConfirmed ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}>
                <div className="flex items-center gap-2">
                  <span className="font-black text-xs text-slate-800">{formatDate(date)}</span>
                  <span className="text-[10px] text-slate-400 font-bold">{DOW[d.dow]}</span>
                  <span className="text-[10px] text-slate-400">{shifts.length}名</span>
                  {isConfirmed && (
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                      確定済み
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {ratio > 0 && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      over
                        ? "bg-rose-50 text-rose-600 border-rose-100"
                        : "bg-emerald-50 text-emerald-600 border-emerald-100"
                    }`}>
                      人件費率 {ratio.toFixed(1)}% {over ? "超過" : "良好"}
                    </span>
                  )}
                </div>
              </div>

              {shifts.length === 0 ? (
                <div className="px-3 py-3 text-[11px] text-slate-300 font-bold text-center">シフトなし</div>
              ) : (
                <div className="px-3 py-2">
                  {/* Time axis */}
                  <div className="flex mb-1" style={{ marginLeft: "7rem" }}>
                    {HOUR_LABELS.map((label, i) => (
                      <div
                        key={i}
                        className="flex-1 text-[9px] text-slate-300 font-bold border-l border-slate-100 pl-0.5"
                        style={{ minWidth: 0 }}
                      >
                        {label}
                      </div>
                    ))}
                  </div>

                  {/* Shift rows */}
                  <div className="space-y-1">
                    {shifts.map((sh) => {
                      const staff = currentStaff.find((s) => s.id === sh.staffId);
                      const left = timeToPercent(sh.inTime);
                      const right = timeToPercent(sh.outTime);
                      const width = Math.max(0, right - left);
                      const isHelp = sh.isHelp;
                      const isSeishain = staff?.type === "社員";

                      const badgeCls = isHelp
                        ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                        : isSeishain
                        ? "bg-blue-100 text-blue-700 border-blue-200"
                        : "bg-amber-50 text-amber-700 border-amber-200";

                      const barCls = isHelp
                        ? "bg-emerald-100 border-emerald-300 text-emerald-800"
                        : isSeishain
                        ? "bg-blue-100 border-blue-300 text-blue-800"
                        : "bg-amber-100 border-amber-300 text-amber-800";

                      return (
                        <div key={sh.staffId} className="flex items-center gap-2 h-6">
                          {/* Staff label */}
                          <div className="w-28 shrink-0 flex items-center gap-1 overflow-hidden">
                            <span className={`text-[8px] font-bold px-1 py-0.5 rounded border shrink-0 ${badgeCls}`}>
                              {isHelp ? "HELP" : isSeishain ? "社員" : "AP"}
                            </span>
                            <span className="text-[10px] font-bold text-slate-700 truncate">
                              {staff?.name ?? "—"}
                            </span>
                          </div>

                          {/* Bar area */}
                          <div className="flex-1 relative h-5">
                            {/* Grid lines */}
                            <div className="absolute inset-0 flex pointer-events-none">
                              {HOUR_LABELS.map((_, i) => (
                                <div key={i} className="flex-1 border-l border-slate-100" />
                              ))}
                            </div>
                            {/* Shift bar */}
                            <div
                              className={`absolute top-0 h-full rounded border text-[9px] font-bold flex items-center px-1 overflow-hidden ${barCls}`}
                              style={{ left: `${left}%`, width: `${width}%` }}
                            >
                              <span className="whitespace-nowrap">{sh.inTime}–{sh.outTime}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
