import { useState } from "react";
import type { RefObject } from "react";
import type { AppData, Store } from "../types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _html2pdf: any = null;
async function getHtml2pdf() {
  if (!_html2pdf) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m: any = await import("html2pdf.js");
    _html2pdf = m.default ?? m;
  }
  return _html2pdf;
}

/** タイムアウト付きPromise — html2canvas がハングしたときの安全弁 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("PDF生成がタイムアウトしました")), ms)
    ),
  ]);
}

/**
 * oklch / oklab 等 html2canvas が解析できない色を
 * ブラウザに計算させて rgb() に変換し、インラインスタイルで上書き。
 * 戻り値は restore 関数（キャプチャ後に必ず呼ぶこと）。
 */
function flattenColors(element: HTMLElement): () => void {
  const PROPS = [
    "color",
    "background-color",
    "border-top-color",
    "border-right-color",
    "border-bottom-color",
    "border-left-color",
  ];
  type Entry = { el: HTMLElement; prop: string; prev: string };
  const list: Entry[] = [];

  const els = [element, ...Array.from(element.querySelectorAll<HTMLElement>("*"))];
  els.forEach((el) => {
    if (!(el instanceof HTMLElement)) return;
    const computed = window.getComputedStyle(el);
    PROPS.forEach((prop) => {
      const val = computed.getPropertyValue(prop);
      // getComputedStyle は必ず rgb/rgba を返す
      if (val && val.startsWith("rgb")) {
        list.push({ el, prop, prev: el.style.getPropertyValue(prop) });
        el.style.setProperty(prop, val, "important");
      }
    });
  });

  return () => {
    list.forEach(({ el, prop, prev }) => {
      if (prev === "") el.style.removeProperty(prop);
      else el.style.setProperty(prop, prev);
    });
  };
}

/**
 * -left-[9999px] などオフスクリーンにある要素をキャプチャできるよう
 * 一時的に画面左上（z-index: -9999）へ移動。
 * 戻り値は restore 関数。
 */
function showForCapture(element: HTMLElement): () => void {
  const rect = element.getBoundingClientRect();
  // 既に可視範囲にあれば何もしない
  if (rect.left > -50 && rect.top > -50 && rect.width > 0) {
    return () => {};
  }
  const prevStyle = element.getAttribute("style") ?? "";
  element.style.cssText = [
    prevStyle,
    "position:fixed!important",
    "left:0!important",
    "top:0!important",
    "z-index:-9999!important",
    "visibility:visible!important",
    "pointer-events:none!important",
  ].join(";");
  return () => {
    if (prevStyle) element.setAttribute("style", prevStyle);
    else element.removeAttribute("style");
  };
}

/** クローン後に注入するCSSの最小セット */
function buildOnClone() {
  return (clonedDoc: Document) => {
    const s = clonedDoc.createElement("style");
    s.textContent = `
      * { transition:none!important; animation:none!important; color-scheme:light!important; }
      .pdf-hide { display:none!important; }
      .fixed, .sticky { position:static!important; }
    `;
    clonedDoc.head.appendChild(s);
  };
}

// ─────────────────────────────────────────────────────────────
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

  /** 共通エクスポート処理 */
  async function runExport(
    element: HTMLElement,
    filename: string,
    margin: number | [number, number] = 0
  ) {
    setIsExporting(true);

    // 1. オフスクリーン要素の一時可視化
    const restoreVisibility = showForCapture(element);
    // 2. oklch → rgb 変換（html2canvas が解析できるよう事前処理）
    const restoreColors = flattenColors(element);
    // 3. PDF用クラス追加
    element.classList.add("pdf-export");

    // DOM 反映を待つ
    await new Promise<void>((r) => setTimeout(r, 150));

    const opt = {
      margin,
      filename,
      image: { type: "jpeg", quality: 0.95 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false,
        backgroundColor: "#ffffff",
        onclone: buildOnClone(),
      },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["css", "legacy"] },
    };

    try {
      const lib = await getHtml2pdf();
      await withTimeout(lib().set(opt).from(element).save(), 60_000);
      showToast("PDFを出力しました");
    } catch (err) {
      console.error("PDF Export Error:", err);
      showToast("PDF出力に失敗しました", "error");
    } finally {
      // 必ず復元・アンロック
      element.classList.remove("pdf-export");
      restoreColors();
      restoreVisibility();
      setIsExporting(false);
    }
  }

  const exportToPDF = async (allWeeks = false) => {
    if (isExporting || !data) return;
    const element = allWeeks ? allWeeksPrintRef.current : printRef.current;
    if (!element) return;

    const y = data.year;
    const m = String(data.month).padStart(2, "0");
    const filename = allWeeks
      ? `shift_${y}_${m}_全週.pdf`
      : `shift_${y}_${m}_第${weekIdx + 1}週.pdf`;

    await runExport(element, filename);
  };

  const exportDashboardToPDF = async () => {
    if (isExporting || !data || !dashboardRef.current) return;
    const y = data.year;
    const m = String(data.month).padStart(2, "0");
    const filename = `dashboard_${currentStore?.name ?? "store"}_${y}_${m}.pdf`;
    await runExport(dashboardRef.current, filename, [10, 10]);
  };

  return { isExporting, exportToPDF, exportDashboardToPDF };
}
