import type { DayInfo } from "../types";

export const DOW = ["日", "月", "火", "水", "木", "金", "土"] as const;

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function getDaysArray(year: number, month: number): DayInfo[] {
  const n = getDaysInMonth(year, month);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(year, month - 1, i + 1);
    return {
      date: `${year}-${String(month).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`,
      day: i + 1,
      dow: d.getDay(),
    };
  });
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getMonth() + 1}/${d.getDate()}(${DOW[d.getDay()]})`;
}

export function getWeeks(year: number, month: number): DayInfo[][] {
  const days = getDaysArray(year, month);
  const weeks: DayInfo[][] = [];
  let week: DayInfo[] = [];
  days.forEach((d, i) => {
    week.push(d);
    if (d.dow === 6 || i === days.length - 1) {
      weeks.push(week);
      week = [];
    }
  });
  return weeks;
}
