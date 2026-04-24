import { useMemo } from "react";
import type { AppData, Staff, DayInfo, Alert } from "../types";
import { calcMinutes } from "../utils/calc";

export function useAlerts(data: AppData, currentStaff: Staff[], currentDays: DayInfo[]): Alert[] {
  return useMemo(() => {
    const alerts: Alert[] = [];

    // 連勤・社保チェック
    currentStaff.forEach((staff) => {
      let consecutive = 0;
      let totalNet = 0;
      currentDays.forEach(({ date }) => {
        const day = data.dailyDataRecord[date];
        const shift = day?.shifts.find((s) => s.staffId === staff.id);
        if (shift?.inTime || shift?.inTime2) {
          consecutive++;
          if (shift.inTime && shift.outTime)
            totalNet += Math.max(0, calcMinutes(shift.inTime, shift.outTime) - (shift.breakMinutes || 0));
          if (shift.inTime2 && shift.outTime2)
            totalNet += Math.max(0, calcMinutes(shift.inTime2, shift.outTime2) - (shift.breakMinutes2 || 0));
          if (consecutive > 6) alerts.push({ name: staff.name, msg: "7連勤超え" });
        } else {
          consecutive = 0;
        }
      });
      if (staff.type === "AP" && !staff.isSocialInsurance && totalNet > 88 * 60) {
        alerts.push({ name: staff.name, msg: "月88h超 → 社保加入検討" });
      }
    });

    // ヘルプ未反映チェックはImportTabで行うため、ここでは省略

    return alerts;
  }, [data, currentStaff, currentDays]);
}
