import type { RefObject } from "react";
import { Share2, RefreshCw } from "lucide-react";
import WeeklyPrintGrid from "../print/WeeklyPrintGrid";
import type { AppData, Staff, Store, DayInfo } from "../../types";
import { formatDate } from "../../utils/date";

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

export default function PrintTab({ data, weeks, weekIdx, setWeekIdx, currentStaff, currentStore, isExporting, exportToPDF, printRef, allWeeksPrintRef }: PrintTabProps) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">シフト印刷</h1>
          <p className="text-sm font-bold text-slate-500">A4縦サイズ・週単位での出力に最適化されています</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            className={`flex items-center gap-2 px-8 py-3 rounded-xl text-white bg-blue-600 text-sm font-black shadow-xl transition-all hover:bg-blue-700 active:scale-95 ${isExporting ? "opacity-50 cursor-not-allowed" : ""}`}
            onClick={() => exportToPDF(false)}
            disabled={isExporting}
          >
            <Share2 size={18} /> PDF出力
          </button>
          <button
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-slate-700 bg-white border-2 border-slate-200 text-sm font-black shadow-sm transition-all hover:border-slate-900 hover:bg-slate-50 ${isExporting ? "opacity-50 cursor-not-allowed" : ""}`}
            onClick={() => exportToPDF(true)}
            disabled={isExporting}
          >
            <RefreshCw size={18} className={isExporting ? "animate-spin" : ""} /> 全ての週を一括出力
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {weeks.map((week, i) => (
          <button
            key={i}
            className={`px-6 py-2.5 rounded-xl border-2 text-xs font-black transition-all ${weekIdx === i ? "bg-slate-900 text-white border-slate-900 shadow-lg" : "bg-white text-slate-500 border-slate-100 hover:border-slate-300"}`}
            onClick={() => setWeekIdx(i)}
          >
            第{i + 1}週 ({formatDate(week[0].date)}〜)
          </button>
        ))}
      </div>

      <div className="bg-slate-100 p-8 rounded-3xl border-2 border-dashed border-slate-300 flex justify-center overflow-hidden">
        <div className="bg-white shadow-2xl origin-top scale-[0.6] sm:scale-[0.8] md:scale-100 transition-transform" ref={printRef}>
          {weeks[weekIdx] && (
            <WeeklyPrintGrid week={weeks[weekIdx]} weekNumber={weekIdx + 1} currentStaff={currentStaff} data={data} currentStore={currentStore} />
          )}
        </div>
      </div>

      {/* Hidden container for full-month export */}
      <div className="fixed -left-[9999px] top-0">
        <div ref={allWeeksPrintRef}>
          {weeks.map((week, i) => (
            <div key={i} className={i > 0 ? "html2pdf__page-break" : ""}>
              <WeeklyPrintGrid week={week} weekNumber={i + 1} currentStaff={currentStaff} data={data} currentStore={currentStore} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
