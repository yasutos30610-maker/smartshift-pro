import { Plus, Trash2, CheckCircle, Circle } from "lucide-react";
import NumberInput from "../ui/NumberInput";
import type { AppData, Staff, DayInfo, UpdateDataFn } from "../../types";
import { formatDate } from "../../utils/date";
import { calcMinutes, calcDailyCost } from "../../utils/calc";

// ─── Enter で次の入力欄へ ────────────────────────────────────────────────────
function focusNext(e: React.KeyboardEvent<HTMLInputElement>) {
  if (e.key !== "Enter") return;
  e.preventDefault();
  const all = Array.from(
    document.querySelectorAll<HTMLInputElement>('input[type="time"], input[inputmode="numeric"]')
  );
  const idx = all.indexOf(e.currentTarget);
  if (idx >= 0 && idx < all.length - 1) all[idx + 1].focus();
}


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
  const confirmedDates = new Set(data.confirmedDates ?? []);

  const toggleConfirm = (date: string) => {
    updateData((d) => {
      const cur = new Set(d.confirmedDates ?? []);
      if (cur.has(date)) cur.delete(date);
      else cur.add(date);
      return { ...d, confirmedDates: Array.from(cur) };
    });
  };

  const confirmAllWeek = () => {
    const week = weeks[weekIdx] ?? [];
    updateData((d) => {
      const cur = new Set(d.confirmedDates ?? []);
      week.forEach((day) => cur.add(day.date));
      return { ...d, confirmedDates: Array.from(cur) };
    });
  };

  const week = weeks[weekIdx] ?? [];
  const weekAllConfirmed = week.length > 0 && week.every((d) => confirmedDates.has(d.date));

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-base font-black text-slate-900 tracking-tight">
          {data.year}年{data.month}月 — シフト作成
        </h1>
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            {weeks.map((_, i) => (
              <button
                key={i}
                className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                  weekIdx === i
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-white text-slate-500 border-slate-200 hover:text-slate-900 hover:bg-slate-50"
                }`}
                onClick={() => setWeekIdx(i)}
              >
                第{i + 1}週
              </button>
            ))}
          </div>
          <button
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
              weekAllConfirmed
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:text-emerald-700"
            }`}
            onClick={confirmAllWeek}
          >
            <CheckCircle size={13} />
            {weekAllConfirmed ? "週確定済み" : "週一括確定"}
          </button>
        </div>
      </div>

      <div className="space-y-3">
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
          const isConfirmed = confirmedDates.has(date);

          return (
            <div key={date} className={`bg-white rounded-xl overflow-hidden shadow-sm border transition-colors ${isConfirmed ? "border-emerald-300" : "border-slate-200"}`}>
              {/* 日付ヘッダー */}
              <div className={`px-3 py-2 flex justify-between items-center border-b ${isConfirmed ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`font-black text-sm ${isWeekend ? "text-rose-600" : "text-slate-900"}`}>
                    {formatDate(date)}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                    予算 ¥{day.salesBudget.toLocaleString()}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    ratio > targetRatio
                      ? "bg-rose-50 text-rose-600 border-rose-100"
                      : "bg-emerald-50 text-emerald-600 border-emerald-100"
                  }`}>
                    人件費率 {ratio.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* 確定ボタン */}
                  <button
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black border transition-all ${
                      isConfirmed
                        ? "bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200"
                        : "bg-white text-slate-500 border-slate-200 hover:border-emerald-300 hover:text-emerald-600"
                    }`}
                    onClick={() => toggleConfirm(date)}
                  >
                    {isConfirmed ? <><CheckCircle size={11} /> 確定済み</> : <><Circle size={11} /> 確定</>}
                  </button>
                  <button
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-amber-700 hover:border-amber-200 transition-all text-[11px] font-bold"
                    onClick={() => updateData((d) => {
                      const shifts = [...(d.dailyDataRecord[date]?.shifts || []), {
                        storeId: d.selectedStoreId, staffId: "", inTime: "09:00", outTime: "18:00", breakMinutes: 60, isHelp: false,
                      }];
                      return { ...d, dailyDataRecord: { ...d.dailyDataRecord, [date]: { ...d.dailyDataRecord[date], shifts } } };
                    })}
                  >
                    <Plus size={12} /> 追加
                  </button>
                </div>
              </div>

              {storeShifts.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        {["#", "名前", "希望", "IN", "OUT", "休憩(分)", "ヘルプ", "実働", "人件費", ""].map((h) => (
                          <th key={h} className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
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
                          <tr key={idx} className="border-b border-slate-100 hover:bg-amber-50/20 transition-colors">
                            <td className="px-3 py-1.5 text-slate-300 font-bold text-xs text-center w-8">{idx + 1}</td>
                            <td className="px-3 py-1.5">
                              <select
                                className="bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-700 outline-none focus:border-amber-500 min-w-[100px]"
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
                            {/* 希望IN/OUT */}
                            <td className="px-3 py-1.5">
                              {shift.requestedInTime ? (
                                <div className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100 whitespace-nowrap leading-tight">
                                  <div className="text-[9px] text-blue-400 font-bold mb-0.5">希望</div>
                                  {shift.requestedInTime}–{shift.requestedOutTime}
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-300">—</span>
                              )}
                            </td>
                            {(["inTime", "outTime"] as const).map((field) => (
                              <td key={field} className="px-3 py-1.5">
                                <input
                                  type="time"
                                  className="bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-700 outline-none focus:border-amber-500 w-22"
                                  value={shift[field]}
                                  onKeyDown={focusNext}
                                  onChange={(e) => updateData((d) => {
                                    const shifts = d.dailyDataRecord[date].shifts.map((s, i) => i === idx ? { ...s, [field]: e.target.value } : s);
                                    return { ...d, dailyDataRecord: { ...d.dailyDataRecord, [date]: { ...d.dailyDataRecord[date], shifts } } };
                                  })}
                                />
                              </td>
                            ))}
                            <td className="px-3 py-1.5">
                              <NumberInput
                                className="bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-700 outline-none focus:border-amber-500 w-14 text-right"
                                value={shift.breakMinutes}
                                onChange={(val) => updateData((d) => {
                                  const shifts = d.dailyDataRecord[date].shifts.map((s, i) => i === idx ? { ...s, breakMinutes: val } : s);
                                  return { ...d, dailyDataRecord: { ...d.dailyDataRecord, [date]: { ...d.dailyDataRecord[date], shifts } } };
                                })}
                              />
                            </td>
                            <td className="px-3 py-1.5 text-center">
                              <input
                                type="checkbox"
                                checked={shift.isHelp || false}
                                onChange={(e) => updateData((d) => {
                                  const shifts = d.dailyDataRecord[date].shifts.map((s, i) => i === idx ? { ...s, isHelp: e.target.checked } : s);
                                  return { ...d, dailyDataRecord: { ...d.dailyDataRecord, [date]: { ...d.dailyDataRecord[date], shifts } } };
                                })}
                                className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500/20"
                              />
                            </td>
                            <td className="px-3 py-1.5 text-right font-mono text-slate-500 text-xs whitespace-nowrap">
                              {Math.floor(net / 60)}h{net % 60}m
                            </td>
                            <td className="px-3 py-1.5 text-right font-black text-slate-900 text-xs whitespace-nowrap">
                              ¥{Math.round(cost).toLocaleString()}
                            </td>
                            <td className="px-3 py-1.5 text-center">
                              <button
                                className="text-slate-300 hover:text-rose-500 transition-colors"
                                onClick={() => updateData((d) => {
                                  const shifts = d.dailyDataRecord[date].shifts.filter((_, i) => i !== idx);
                                  return { ...d, dailyDataRecord: { ...d.dailyDataRecord, [date]: { ...d.dailyDataRecord[date], shifts } } };
                                })}
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-6 text-center text-slate-300 text-xs font-medium">シフト未登録</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
