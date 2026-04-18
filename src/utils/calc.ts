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
  if (!shift.inTime || !shift.outTime || shift.isHelp) return 0;
  const total = calcMinutes(shift.inTime, shift.outTime);
  const net = Math.max(0, total - (shift.breakMinutes || 0));
  const midnight = calcMidnightMinutes(shift.inTime, shift.outTime);

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
    const base = (net / 60) * rate;
    const ot = Math.max(0, net - 480);
    const otExtra = (ot / 60) * rate * 0.25;
    const midExtra = (midnight / 60) * rate * 0.25;
    const transport = staff.dailyTransport ?? 0;
    return base + otExtra + midExtra + dailyAdd + transport;
  } else {
    if (!dateStr) return 0;
    const [y, mo] = dateStr.split("-").map(Number);
    const daysInMo = getDaysInMonth(y, mo);
    const workingDays = Math.max(1, daysInMo - monthlyOffDays);
    const dailyBase = staff.monthlySalary / workingDays;
    const hrRate = staff.monthlySalary / 173;
    const midExtra = (midnight / 60) * hrRate * 0.25;
    const transportDaily = (staff.monthlyTransport ?? 0) / workingDays;
    return dailyBase + midExtra + dailyAdd + transportDaily;
  }
}
