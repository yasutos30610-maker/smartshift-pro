import { useState, useEffect } from "react";
import { Plus, Trash2, CheckCircle, Circle } from "lucide-react";
import NumberInput from "../ui/NumberInput";
import type { AppData, Staff, DayInfo, Shift, UpdateDataFn } from "../../types";
import { formatDate, DOW } from "../../utils/date";
import { calcMinutes, calcDailyCost } from "../../utils/calc";
import { getStoreDisplayName } from "../../utils/store";

const START_HOUR = 9;
const END_HOUR = 26;
const TOTAL_HOURS = END_HOUR - START_HOUR; // 17
const SLOTS = TOTAL_HOURS * 2; // 34 half-hour slots
const AXIS_HOURS = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => START_HOUR + i);

function timeToPercent(time: string): number {
  const [h, m] = time.split(":").map(Number);
  let t = h + m / 60;
  if (h < START_HOUR) t += 24;
  return Math.max(0, Math.min(100, ((t - START_HOUR) / TOTAL_HOURS) * 100));
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  let total = h * 60 + m;
  if (h < START_HOUR) total += 24 * 60;
  return total;
}

function computeSlotCounts(shifts: Shift[]): number[] {
  const counts = new Array<number>(SLOTS).fill(0);
  const startMin = START_HOUR * 60;
  const addPeriod = (inT: string, outT: string) => {
    const inMin = timeToMinutes(inT);
    const outMin = timeToMinutes(outT);
    for (let i = 0; i < SLOTS; i++) {
      const slotStart = startMin + i * 30;
      if (inMin < slotStart + 30 && outMin > slotStart) counts[i]++;
    }
  };
  for (const sh of shifts) {
    if (sh.inTime && sh.outTime) addPeriod(sh.inTime, sh.outTime);
    if (sh.inTime2 && sh.outTime2) addPeriod(sh.inTime2, sh.outTime2);
  }
  return counts;
}

