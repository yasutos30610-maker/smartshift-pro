import { useState } from "react";
import type { RefObject } from "react";
import type { AppData, Store } from "../types";

// html2pdf has no types — minimal declaration
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const html2pdf: any;

function buildOnClone() {
  return (clonedDoc: Document) => {
    const style = clonedDoc.createElement("style");
    style.innerHTML = `
      * {
        transition: none !important;
        animation: none !important;
        color-interpolation: sRGB !important;
        color-scheme: light !important;
      }
      .pdf-export, .pdf-export * {
        background-image: none !important;
        filter: none !important;
        backdrop-filter: none !important;
        box-shadow: none !important;
        text-shadow: none !important;
        transform: none !important;
        visibility: visible !important;
      }
      .pdf-export .fixed, .pdf-export .sticky { position: static !important; }
    `;
    clonedDoc.head.appendChild(style);

    const all = clonedDoc.getElementsByTagName("*");
    for (let i = 0; i < all.length; i++) {
      const el = all[i] as HTMLElement;
      if (el.style) {
        const props = ["color", "backgroundColor", "borderColor", "fill", "stroke"] as const;
        props.forEach((prop) => {
          const val = (el.style as unknown as Record<string, string>)[prop];
          if (val && (val.includes("oklab") || val.includes("oklch"))) {
            el.style.setProperty(prop, "#888888", "important");
          }
        });
      }
    }
  };
}

interface UsePdfExportParams {
  printRef: RefObject<HTMLDivElement | null>;
  allWeeksPrintRef: RefObject<HTMLDivElement | null>;
  dashboardRef: RefObject<HTMLDivElement | null>;
  data: AppData | null;
  currentStore: Store | undefined;
  weekIdx: number;
  showToast: (msg: string, type?: "success" | "error") => void;
}

export function usePdfExport({
  printRef,
  allWeeksPrintRef,
  dashboardRef,
  data,
  currentStore,
  weekIdx,
  showToast,
}: UsePdfExportParams) {
  const [isExporting, setIsExporting] = useState(false);

  const exportToPDF = async (allWeeks = false) => {
    if (isExporting || !data) return;
    const element = allWeeks ? allWeeksPrintRef.current : printRef.current;
    if (!element) return;

    setIsExporting(true);
    element.classList.add("pdf-export");

    const opt = {
      margin: 0,
      filename: allWeeks
        ? `shift_full_month_${data.year}_${data.month}.pdf`
        : `shift_week_${weekIdx + 1}_${data.year}_${data.month}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true, logging: false, backgroundColor: "#ffffff", onclone: buildOnClone() },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["avoid-all", "css", "legacy"] },
    };

    setTimeout(async () => {
      try {
        const lib = typeof html2pdf === "function" ? html2pdf : html2pdf.default;
        await lib().set(opt).from(element).save();
        element.classList.remove("pdf-export");
        showToast("シフトを出力しました");
      } catch (error) {
        console.error("PDF Export Error:", error);
        element.classList.remove("pdf-export");
        showToast("出力に失敗しました", "error");
      } finally {
        setIsExporting(false);
      }
    }, 200);
  };

  const exportDashboardToPDF = () => {
    if (!dashboardRef.current || isExporting || !data) return;
    const element = dashboardRef.current;

    setIsExporting(true);
    element.classList.add("pdf-export");

    const opt = {
      margin: [10, 10] as [number, number],
      filename: `dashboard_${currentStore?.name}_${data.year}_${data.month}.pdf`,
      image: { type: "jpeg" as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: "#ffffff", onclone: buildOnClone() },
      jsPDF: { unit: "mm" as const, format: "a4" as const, orientation: "portrait" as const },
      pagebreak: { mode: ["avoid-all", "css", "legacy"] },
    };

    setTimeout(async () => {
      try {
        const lib = typeof html2pdf === "function" ? html2pdf : html2pdf.default;
        await lib().set(opt).from(element).save();
        element.classList.remove("pdf-export");
        setIsExporting(false);
        showToast("ダッシュボードを出力しました");
      } catch (err) {
        console.error("PDF Export error:", err);
        element.classList.remove("pdf-export");
        setIsExporting(false);
        showToast("出力に失敗しました", "error");
      }
    }, 200);
  };

  return { isExporting, exportToPDF, exportDashboardToPDF };
}
