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
        if (shift?.inTime) {
          consecutive++;
          const net = Math.max(0, calcMinutes(shift.inTime, shift.outTime) - (shift.breakMinutes || 0));
          totalNet += net;
          if (consecutive > 6) alerts.push({ name: staff.name, msg: "7連勤超え" });
        } else {
          consecutive = 0;
        }
      });
      if (staff.type === "AP" && !staff.isSocialInsurance && totalNet > 88 * 60) {
        alerts.push({ name: staff.name, msg: "月88h超 → 社保加入検討" });
      }
    });

    // ヘルプ未反映チェック
    const sid = data?.selectedStoreId;
    if (!sid) return alerts;
    const alerted = new Set<string>();
    Object.values(data.dailyDataRecord).forEach((dayData) => {
      dayData.shifts.forEach((sh) => {
        if (sh.isHelp && sh.helpStoreId === sid && !alerted.has(sh.staffId)) {
          const already = dayData.shifts.some(
            (s) => s.storeId === sid && s.staffId === sh.staffId && s.inTime === sh.inTime
          );
          if (!already) {
            const staff = data.allStaff.find((s) => s.id === sh.staffId);
            if (staff) { alerts.push({ name: staff.name, msg: "ヘルプ未反映" }); alerted.add(sh.staffId); }
          }
        }
        if (sh.isHelp2 && sh.helpStoreId2 === sid && sh.inTime2 && !alerted.has(sh.staffId + ":2")) {
          const already = dayData.shifts.some(
            (s) => s.storeId === sid && s.staffId === sh.staffId && s.inTime === sh.inTime2
          );
          if (!already) {
            const staff = data.allStaff.find((s) => s.id === sh.staffId);
            if (staff) { alerts.push({ name: staff.name, msg: "ヘルプ未反映(2部)" }); alerted.add(sh.staffId + ":2"); }
          }
        }
      });
    });

    return alerts;
  }, [data, currentStaff, currentDays]);
}
