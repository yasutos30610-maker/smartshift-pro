import type { RefObject } from "react";
import { Share2, RefreshCw } from "lucide-react";
import WeeklyPrintGrid from "../print/WeeklyPrintGrid";
import type { AppData, Staff, Store, DayInfo } from "../../types";
import { formatDate, DOW } from "../../utils/date";
import { calcMinutes } from "../../utils/calc";

interface PrintTabProps {
  data: AppData;
  weeks: DayInfo[][];
  weekIdx: number;
  setWeekIdx: (i: number) => void;
  currentStaff: Staff[];
  currentStore: Store | undefined;
  isExporting: boolean;
  exportToPDF: (allWeeks?: boolean) => void;
  printRef: RefObject<HTMLDivElement | null>;
  allWeeksPrintRef: RefObject<HTMLDivElement | null>;
}

export default function PrintTab({
  data, weeks, weekIdx, setWeekIdx, currentStaff, currentStore,
  isExporting, exportToPDF, printRef, allWeeksPrintRef,
}: PrintTabProps) {
  const week = weeks[weekIdx] ?? [];

  const staffList = [...currentStaff].sort((a, b) => {
    if (a.type !== b.type) return a.type === "社員" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-2 mb-3 shrink-0">
        <div>
          <h1 className="text-base font-black text-slate-900 tracking-tight">
            {data.year}年{data.month}月 — {currentStore?.name}
          </h1>
          <p className="text-[11px] text-slate-400">シフト(Weekly) — 週別シフト一覧</p>
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
          <button
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-slate-700 bg-white border border-slate-200 text-xs font-bold transition-all ${
              isExporting ? "opacity-50 cursor-not-allowed" : "hover:border-amber-300 hover:text-amber-700"
            }`}
            onClick={() => exportToPDF(true)}
            disabled={isExporting}
          >
            <RefreshCw size={13} /> 全週一括
          </button>
        </div>
      </div>

      {/* Period label */}
      {week.length > 0 && (
        <div className="text-[11px] text-slate-400 font-bold mb-2">
          第{weekIdx + 1}週: {formatDate(week[0].date)} 〜 {formatDate(week[week.length - 1].date)}
        </div>
      )}

      {/* Weekly table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap w-32">
                  スタッフ
                </th>
                {week.map((d) => (
                  <th key={d.date} className="px-2 py-2 text-center min-w-[72px]">
                    <div className="text-[10px] font-bold text-slate-400">{DOW[d.dow]}</div>
                    <div className="text-xs font-black text-slate-700">{d.day}日</div>
                  </th>
                ))}
                <th className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">
                  合計
                </th>
              </tr>
            </thead>
            <tbody>
              {staffList.map((staff) => {
                let weeklyMins = 0;
                return (
                  <tr key={staff.id} className="border-b border-slate-100 hover:bg-amber-50/20 transition-colors">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                          staff.type === "社員"
                            ? "bg-blue-50 text-blue-600 border-blue-100"
                            : "bg-slate-50 text-slate-500 border-slate-200"
                        }`}>
                          {staff.type === "社員" ? "社" : "AP"}
                        </span>
                        <span className="text-xs font-bold text-slate-800">{staff.name}</span>
                      </div>
                    </td>
                    {week.map((d) => {
                      const dayData = data.dailyDataRecord[d.date];
                      const shift = dayData?.shifts.find((s) => s.staffId === staff.id);
                      if (shift?.inTime) {
                        const net1 = Math.max(0, calcMinutes(shift.inTime, shift.outTime) - (shift.breakMinutes || 0));
                        const net2 = (shift.inTime2 && shift.outTime2)
                          ? Math.max(0, calcMinutes(shift.inTime2, shift.outTime2) - (shift.breakMinutes2 || 0))
                          : 0;
                        weeklyMins += net1 + net2;
                        return (
                          <td key={d.date} className="px-1 py-1.5 text-center align-middle">
                            <div className={`text-[10px] font-black leading-snug ${shift.isHelp ? "text-emerald-700" : "text-slate-800"}`}>
                              {shift.inTime}–{shift.outTime}{shift.isHelp ? " H" : ""}
                            </div>
                            {shift.inTime2 && shift.outTime2 && (
                              <div className={`text-[10px] font-black leading-snug mt-0.5 ${shift.isHelp2 ? "text-teal-600" : "text-blue-600"}`}>
                                {shift.inTime2}–{shift.outTime2}{shift.isHelp2 ? " H" : ""}
                              </div>
                            )}
                          </td>
                        );
                      }
                      return (
                        <td key={d.date} className="px-1 py-1.5 text-center bg-slate-50/40">
                          <span className="text-[10px] font-bold text-slate-300">公休</span>
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-center">
                      <span className="text-xs font-black text-slate-700 font-mono">
                        {(weeklyMins / 60).toFixed(1)}h
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t border-slate-200">
                <td className="px-3 py-2 text-[10px] font-bold text-slate-500">出勤人数</td>
                {week.map((d) => {
                  const count =
                    data.dailyDataRecord[d.date]?.shifts.filter(
                      (s) => currentStaff.some((st) => st.id === s.staffId) && s.inTime
                    ).length ?? 0;
                  return (
                    <td key={d.date} className="px-2 py-2 text-center">
                      <span className="text-xs font-black text-slate-700">{count}名</span>
                    </td>
                  );
                })}
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Hidden containers for PDF export (unscaled) */}
      <div className="fixed -left-[9999px] top-0 pointer-events-none">
        <div ref={printRef}>
          {weeks[weekIdx] && (
            <WeeklyPrintGrid
              week={weeks[weekIdx]}
              weekNumber={weekIdx + 1}
              currentStaff={currentStaff}
              data={data}
              currentStore={currentStore}
            />
          )}
        </div>
      </div>
      <div className="fixed -left-[9999px] top-0 pointer-events-none">
        <div ref={allWeeksPrintRef}>
          {weeks.map((w, i) => (
            <div key={i} className={i > 0 ? "html2pdf__page-break" : ""}>
              <WeeklyPrintGrid
                week={w}
                weekNumber={i + 1}
                currentStaff={currentStaff}
                data={data}
                currentStore={currentStore}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
