import type { RefObject } from "react";
import { RefreshCw, Share2 } from "lucide-react";
import type { AppData, Store, DayInfo } from "../../types";
import { formatDate, DOW } from "../../utils/date";
import { calcDailyCost } from "../../utils/calc";
import { getStoreDisplayName } from "../../utils/store";

interface ViewTabProps {
  data: AppData;
  weeks: DayInfo[][];
  weekIdx: number;
  setWeekIdx: (i: number) => void;
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
  data, weeks, weekIdx, setWeekIdx, currentStore,
  offDays, targetRatio, isExporting, exportToPDF, printRef,
}: ViewTabProps) {
  const week = weeks[weekIdx] ?? [];
  const confirmedDates = new Set(data.confirmedDates?.[data.selectedStoreId] ?? []);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-2 mb-3 shrink-0">
        <div>
          <h1 className="text-base font-black text-slate-900 tracking-tight">
            {data.year}年{data.month}月 — {currentStore?.name}
          </h1>
          <p className="text-[11px] text-slate-400">シフト(Daily) — 日別タイムライン</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
            .filter((sh) => {
              if (!sh.inTime) return false;
              if (sh.storeId && sh.storeId !== data.selectedStoreId) return false;
              return data.allStaff.some((s) => s.id === sh.staffId);
            })
            .sort((a, b) => {
              const sA = data.allStaff.find((s) => s.id === a.staffId);
              const sB = data.allStaff.find((s) => s.id === b.staffId);
              if (a.isHelp !== b.isHelp) return a.isHelp ? 1 : -1;
              if (sA?.type !== sB?.type) return sA?.type === "社員" ? -1 : 1;
              return a.inTime.localeCompare(b.inTime);
            });

          const dayCost = dayData.shifts.reduce((s, sh) => {
            if (sh.storeId && sh.storeId !== data.selectedStoreId) return s;
            const staff = data.allStaff.find((st) => st.id === sh.staffId);
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
                  <span className="text-[10px] text-slate-400">{shifts.filter((sh) => !sh.isHelp).length}名</span>
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
                  <div className="relative h-4 mb-1" style={{ marginLeft: "7rem" }}>
                    {HOUR_LABELS.map((label, i) => (
                      <div
                        key={i}
                        className="absolute top-0 text-[9px] text-slate-300 font-bold border-l border-slate-100 pl-0.5 whitespace-nowrap"
                        style={{ left: `${(i / (END_HOUR - START_HOUR)) * 100}%` }}
                      >
                        {label}
                      </div>
                    ))}
                  </div>

                  {/* Shift rows */}
                  <div className="space-y-1">
                    {shifts.map((sh) => {
                      const staff = data.allStaff.find((s) => s.id === sh.staffId);
                      const isSeishain = staff?.type === "社員";
                      const isHelpReceived = !!staff && staff.storeId !== data.selectedStoreId && !sh.isHelp;

                      const helpStore1 = sh.helpStoreId ? data.stores.find((s) => s.id === sh.helpStoreId) : undefined;
                      const helpStore2 = sh.helpStoreId2 ? data.stores.find((s) => s.id === sh.helpStoreId2) : undefined;

                      const left1 = timeToPercent(sh.inTime);
                      const width1 = Math.max(0, timeToPercent(sh.outTime) - left1);
                      const hasP2 = !!sh.inTime2 && !!sh.outTime2;
                      const left2 = hasP2 ? timeToPercent(sh.inTime2!) : 0;
                      const width2 = hasP2 ? Math.max(0, timeToPercent(sh.outTime2!) - left2) : 0;

                      const badgeCls = sh.isHelp
                        ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                        : isHelpReceived
                        ? "bg-teal-100 text-teal-700 border-teal-200"
                        : isSeishain
                        ? "bg-blue-100 text-blue-700 border-blue-200"
                        : "bg-amber-50 text-amber-700 border-amber-200";

                      const barCls1 = sh.isHelp
                        ? "bg-blue-100 border-blue-300 text-blue-700"
                        : "bg-orange-100 border-orange-300 text-orange-800";

                      const barCls2 = sh.isHelp2
                        ? "bg-blue-100 border-blue-300 text-blue-700"
                        : "bg-orange-100 border-orange-300 text-orange-800";

                      const label1 = sh.isHelp
                        ? `${sh.inTime}–${sh.outTime} ${helpStore1 ? getStoreDisplayName(helpStore1) : "他店"}ヘルプ`
                        : `${sh.inTime}–${sh.outTime}`;
                      const label2 = hasP2
                        ? (sh.isHelp2
                            ? `${sh.inTime2}–${sh.outTime2} ${helpStore2 ? getStoreDisplayName(helpStore2) : "他店"}ヘルプ`
                            : `${sh.inTime2}–${sh.outTime2}`)
                        : "";

                      return (
                        <div key={sh.staffId} className="flex flex-col">
                          <div className="flex items-center gap-2 h-6">
                            {/* Staff label */}
                            <div className="w-28 shrink-0 flex items-center gap-1 overflow-hidden">
                              <span className={`text-[8px] font-bold px-1 py-0.5 rounded border shrink-0 ${badgeCls}`}>
                                {sh.isHelp ? "HELP" : isHelpReceived ? "H受" : isSeishain ? "社員" : "AP"}
                              </span>
                              <span className="text-[10px] font-bold text-slate-700 truncate">
                                {staff?.name ?? "—"}
                              </span>
                            </div>

                            {/* Bar area */}
                            <div className="flex-1 relative h-5">
                              {/* Grid lines */}
                              {HOUR_LABELS.map((_, i) => (
                                <div
                                  key={i}
                                  className="absolute top-0 bottom-0 border-l border-slate-100 pointer-events-none"
                                  style={{ left: `${(i / (END_HOUR - START_HOUR)) * 100}%` }}
                                />
                              ))}
                              {/* P1 bar */}
                              <div
                                className={`absolute top-0 h-full rounded border text-[9px] font-bold flex items-center px-1 overflow-hidden ${barCls1}`}
                                style={{ left: `${left1}%`, width: `${width1}%` }}
                              >
                                <span className="whitespace-nowrap">{label1}</span>
                              </div>
                              {/* P2 bar */}
                              {hasP2 && (
                                <div
                                  className={`absolute top-0 h-full rounded border text-[9px] font-bold flex items-center px-1 overflow-hidden ${barCls2}`}
                                  style={{ left: `${left2}%`, width: `${width2}%` }}
                                >
                                  <span className="whitespace-nowrap">{label2}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          {/* Note */}
                          {sh.note && (
                            <div className="flex items-center gap-2 mt-0.5 mb-1" style={{ marginLeft: "7.5rem" }}>
                              <p className="text-[9px] text-slate-400 italic truncate">{sh.note}</p>
                            </div>
                          )}
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