function focusNext(e: React.KeyboardEvent<HTMLInputElement>) {
  if (e.key !== "Enter") return;
  e.preventDefault();
  const all = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="time"], input[inputmode="numeric"]'));
  const i = all.indexOf(e.currentTarget);
  if (i >= 0 && i < all.length - 1) all[i + 1].focus();
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
  const [dayIdx, setDayIdx] = useState(0);
  useEffect(() => { setDayIdx(0); }, [weekIdx]);

  const sid = data.selectedStoreId;
  const confirmedDates = new Set(data.confirmedDates?.[sid] ?? []);
  const week = weeks[weekIdx] ?? [];
  const weekAllConfirmed = week.length > 0 && week.every((d) => confirmedDates.has(d.date));
  const otherStores = data.stores.filter((s) => s.id !== sid);

  const toggleConfirm = (date: string) =>
    updateData((d) => {
      const cur = new Set(d.confirmedDates?.[sid] ?? []);
      if (cur.has(date)) cur.delete(date); else cur.add(date);
      return { ...d, confirmedDates: { ...d.confirmedDates, [sid]: Array.from(cur) } };
    });

  const confirmAllWeek = () =>
    updateData((d) => {
      const cur = new Set(d.confirmedDates?.[sid] ?? []);
      week.forEach((day) => cur.add(day.date));
      return { ...d, confirmedDates: { ...d.confirmedDates, [sid]: Array.from(cur) } };
    });

  const updateShift = (date: string, shiftIdx: number, patch: Partial<Shift>) =>
    updateData((d) => {
      const shifts = d.dailyDataRecord[date].shifts.map((s, i) => i === shiftIdx ? { ...s, ...patch } : s);
      return { ...d, dailyDataRecord: { ...d.dailyDataRecord, [date]: { ...d.dailyDataRecord[date], shifts } } };
    });

  const dayInfo = week[Math.min(dayIdx, week.length - 1)];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <h1 className="text-base font-black text-slate-900 tracking-tight">
          {data.year}年{data.month}月 — シフト作成
        </h1>
        <div className="flex flex-wrap items-center gap-2">
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

      {/* Day tabs */}
      <div className="flex flex-wrap gap-1 mb-3 pb-2 border-b border-slate-100">
        {week.map(({ date, day, dow }, i) => {
          const isWeekend = dow === 0 || dow === 6;
          const isConfirmed = confirmedDates.has(date);
          const isSelected = dayIdx === i;
          return (
            <button
              key={date}
              onClick={() => setDayIdx(i)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                isSelected
                  ? isConfirmed
                    ? "bg-emerald-100 text-emerald-700 border-emerald-300"
                    : "bg-amber-100 text-amber-700 border-amber-300"
                  : isConfirmed
                  ? "bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                  : isWeekend
                  ? "bg-white text-rose-500 border-slate-200 hover:bg-rose-50"
                  : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {day}({DOW[dow]})
            </button>
          );
        })}
      </div>

      {/* Selected day panel */}
      {dayInfo && (() => {
        const { date, dow } = dayInfo;
        const day = data.dailyDataRecord[date];
        if (!day) return null;

        const storeShifts = day.shifts.filter((sh) => {
          if (sh.storeId && sh.storeId !== sid) return false;
          return !sh.staffId || data.allStaff.some((st) => st.id === sh.staffId);
        });
        // ヘルプに出ているシフトは本数カウント・スロットカウントから除外
        const countableShifts = storeShifts.filter((sh) => !sh.isHelp);

        const dayCost = day.shifts.reduce((s, sh) => {
          if (sh.storeId && sh.storeId !== sid) return s;
          const staff = data.allStaff.find((st) => st.id === sh.staffId);
          return s + (staff ? calcDailyCost(sh, staff, offDays, date) : 0);
        }, 0);

        const totalMins = storeShifts.reduce((sum, sh) => {
          const n1 = sh.inTime && sh.outTime ? Math.max(0, calcMinutes(sh.inTime, sh.outTime) - (sh.breakMinutes || 0)) : 0;
          const n2 = sh.inTime2 && sh.outTime2 ? Math.max(0, calcMinutes(sh.inTime2, sh.outTime2) - (sh.breakMinutes2 || 0)) : 0;
          return sum + n1 + n2;
        }, 0);

        const ratio = day.salesBudget > 0 ? (dayCost / day.salesBudget) * 100 : 0;
        const productivity = totalMins > 0 ? Math.round(day.salesBudget / (totalMins / 60)) : 0;
        const isWeekend = dow === 0 || dow === 6;
        const isConfirmed = confirmedDates.has(date);

        const slotCounts = computeSlotCounts(countableShifts);
        const maxCount = Math.max(...slotCounts, 1);
        const slotWidthPct = (0.5 / TOTAL_HOURS) * 100;

        return (
          <div className={`bg-white rounded-xl overflow-hidden shadow-sm border transition-colors ${isConfirmed ? "border-emerald-300" : "border-slate-200"}`}>
            {/* Day header */}
            <div className={`px-3 py-2 flex justify-between items-center border-b ${isConfirmed ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`font-black text-sm ${isWeekend ? "text-rose-600" : "text-slate-900"}`}>
                  {formatDate(date)}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                  予算 ¥{day.salesBudget.toLocaleString()}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  ratio > targetRatio ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                }`}>
                  人件費率 {ratio.toFixed(1)}%
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                  {countableShifts.length}名
                </span>
                {productivity > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-violet-50 text-violet-600 border border-violet-100">
                    生産性 ¥{productivity.toLocaleString()}/h
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
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
              <div>
                {/* Column header + time axis + count bar */}
                <div className="flex border-b border-slate-100 bg-slate-50/50">
                  <div className="w-28 shrink-0 px-2 text-[8px] font-bold text-slate-400 uppercase tracking-wider flex items-end pb-1">スタッフ</div>
                  <div className="w-40 shrink-0 px-2 text-[8px] font-black text-amber-500 border-l border-amber-100 flex items-end pb-1">P1</div>
                  <div className="w-40 shrink-0 px-2 text-[8px] font-black text-blue-500 border-l border-blue-100 flex items-end pb-1">P2</div>
                  <div className="flex-1 relative border-l border-slate-100" style={{ height: "38px" }}>
                    {/* Hour labels */}
                    {AXIS_HOURS.map((h, i) => (
                      <div
                        key={i}
                        className="absolute top-0 text-[8px] text-slate-300 font-bold border-l border-slate-100 pl-0.5 leading-4 whitespace-nowrap pointer-events-none"
                        style={{ left: `${(i / TOTAL_HOURS) * 100}%` }}
                      >
                        {h >= 24 ? `${h - 24}:00` : `${h}:00`}
                      </div>
                    ))}
                    {/* 30-min slot count bars */}
                    {slotCounts.map((count, i) => {
                      if (count === 0) return null;
                      const intensity = count / maxCount;
                      return (
                        <div
                          key={i}
                          className="absolute bottom-0 flex items-center justify-center text-[7px] font-black"
                          style={{
                            left: `${(i * 0.5 / TOTAL_HOURS) * 100}%`,
                            width: `${slotWidthPct}%`,
                            height: "18px",
                            backgroundColor: `rgba(251, 191, 36, ${0.2 + intensity * 0.5})`,
                            color: `rgba(120, 53, 15, ${0.7 + intensity * 0.3})`,
                          }}
                        >
                          {count}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Shift rows */}
                {day.shifts.map((shift, shiftIdx) => {
                  if (shift.storeId && shift.storeId !== sid) return null;
                  const staff = data.allStaff.find((s) => s.id === shift.staffId);
                  if (shift.staffId && !staff) return null;

                  const isHelpReceived = !!staff && staff.storeId !== sid;
                  const helpStore1 = shift.helpStoreId ? data.stores.find((s) => s.id === shift.helpStoreId) : undefined;
                  const helpStore2 = shift.helpStoreId2 ? data.stores.find((s) => s.id === shift.helpStoreId2) : undefined;

                  const net1 = shift.inTime && shift.outTime ? Math.max(0, calcMinutes(shift.inTime, shift.outTime) - (shift.breakMinutes || 0)) : 0;
                  const net2 = shift.inTime2 && shift.outTime2 ? Math.max(0, calcMinutes(shift.inTime2, shift.outTime2) - (shift.breakMinutes2 || 0)) : 0;
                  const totalNet = net1 + net2;
                  const cost = staff ? calcDailyCost(shift, staff, offDays, date) : 0;
                  const alreadySelected = day.shifts.map((s) => s.staffId).filter((id) => id && id !== shift.staffId);

                  const hasRequest = !!shift.requestedInTime && !!shift.requestedOutTime;
                  const reqLeft = hasRequest ? timeToPercent(shift.requestedInTime!) : 0;
                  const reqWidth = hasRequest ? Math.max(0, timeToPercent(shift.requestedOutTime!) - reqLeft) : 0;

                  const p1Left = shift.inTime ? timeToPercent(shift.inTime) : 0;
                  const p1Width = shift.inTime && shift.outTime ? Math.max(0.5, timeToPercent(shift.outTime) - p1Left) : 0;
                  const p2Left = shift.inTime2 ? timeToPercent(shift.inTime2) : 0;
                  const p2Width = shift.inTime2 && shift.outTime2 ? Math.max(0.5, timeToPercent(shift.outTime2) - p2Left) : 0;

                  const BAR_H = "19%";
                  const p1Top = hasRequest ? "28%" : "4%";
                  const p2Top = hasRequest ? "51%" : "28%";

                  return (
                    <div key={shiftIdx} className="flex border-b border-slate-100 hover:bg-amber-50/10 transition-colors" style={{ minHeight: "96px" }}>

                      {/* Staff name + stats */}
                      <div className="w-28 shrink-0 px-2 py-2 flex flex-col justify-between">
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] text-slate-300 font-bold shrink-0">{shiftIdx + 1}</span>
                          <select
                            className="flex-1 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10px] text-slate-700 outline-none focus:border-amber-500 min-w-0"
                            value={shift.staffId}
                            onChange={(e) => updateShift(date, shiftIdx, { staffId: e.target.value })}
                          >
                            <option value="">選択</option>
                            {currentStaff.map((s) => (
                              <option key={s.id} value={s.id} disabled={alreadySelected.includes(s.id)}>{s.name}</option>
                            ))}
                            {isHelpReceived && staff && (
                              <option value={staff.id}>{staff.name}(H)</option>
                            )}
                          </select>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <div className="text-[9px] font-mono text-slate-500 leading-snug">
                            <div>{Math.floor(totalNet / 60)}h{totalNet % 60 > 0 ? `${totalNet % 60}m` : ""}</div>
                            <div className="font-black text-slate-800">¥{Math.round(cost).toLocaleString()}</div>
                          </div>
                          <button
                            className="text-slate-300 hover:text-rose-500 transition-colors shrink-0 p-0.5"
                            onClick={() => updateData((d) => {
                              const shifts = d.dailyDataRecord[date].shifts.filter((_, i) => i !== shiftIdx);
                              return { ...d, dailyDataRecord: { ...d.dailyDataRecord, [date]: { ...d.dailyDataRecord[date], shifts } } };
                            })}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      {/* P1 inputs (amber) */}
                      <div className="w-40 shrink-0 bg-amber-50/40 border-l border-amber-100 px-2 py-2 flex flex-col justify-center gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[8px] font-black text-amber-500 w-6 shrink-0">IN</span>
                          <input type="time" className="flex-1 bg-white border border-amber-200 rounded px-1.5 py-0.5 text-[10px] text-slate-700 outline-none focus:border-amber-400 min-w-0" value={shift.inTime} onKeyDown={focusNext} onChange={(e) => updateShift(date, shiftIdx, { inTime: e.target.value })} />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[8px] font-black text-amber-500 w-6 shrink-0">OUT</span>
                          <input type="time" className="flex-1 bg-white border border-amber-200 rounded px-1.5 py-0.5 text-[10px] text-slate-700 outline-none focus:border-amber-400 min-w-0" value={shift.outTime} onKeyDown={focusNext} onChange={(e) => updateShift(date, shiftIdx, { outTime: e.target.value })} />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[8px] font-black text-amber-500 w-6 shrink-0">休憩</span>
                          <NumberInput className="flex-1 bg-white border border-amber-200 rounded px-1.5 py-0.5 text-[10px] text-slate-700 text-right outline-none focus:border-amber-400 min-w-0" value={shift.breakMinutes} onChange={(val) => updateShift(date, shiftIdx, { breakMinutes: val })} />
                          <span className="text-[8px] text-slate-400 shrink-0">分</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <input type="checkbox" checked={shift.isHelp || false} className="w-3 h-3 rounded border-amber-300 accent-amber-500 shrink-0" onChange={(e) => updateShift(date, shiftIdx, { isHelp: e.target.checked, helpStoreId: e.target.checked ? shift.helpStoreId : undefined })} />
                          {shift.isHelp && otherStores.length > 0 ? (
                            <select className="flex-1 bg-white border border-amber-200 rounded px-1.5 py-0.5 text-[9px] text-slate-700 outline-none focus:border-amber-400 min-w-0" value={shift.helpStoreId || ""} onChange={(e) => updateShift(date, shiftIdx, { helpStoreId: e.target.value || undefined })}>
                              <option value="">店舗</option>
                              {otherStores.map((s) => <option key={s.id} value={s.id}>{getStoreDisplayName(s)}</option>)}
                            </select>
                          ) : (
                            <span className="text-[8px] text-slate-400">ヘルプ</span>
                          )}
                        </div>
                      </div>

                      {/* P2 inputs (blue) */}
                      <div className="w-40 shrink-0 bg-blue-50/40 border-l border-blue-100 px-2 py-2 flex flex-col justify-center gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[8px] font-black text-blue-500 w-6 shrink-0">IN</span>
                          <input type="time" className="flex-1 bg-white border border-blue-200 rounded px-1.5 py-0.5 text-[10px] text-slate-700 outline-none focus:border-blue-400 min-w-0" value={shift.inTime2 ?? ""} onKeyDown={focusNext} onChange={(e) => updateShift(date, shiftIdx, { inTime2: e.target.value || undefined })} />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[8px] font-black text-blue-500 w-6 shrink-0">OUT</span>
                          <input type="time" className="flex-1 bg-white border border-blue-200 rounded px-1.5 py-0.5 text-[10px] text-slate-700 outline-none focus:border-blue-400 min-w-0" value={shift.outTime2 ?? ""} onKeyDown={focusNext} onChange={(e) => updateShift(date, shiftIdx, { outTime2: e.target.value || undefined })} />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[8px] font-black text-blue-500 w-6 shrink-0">休憩</span>
                          <NumberInput className="flex-1 bg-white border border-blue-200 rounded px-1.5 py-0.5 text-[10px] text-slate-700 text-right outline-none focus:border-blue-400 min-w-0" value={shift.breakMinutes2 ?? 0} onChange={(val) => updateShift(date, shiftIdx, { breakMinutes2: val || undefined })} />
                          <span className="text-[8px] text-slate-400 shrink-0">分</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <input type="checkbox" checked={shift.isHelp2 || false} className="w-3 h-3 rounded border-blue-300 accent-blue-500 shrink-0" onChange={(e) => updateShift(date, shiftIdx, { isHelp2: e.target.checked, helpStoreId2: e.target.checked ? shift.helpStoreId2 : undefined })} />
                          {shift.isHelp2 && otherStores.length > 0 ? (
                            <select className="flex-1 bg-white border border-blue-200 rounded px-1.5 py-0.5 text-[9px] text-slate-700 outline-none focus:border-blue-400 min-w-0" value={shift.helpStoreId2 || ""} onChange={(e) => updateShift(date, shiftIdx, { helpStoreId2: e.target.value || undefined })}>
                              <option value="">店舗</option>
                              {otherStores.map((s) => <option key={s.id} value={s.id}>{getStoreDisplayName(s)}</option>)}
                            </select>
                          ) : (
                            <span className="text-[8px] text-slate-400">ヘルプ</span>
                          )}
                        </div>
                      </div>

                      {/* Timeline */}
                      <div className="flex-1 relative border-l border-slate-100 overflow-hidden">
                        {/* Grid lines */}
                        {AXIS_HOURS.map((_, i) => (
                          <div
                            key={i}
                            className="absolute top-0 bottom-0 border-l border-slate-100 pointer-events-none"
                            style={{ left: `${(i / TOTAL_HOURS) * 100}%` }}
                          />
                        ))}

                        {/* 希望 ghost bar — gray */}
                        {hasRequest && (
                          <div
                            className="absolute rounded bg-slate-100 border border-slate-300 pointer-events-none flex items-center px-1.5 overflow-hidden"
                            style={{ top: "4%", height: BAR_H, left: `${reqLeft}%`, width: `${reqWidth}%` }}
                          >
                            <span className="text-[8px] font-bold text-slate-400 whitespace-nowrap">希望</span>
                          </div>
                        )}

                        {/* P1 bar — orange (shift) or blue (help) */}
                        {shift.inTime && shift.outTime && p1Width > 0 && (
                          <div
                            className={`absolute rounded border text-[9px] font-bold flex items-center px-1.5 overflow-hidden ${
                              shift.isHelp ? "bg-blue-100 border-blue-300 text-blue-700" : "bg-orange-100 border-orange-300 text-orange-800"
                            }`}
                            style={{ top: p1Top, height: BAR_H, left: `${p1Left}%`, width: `${p1Width}%` }}
                          >
                            <span className="truncate">{shift.isHelp && helpStore1 ? getStoreDisplayName(helpStore1) : ""}</span>
                          </div>
                        )}

                        {/* P2 bar — orange (shift) or blue (help) */}
                        {shift.inTime2 && shift.outTime2 && p2Width > 0 && (
                          <div
                            className={`absolute rounded border text-[9px] font-bold flex items-center px-1.5 overflow-hidden ${
                              shift.isHelp2 ? "bg-blue-100 border-blue-300 text-blue-700" : "bg-orange-100 border-orange-300 text-orange-800"
                            }`}
                            style={{ top: p2Top, height: BAR_H, left: `${p2Left}%`, width: `${p2Width}%` }}
                          >
                            <span className="truncate">{shift.isHelp2 && helpStore2 ? getStoreDisplayName(helpStore2) : ""}</span>
                          </div>
                        )}

                        {/* Notes textarea */}
                        <textarea
                          className="absolute left-1.5 right-1.5 text-[9px] text-slate-600 bg-white border border-slate-200 rounded px-1.5 py-0.5 resize-none outline-none focus:border-amber-300 placeholder:text-slate-300 leading-tight"
                          style={{ bottom: "5px", height: "30px" }}
                          placeholder="備考..."
                          value={shift.note ?? ""}
                          onChange={(e) => updateShift(date, shiftIdx, { note: e.target.value || undefined })}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 text-center text-slate-300 text-xs font-medium">シフト未登録</div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
