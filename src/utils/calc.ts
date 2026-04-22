import type { Shift, Staff } from "../types";
import { getDaysInMonth } from "./date";

export function calcMinutes(inT: string, outT: string): number {
  if (!inT || !outT) return 0;
  const [ih, im] = inT.split(":").map(Number);
  const [oh, om] = outT.split(":").map(Number);
  let total = (oh * 60 + om) - (ih * 60 + im);
  if (total < 0) total += 24 * 60;
  return total;
}

export function calcMidnightMinutes(inT: string, outT: string): number {
  const totalMins = calcMinutes(inT, outT);
  if (!totalMins) return 0;
  const [ih, im] = inT.split(":").map(Number);
  const startMin = ih * 60 + im;
  const endMin = startMin + totalMins;
  let midnight = 0;
  for (let m = startMin; m < endMin; m++) {
    const h = (m % (24 * 60)) / 60;
    if (h >= 22 || h < 5) midnight++;
  }
  return midnight;
}

export function calcDailyCost(
  shift: Shift,
  staff: Staff,
  monthlyOffDays = 9,
  dateStr: string
): number {
  const p1 = !shift.isHelp && !!shift.inTime && !!shift.outTime;
  const p2 = !shift.isHelp2 && !!shift.inTime2 && !!shift.outTime2;
  if (!p1 && !p2) return 0;

  let hourlyAdd = 0;
  let dailyAdd = 0;
  if (staff.adjustments && dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    staff.adjustments.forEach((adj) => {
      const start = new Date(adj.start + "T00:00:00");
      const end = new Date(adj.end + "T23:59:59");
      if (d >= start && d <= end) {
        hourlyAdd += adj.hourly || 0;
        dailyAdd += adj.daily || 0;
      }
    });
  }

  if (staff.type === "AP") {
    const rate = staff.hourlyRate + hourlyAdd;
    let totalNet = 0;
    let totalMidnight = 0;
    if (p1) {
      totalNet += Math.max(0, calcMinutes(shift.inTime, shift.outTime) - (shift.breakMinutes || 0));
      totalMidnight += calcMidnightMinutes(shift.inTime, shift.outTime);
    }
    if (p2) {
      totalNet += Math.max(0, calcMinutes(shift.inTime2!, shift.outTime2!) - (shift.breakMinutes2 || 0));
      totalMidnight += calcMidnightMinutes(shift.inTime2!, shift.outTime2!);
    }
    const base = (totalNet / 60) * rate;
    const ot = Math.max(0, totalNet - 480);
    const otExtra = (ot / 60) * rate * 0.25;
    const midExtra = (totalMidnight / 60) * rate * 0.25;
    return base + otExtra + midExtra + dailyAdd + (staff.dailyTransport ?? 0);
  } else {
    if (!dateStr) return 0;
    const [y, mo] = dateStr.split("-").map(Number);
    const daysInMo = getDaysInMonth(y, mo);
    const workingDays = Math.max(1, daysInMo - monthlyOffDays);
    const dailyBase = staff.monthlySalary / workingDays;
    const hrRate = staff.monthlySalary / 173;
    let totalMidnight = 0;
    if (p1) totalMidnight += calcMidnightMinutes(shift.inTime, shift.outTime);
    if (p2) totalMidnight += calcMidnightMinutes(shift.inTime2!, shift.outTime2!);
    const midExtra = (totalMidnight / 60) * hrRate * 0.25;
    const transportDaily = (staff.monthlyTransport ?? 0) / workingDays;
    return dailyBase + midExtra + dailyAdd + transportDaily;
  }
}
