// ─── SmartShift PRO — Type Definitions ───────────────────────────────────────

export interface Adjustment {
  start: string;
  end: string;
  hourly: number;
  daily: number;
}

export interface Staff {
  id: string;
  storeId: string;
  name: string;
  type: "社員" | "AP";
  isSocialInsurance: boolean;
  isHelp: boolean;
  hourlyRate: number;
  monthlySalary: number;
  adjustments: Adjustment[];
  pass?: string;
}

export interface RequestedShift {
  date: string;
  inTime: string;
  outTime: string;
}

export interface ShiftRequest {
  id: string;
  staffId: string;
  storeId: string;
  year: number;
  month: number;
  shifts: RequestedShift[];
  submittedAt: string;
  status: "pending" | "reflected";
  resubmit?: boolean;
}

export interface Store {
  id: string;
  name: string;
  targetRatio: number;
}

export interface Shift {
  storeId?: string;
  staffId: string;
  inTime: string;
  outTime: string;
  breakMinutes: number;
  isHelp: boolean;
  requestedInTime?: string;
  requestedOutTime?: string;
}

export interface DailyData {
  date: string;
  salesBudget: number;
  salesActual: number;
  shifts: Shift[];
}

export interface AppData {
  stores: Store[];
  allStaff: Staff[];
  selectedStoreId: string;
  year: number;
  month: number;
  dailyDataRecord: Record<string, DailyData>;
  offDaySettings: Record<number, number[]>;
  version: number;
  sharedAt?: string;
  shareId?: string;
  confirmedDates?: string[];
}

export interface DayInfo {
  date: string;
  day: number;
  dow: number;
}

export interface Alert {
  name: string;
  msg: string;
}

export interface ToastState {
  msg: string;
  type: "success" | "error";
}

export type UpdateDataFn = (updater: AppData | ((prev: AppData) => AppData)) => void;
