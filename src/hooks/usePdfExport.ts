import { useState } from "react";
import type { RefObject } from "react";
import type { AppData, Store } from "../types";

/**
 * ブラウザネイティブの印刷エンジンを使って PDF 出力する。
 * html2canvas/html2pdf.js は Tailwind v4 の oklch カラーと相性が悪いため廃止。
 * 隠し iframe に要素の HTML を書き込み、contentWindow.print() で印刷ダイアログを開く。
 * ユーザーは「PDF として保存」を選択するだけ。
 */
function printElement(element: HTMLElement): Promise<void> {
  return new Promise((resolve, reject) => {
    // ① 入力値を outerHTML に反映（DOM property は attribute に含まれないため）
    const clone = element.cloneNode(true) as HTMLElement;
    element.querySelectorAll("input").forEach((input, i) => {
      const ci = clone.querySelectorAll("input")[i] as HTMLInputElement | undefined;
      if (ci) ci.setAttribute("value", input.value);
    });

    // ② 現在のページの <link> / <style> をすべてコピー（Tailwind CSS を含む）
    const headHTML = Array.from(
      document.head.querySelectorAll('link[rel="stylesheet"], style')
    )
      .map((el) => el.outerHTML)
      .join("\n");

    // ③ 隠し iframe を作成
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.cssText =
      "position:fixed;left:-9999px;top:0;width:210mm;height:297mm;border:0;visibility:hidden;";
    document.body.appendChild(iframe);

    const frameDoc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (!frameDoc) {
      document.body.removeChild(iframe);
      reject(new Error("iframe の作成に失敗しました"));
      return;
    }

    // ④ iframe に HTML を書き込む
    frameDoc.open();
    frameDoc.write(`<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  ${headHTML}
  <style>
    /* 背景色・色を印刷に反映 */
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    @media print {
      @page { margin: 8mm; size: A4 portrait; }
      body  { margin: 0; background: #fff; }
      /* PDF 出力時に不要な要素を非表示 */
      button, .pdf-hide, [data-pdf-hide] { display: none !important; }
      /* 入力欄は値のみ表示 */
      input {
        border: none !important;
        background: transparent !important;
        box-shadow: none !important;
        outline: none !important;
        padding: 0 !important;
      }
      /* ページブレーク制御 */
      .html2pdf__page-break { page-break-before: always; }
    }
    @media screen {
      body { margin: 0; }
    }
  </style>
</head>
<body>
  ${clone.outerHTML}
</body>
</html>`);
    frameDoc.close();

    // ⑤ ロード完了後に印刷ダイアログを開く
    const doprint = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        reject(e);
      } finally {
        // 印刷ダイアログを閉じた後に iframe を除去
        setTimeout(() => {
          try { document.body.removeChild(iframe); } catch { /* ignore */ }
          resolve();
        }, 2000);
      }
    };

    // onload が発火しない環境のフォールバック
    let loaded = false;
    iframe.onload = () => {
      if (loaded) return;
      loaded = true;
      setTimeout(doprint, 300);
    };
    // 1.5秒後に発火していなければ強制実行
    setTimeout(() => {
      if (!loaded) {
        loaded = true;
        doprint();
      }
    }, 1500);
  });
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
  currentStore: _currentStore,
  weekIdx: _weekIdx,
  showToast,
}: UsePdfExportParams) {
  const [isExporting, setIsExporting] = useState(false);

  async function runPrint(element: HTMLElement) {
    setIsExporting(true);
    try {
      await printElement(element);
      showToast("印刷ダイアログを開きました（「PDFとして保存」を選択してください）");
    } catch (err) {
      console.error("Print Error:", err);
      showToast("印刷に失敗しました", "error");
    } finally {
      setIsExporting(false);
    }
  }

  const exportToPDF = async (allWeeks = false) => {
    if (isExporting || !data) return;
    const element = allWeeks ? allWeeksPrintRef.current : printRef.current;
    if (!element) return;
    await runPrint(element);
  };

  const exportDashboardToPDF = async () => {
    if (isExporting || !data || !dashboardRef.current) return;
    await runPrint(dashboardRef.current);
  };

  return { isExporting, exportToPDF, exportDashboardToPDF };
}
