/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef } from "react";
import { useToast } from "./hooks/useToast";
import { useAppData } from "./hooks/useAppData";
import { useAlerts } from "./hooks/useAlerts";
import { usePdfExport } from "./hooks/usePdfExport";
import Sidebar from "./components/layout/Sidebar";
import AlertBar from "./components/layout/AlertBar";
import ShareModal from "./components/layout/ShareModal";
import Toast from "./components/ui/Toast";
import DashboardTab from "./components/tabs/DashboardTab";
import ShiftsTab from "./components/tabs/ShiftsTab";
import ViewTab from "./components/tabs/ViewTab";
import PrintTab from "./components/tabs/PrintTab";
import StatsTab from "./components/tabs/StatsTab";
import StaffTab from "./components/tabs/StaffTab";
import SettingsTab from "./components/tabs/SettingsTab";
import { getDaysArray, getWeeks } from "./utils/date";
import { calcDailyCost } from "./utils/calc";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [weekIdx, setWeekIdx] = useState(0);

  const printRef = useRef<HTMLDivElement>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const allWeeksPrintRef = useRef<HTMLDivElement>(null);

  const { toast, showToast } = useToast();
  const { data, updateData, saving, shareUrl, shareModal, setShareModal, handleShare } =
    useAppData(showToast);

  // ── Derived values ──────────────────────────────────────────────────────────
  const currentDays = data ? getDaysArray(data.year, data.month) : [];
  const weeks = data ? getWeeks(data.year, data.month) : [];
  const currentStaff = data ? data.allStaff.filter((s) => s.storeId === data.selectedStoreId) : [];
  const currentStore = data ? data.stores.find((s) => s.id === data.selectedStoreId) : undefined;
  const offDays = data
    ? (data.offDaySettings[data.year] || Array(12).fill(9))[data.month - 1] ?? 9
    : 9;
  const targetRatio = currentStore?.targetRatio ?? 25;

  const monthDailyData = data
    ? currentDays.map(({ date }) => data.dailyDataRecord[date]).filter(Boolean)
    : [];

  const totalBudget = monthDailyData.reduce((s, d) => s + (d.salesBudget || 0), 0);
  const totalActual = monthDailyData.reduce((s, d) => s + (d.salesActual || 0), 0);
  const totalCost = data
    ? currentStaff.reduce((sum, staff) => {
        return (
          sum +
          monthDailyData.reduce((s, day) => {
            const shift = day.shifts.find((sh) => sh.staffId === staff.id);
            return s + (shift ? calcDailyCost(shift, staff, offDays, day.date) : 0);
          }, 0)
        );
      }, 0)
    : 0;

  const daysWithActual = monthDailyData.filter((d) => d.salesActual > 0).length;
  const forecast =
    daysWithActual > 0 ? (totalActual / daysWithActual) * currentDays.length : 0;
  const forecastRatio = forecast > 0 ? (totalCost / forecast) * 100 : 0;

  const alerts = useAlerts(data!, currentStaff, currentDays);

  const { isExporting, exportToPDF, exportDashboardToPDF } = usePdfExport({
    printRef,
    allWeeksPrintRef,
    dashboardRef,
    data,
    currentStore,
    weekIdx,
    showToast,
  });

  // ── Loading state ────────────────────────────────────────────────────────────
  if (!data) {
    return (
      <div className="flex items-center justify-center h-screen bg-white text-slate-400 font-sans">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-slate-100 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          読み込み中...
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-blue-500/30">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        data={data}
        updateData={updateData}
        saving={saving}
        onShare={handleShare}
      />

      <main className="flex-1 p-8 overflow-y-auto min-w-0">
        <AlertBar alerts={alerts} />

        {activeTab === "dashboard" && (
          <DashboardTab
            data={data}
            currentStore={currentStore}
            currentStaff={currentStaff}
            monthDailyData={monthDailyData}
            offDays={offDays}
            targetRatio={targetRatio}
            totalActual={totalActual}
            totalBudget={totalBudget}
            totalCost={totalCost}
            forecast={forecast}
            forecastRatio={forecastRatio}
            updateData={updateData}
            isExporting={isExporting}
            exportDashboardToPDF={exportDashboardToPDF}
            dashboardRef={dashboardRef}
          />
        )}

        {activeTab === "shifts" && (
          <ShiftsTab
            data={data}
            weeks={weeks}
            weekIdx={weekIdx}
            setWeekIdx={setWeekIdx}
            currentStaff={currentStaff}
            offDays={offDays}
            targetRatio={targetRatio}
            updateData={updateData}
          />
        )}

        {activeTab === "view" && (
          <ViewTab
            data={data}
            weeks={weeks}
            weekIdx={weekIdx}
            setWeekIdx={setWeekIdx}
            currentStaff={currentStaff}
            currentStore={currentStore}
            offDays={offDays}
            targetRatio={targetRatio}
            isExporting={isExporting}
            exportToPDF={exportToPDF}
            printRef={printRef}
          />
        )}

        {activeTab === "print" && (
          <PrintTab
            data={data}
            weeks={weeks}
            weekIdx={weekIdx}
            setWeekIdx={setWeekIdx}
            currentStaff={currentStaff}
            currentStore={currentStore}
            isExporting={isExporting}
            exportToPDF={exportToPDF}
            printRef={printRef}
            allWeeksPrintRef={allWeeksPrintRef}
          />
        )}

        {activeTab === "stats" && (
          <StatsTab
            data={data}
            currentStaff={currentStaff}
            monthDailyData={monthDailyData}
            offDays={offDays}
          />
        )}

        {activeTab === "staff" && (
          <StaffTab
            data={data}
            currentStore={currentStore}
            updateData={updateData}
          />
        )}

        {activeTab === "settings" && (
          <SettingsTab data={data} updateData={updateData} />
        )}
      </main>

      {shareModal && (
        <ShareModal
          shareUrl={shareUrl}
          onClose={() => setShareModal(false)}
          onCopy={() => {
            navigator.clipboard.writeText(shareUrl);
            showToast("URLをコピーしました");
          }}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
}
