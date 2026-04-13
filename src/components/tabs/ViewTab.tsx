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

export default function ViewTab({ data, weeks, weekIdx, setWeekIdx, currentStaff, currentStore, offDays, targetRatio, isExporting, exportToPDF, printRef }: ViewTabProps) {
  const startHour = 9;
  const endHour = 25.5;

  const timeLabels: string[] = [];
  for (let h = 9; h <= 25; h++) {
    const displayH = h >= 24 ? h - 24 : h;
    timeLabels.push(`${displayH}:00`);
    if (h < 25) timeLabels.push(`${displayH}:30`);
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">シフト表示</h1>
          <p className="text-sm font-bold text-slate-500">週単位での配置と人件費率を確認できます</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
            {weeks.map((_, i) => (
              <button
                key={i}
                className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${weekIdx === i ? "bg-slate-900 text-white shadow-md" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`}
                onClick={() => setWeekIdx(i)}
              >
                第{i + 1}週
              </button>
            ))}
          </div>
          <button
            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-white text-sm font-black shadow-lg transition-all active:scale-95 ${isExporting ? "bg-slate-400 cursor-not-allowed" : "bg-blue-600 shadow-blue-500/20 hover:bg-blue-500"}`}
            onClick={() => exportToPDF(false)}
            disabled={isExporting}
          >
            {isExporting ? <RefreshCw size={16} className="animate-spin" /> : <Share2 size={16} />}
            PDF出力
          </button>
        </div>
      </div>

      <div className="space-y-8" ref={printRef}>
        {weeks[weekIdx]?.map((d, dIdx) => {
          const date = d.date;
          const day = data.dailyDataRecord[date];
          if (!day) return null;

          const dayCost = day.shifts.reduce((s, sh) => {
            const staff = currentStaff.find((st) => st.id === sh.staffId);
            return s + (staff ? calcDailyCost(sh, staff, offDays, date) : 0);
          }, 0);
          const ratio = day.salesBudget > 0 ? (dayCost / day.salesBudget) * 100 : 0;

          const sortedShifts = day.shifts
            .filter((sh) => currentStaff.some((s) => s.id === sh.staffId))
            .sort((a, b) => {
              const sA = data.allStaff.find((s) => s.id === a.staffId);
              const sB = data.allStaff.find((s) => s.id === b.staffId);
              const getPriority = (s: typeof sA, sh: typeof a) => {
                if (sh.isHelp) return 3;
                if (s?.type === "社員") return 1;
                return 2;
              };
              const pA = getPriority(sA, a);
              const pB = getPriority(sB, b);
              if (pA !== pB) return pA - pB;
              return a.inTime.localeCompare(b.inTime);
            });

          const getOffset = (time: string) => {
            const [h, m] = time.split(":").map(Number);
            let total = h + m / 60;
            if (h < startHour) total += 24;
            return Math.max(0, ((total - startHour) / (endHour - startHour)) * 100);
          };

          return (
            <div key={date}>
              <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden p-8 mb-8">
                <div className="flex justify-between items-start mb-8 border-b border-slate-100 pb-6">
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">{formatDate(date)}</h2>
                    <p className="text-sm font-bold text-slate-400">{currentStore?.name}</p>
                  </div>
                  <div className="flex gap-10 text-right">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">予算</p>
                      <p className="text-2xl font-black text-slate-900">¥{day.salesBudget.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">人件費率(予)</p>
                      <p className={`text-2xl font-black ${ratio > targetRatio ? "text-rose-600" : "text-emerald-600"}`}>{ratio.toFixed(1)}%</p>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-slate-300">
                    <thead>
                      <tr className="text-slate-700 bg-slate-50">
                        <th className="border border-slate-300 bg-[#e2efda] py-2 text-center text-xs font-black w-10">No.</th>
                        <th className="border border-slate-300 bg-[#e2efda] py-2 text-left text-xs font-black px-2 w-40">名前</th>
                        <th className="border border-slate-300 bg-[#e2efda] py-2 text-center text-xs font-black w-20">IN</th>
                        <th className="border border-slate-300 bg-[#e2efda] py-2 text-center text-xs font-black w-20">OUT</th>
                        <th className="relative min-w-[600px] p-0">
                          <div className="flex w-full h-8">
                            {timeLabels.map((label, i) => (
                              <div key={i} className={`flex-1 ${label.endsWith(":30") ? "text-[8px]" : "text-[10px]"} font-black text-slate-600 border-l border-slate-300 flex items-center justify-center`}>
                                {label}
                              </div>
                            ))}
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: Math.max(15, sortedShifts.length) }).map((_, sIdx) => {
                        const sh = sortedShifts[sIdx];
                        const staff = sh ? data.allStaff.find((s) => s.id === sh.staffId) : null;
                        const left = sh ? getOffset(sh.inTime) : 0;
                        const right = sh ? getOffset(sh.outTime) : 0;
                        const width = sh ? Math.max(0, right - left) : 0;

                        return (
                          <tr key={sIdx} className="h-10">
                            <td className="border border-slate-300 bg-[#e2efda] text-center text-sm font-bold text-slate-700">{sIdx + 1}</td>
                            <td className="border border-slate-300 bg-[#e2efda] px-2 text-base font-black text-slate-900">
                              {sh && <div className="flex items-center gap-1">{staff?.name || "未設定"}</div>}
                            </td>
                            <td className="border border-slate-300 bg-[#e2efda] text-center font-mono text-sm font-bold text-slate-700">{sh?.inTime || ""}</td>
                            <td className="border border-slate-300 bg-[#e2efda] text-center font-mono text-sm font-bold text-slate-700">{sh?.outTime || ""}</td>
                            <td className="relative border border-slate-300 p-0">
                              <div className="absolute inset-0 flex">
                                {timeLabels.map((_, i) => (
                                  <div key={i} className={`flex-1 border-l ${i % 2 === 0 ? "border-slate-400" : "border-slate-200 border-dashed"}`} />
                                ))}
                                <div className="border-l border-slate-400" />
                              </div>
                              {sh && (
                                <div
                                  className="absolute top-1.5 h-7 bg-[#d9e1f2] border border-blue-400/40 shadow-sm transition-all"
                                  style={{ left: `${left}%`, width: `${width}%` }}
                                />
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 text-[10px] font-black text-slate-500">
                        <td colSpan={4} className="border border-slate-300 bg-[#e2efda] px-2 py-2">
                          出勤 {sortedShifts.length}名 / 人件費率 {ratio.toFixed(1)}% ({ratio > targetRatio ? "予算超過" : "良好"})
                        </td>
                        <td className="border border-slate-300 p-1" />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
              {(dIdx + 1) % 2 === 0 && <div className="html2pdf__page-break" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// suppress unused DOW warning — used in parent via re-export pattern
void DOW;
