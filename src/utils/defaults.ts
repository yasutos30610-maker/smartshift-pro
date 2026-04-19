import type { AppData } from "../types";
import { getDaysArray } from "./date";

export function buildDefaultData(): AppData {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const days = getDaysArray(year, month);
  const dailyDataRecord: AppData["dailyDataRecord"] = {};
  days.forEach(({ date }) => {
    dailyDataRecord[date] = { date, salesBudget: 0, salesActual: 0, shifts: [] };
  });
  return {
    stores: [
      { id: "store-1", name: "渋谷センター街店", targetRatio: 25 },
      { id: "store-2", name: "新宿東口店", targetRatio: 22 },
    ],
    allStaff: [
      { id: "s1", storeId: "store-1", name: "中山", type: "社員", isSocialInsurance: true, isHelp: false, hourlyRate: 0, monthlySalary: 300000, adjustments: [] },
      { id: "s2", storeId: "store-1", name: "雲林院", type: "AP", isSocialInsurance: false, isHelp: false, hourlyRate: 1200, monthlySalary: 0, adjustments: [] },
      { id: "s3", storeId: "store-2", name: "古川", type: "AP", isSocialInsurance: true, isHelp: false, hourlyRate: 1300, monthlySalary: 0, adjustments: [] },
    ],
    selectedStoreId: "store-1",
    year,
    month,
    dailyDataRecord,
    offDaySettings: { [year]: Array(12).fill(9) },
    version: 1,
  };
}
