import { Plus, Trash2 } from "lucide-react";
import NumberInput from "../ui/NumberInput";
import type { AppData, Staff, DayInfo, UpdateDataFn } from "../../types";
import { formatDate } from "../../utils/date";
import { calcMinutes, calcDailyCost } from "../../utils/calc";

interface ShiftsTabProps {
  data: AppData;
  weeks: DayInfo[][];
  weekIdx: number;
  setWeekIdx: (i: number) => void;
  currentStaff: Staff[];
  offDays: number;
  targetRatio: number;
  updateData: UpdateDataFn;
}

export default function ShiftsTab({ data, weeks, weekIdx, setWeekIdx, currentStaff, offDays, targetRatio, updateData }: ShiftsTabProps) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <h1 className="text-2xl font-black text-slate-900 mb-6 tracking-tight">
        {data.year}年{data.month}月 — シフト作成
      </h1>
      <div className="flex gap-2 mb-6 flex-wrap">
        {weeks.map((_, i) => (
          <button
            key={i}
            className={`px-5 py-2 rounded-xl border text-sm font-bold transition-all ${weekIdx === i ? "bg-blue-50 text-blue-600 border-blue-200 shadow-sm" : "bg-white text-slate-500 border-slate-200 hover:text-slate-900 hover:bg-slate-50"}`}
            onClick={() => setWeekIdx(i)}
          >
            第{i + 1}週
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {weeks[weekIdx]?.map(({ date, dow }) => {
          const day = data.dailyDataRecord[date];
          if (!day) return null;
          const dayCost = day.shifts.reduce((s, sh) => {
            const staff = currentStaff.find((st) => st.id === sh.staffId);
            return s + (staff ? calcDailyCost(sh, staff, offDays, date) : 0);
          }, 0);
          const ratio = day.salesBudget > 0 ? (dayCost / day.salesBudget) * 100 : 0;
          const storeShifts = day.shifts.filter((sh) => {
            if (sh.storeId && sh.storeId !== data.selectedStoreId) return false;
            const staff = currentStaff.find((st) => st.id === sh.staffId);
            return !sh.staffId || staff;
          });
          const isWeekend = dow === 0 || dow === 6;

          return (
            <div key={date} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-5 py-3.5 bg-slate-50/50 flex justify-between items-center border-b border-slate-200">
                <div className="flex items-center gap-4">
                  <span className={`font-black text-base ${isWeekend ? "text-rose-600" : "text-slate-900"}`}>{formatDate(date)}</span>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-blue-50 text-blue-600 border border-blue-100">予算 ¥{day.salesBudget.toLocaleString()}</span>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-md border ${ratio > targetRatio ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"}`}>
                    人件費率 {ratio.toFixed(1)}%
                  </span>
                </div>
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all text-[11px] font-bold"
                  onClick={() => updateData((d) => {
                    const shifts = [...(d.dailyDataRecord[date]?.shifts || []), { storeId: d.selectedStoreId, staffId: "", inTime: "09:00", outTime: "18:00", breakMinutes: 60, isHelp: false }];
                    return { ...d, dailyDataRecord: { ...d.dailyDataRecord, [date]: { ...d.dailyDataRecord[date], shifts } } };
                  })}
                >
                  <Plus size={14} /> スタッフ追加
                </button>
              </div>

              {storeShifts.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-slate-50">
                        {["#", "名前", "IN", "OUT", "休憩", "他店ヘルプ", "実働", "概算人件費", ""].map((h) => (
                          <th key={h} className="px-5 py-2.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {day.shifts.map((shift, idx) => {
                        const staff = currentStaff.find((s) => s.id === shift.staffId);
                        if (shift.storeId && shift.storeId !== data.selectedStoreId) return null;
                        if (shift.staffId && !staff) return null;
                        const net = Math.max(0, calcMinutes(shift.inTime, shift.outTime) - (shift.breakMinutes || 0));
                        const cost = staff ? calcDailyCost(shift, staff, offDays, date) : 0;
                        const alreadySelected = day.shifts.map((s) => s.staffId).filter((id) => id && id !== shift.staffId);
                        return (
                          <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-3 text-slate-400 font-bold w-10 text-center">{idx + 1}</td>
                            <td className="px-5 py-3">
                              <select
                                className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-500 min-w-[120px]"
                                value={shift.staffId}
                                onChange={(e) => updateData((d) => {
                                  const shifts = d.dailyDataRecord[date].shifts.map((s, i) => i === idx ? { ...s, staffId: e.target.value } : s);
                                  return { ...d, dailyDataRecord: { ...d.dailyDataRecord, [date]: { ...d.dailyDataRecord[date], shifts } } };
                                })}
                              >
                                <option value="">選択</option>
                                {currentStaff.map((s) => (
                                  <option key={s.id} value={s.id} disabled={alreadySelected.includes(s.id)}>{s.name}</option>
                                ))}
                              </select>
                            </td>
                            {(["inTime", "outTime"] as const).map((field) => (
                              <td key={field} className="px-5 py-3">
                                <input
                                  type="time"
                                  className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-500 w-24"
                                  value={shift[field]}
                                  onChange={(e) => updateData((d) => {
                                    const shifts = d.dailyDataRecord[date].shifts.map((s, i) => i === idx ? { ...s, [field]: e.target.value } : s);
                                    return { ...d, dailyDataRecord: { ...d.dailyDataRecord, [date]: { ...d.dailyDataRecord[date], shifts } } };
                                  })}
                                />
                              </td>
                            ))}
                            <td className="px-5 py-3">
                              <NumberInput
                                className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-blue-500 w-16 text-right"
                                value={shift.breakMinutes}
                                onChange={(val) => updateData((d) => {
                                  const shifts = d.dailyDataRecord[date].shifts.map((s, i) => i === idx ? { ...s, breakMinutes: val } : s);
                                  return { ...d, dailyDataRecord: { ...d.dailyDataRecord, [date]: { ...d.dailyDataRecord[date], shifts } } };
                                })}
                              />
                            </td>
                            <td className="px-5 py-3 text-center">
                              <input
                                type="checkbox"
                                checked={shift.isHelp || false}
                                onChange={(e) => updateData((d) => {
                                  const shifts = d.dailyDataRecord[date].shifts.map((s, i) => i === idx ? { ...s, isHelp: e.target.checked } : s);
                                  return { ...d, dailyDataRecord: { ...d.dailyDataRecord, [date]: { ...d.dailyDataRecord[date], shifts } } };
                                })}
                                className="w-4 h-4 rounded border-slate-300 bg-white text-blue-600 focus:ring-blue-500/20"
                              />
                            </td>
                            <td className="px-5 py-3 text-right font-mono text-slate-500 text-xs">{Math.floor(net / 60)}h{net % 60}m</td>
                            <td className="px-5 py-3 text-right font-black text-slate-900">¥{Math.round(cost).toLocaleString()}</td>
                            <td className="px-5 py-3 text-center">
                              <button
                                className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                                onClick={() => updateData((d) => {
                                  const shifts = d.dailyDataRecord[date].shifts.filter((_, i) => i !== idx);
                                  return { ...d, dailyDataRecord: { ...d.dailyDataRecord, [date]: { ...d.dailyDataRecord[date], shifts } } };
                                })}
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-10 text-center text-slate-400 text-xs font-medium italic">シフト未登録</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
