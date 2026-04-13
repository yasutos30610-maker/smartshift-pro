import type { AppData, Staff, Store, DayInfo } from "../../types";
import { DOW, formatDate } from "../../utils/date";
import { calcMinutes } from "../../utils/calc";

interface WeeklyPrintGridProps {
  week: DayInfo[];
  weekNumber: number;
  currentStaff: Staff[];
  data: AppData;
  currentStore: Store | undefined;
}

export default function WeeklyPrintGrid({ week, weekNumber, currentStaff, data, currentStore }: WeeklyPrintGridProps) {
  const weekDays = week;
  const staffList = [...currentStaff].sort((a, b) => {
    if (a.type !== b.type) return a.type === "社員" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="bg-white p-10 min-h-[297mm] w-[210mm] flex flex-col">
      <div className="flex justify-between items-end mb-8 border-b-4 border-slate-900 pb-4">
        <div>
          <h2 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">Weekly Shift Schedule</h2>
          <p className="text-sm font-bold text-slate-500">
            {currentStore?.name} — {data.year}年{data.month}月 第{weekNumber}週
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Period</p>
          <p className="text-sm font-bold">
            {formatDate(weekDays[0].date)} 〜 {formatDate(weekDays[weekDays.length - 1].date)}
          </p>
        </div>
      </div>

      <table className="w-full border-collapse border-2 border-slate-900">
        <thead>
          <tr className="bg-slate-900 text-white">
            <th className="border border-slate-900 p-3 text-xs font-black w-32">スタッフ名</th>
            {weekDays.map((d) => (
              <th key={d.date} className="border border-slate-900 p-2 text-center w-24">
                <div className="text-[10px] font-black opacity-70">{DOW[d.dow]}</div>
                <div className="text-sm font-black">{d.day}</div>
              </th>
            ))}
            <th className="border border-slate-900 p-2 text-center w-20 text-[10px] font-black">合計h</th>
          </tr>
        </thead>
        <tbody>
          {staffList.map((staff) => {
            let weeklyTotal = 0;
            return (
              <tr key={staff.id} className="hover:bg-slate-50 transition-colors">
                <td className="border border-slate-300 p-3 text-xs font-bold bg-slate-50/50">
                  <div className="flex items-center gap-1">
                    {staff.type === "社員" && (
                      <span className="text-[8px] bg-blue-600 text-white px-1 rounded-sm">社</span>
                    )}
                    {staff.name}
                  </div>
                </td>
                {weekDays.map((d) => {
                  const dayData = data.dailyDataRecord[d.date];
                  const shift = dayData?.shifts.find((s) => s.staffId === staff.id);
                  if (shift?.inTime) {
                    const net = Math.max(0, calcMinutes(shift.inTime, shift.outTime) - (shift.breakMinutes || 0));
                    weeklyTotal += net;
                    return (
                      <td key={d.date} className="border border-slate-300 p-1 text-center">
                        <div className="text-[10px] font-black text-slate-900 leading-tight">
                          {shift.inTime}
                          <br />
                          <span className="text-slate-400">—</span>
                          <br />
                          {shift.outTime}
                          <br />
                          <span className="text-[8px] text-blue-600">{(net / 60).toFixed(1)}h</span>
                        </div>
                      </td>
                    );
                  }
                  return (
                    <td key={d.date} className="border border-slate-300 p-1 text-center bg-slate-50/30">
                      <span className="text-[10px] font-bold text-slate-300">公休</span>
                    </td>
                  );
                })}
                <td className="border border-slate-300 p-2 text-center font-mono text-xs font-black bg-slate-50/50">
                  {(weeklyTotal / 60).toFixed(1)}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-slate-100 font-black text-[10px]">
            <td className="border border-slate-300 p-3">出勤人数</td>
            {weekDays.map((d) => {
              const count =
                data.dailyDataRecord[d.date]?.shifts.filter((s) =>
                  currentStaff.some((st) => st.id === s.staffId)
                ).length || 0;
              return (
                <td key={d.date} className="border border-slate-300 p-2 text-center">
                  {count}名
                </td>
              );
            })}
            <td className="border border-slate-300 p-2" />
          </tr>
        </tfoot>
      </table>

      <div className="mt-auto pt-10 flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
        <div>Generated by SmartShift PRO — {new Date().toLocaleString()}</div>
        <div>Page {weekNumber}</div>
      </div>
    </div>
  );
}
