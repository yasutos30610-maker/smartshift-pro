import { useState, useEffect, useRef, useCallback } from "react";
import type { AppData } from "../types";
import { loadFromStorage, saveToStorage, generateShareId } from "../lib/storage";
import { buildDefaultData } from "../utils/defaults";
import { getDaysArray } from "../utils/date";

interface UseAppDataResult {
  data: AppData | null;
  updateData: (updater: AppData | ((prev: AppData) => AppData)) => void;
  saving: boolean;
  shareId: string | null;
  shareUrl: string;
  shareModal: boolean;
  setShareModal: (open: boolean) => void;
  handleShare: () => Promise<void>;
}

export function useAppData(showToast: (msg: string, type?: "success" | "error") => void): UseAppDataResult {
  const [data, setData] = useState<AppData | null>(null);
  const [saving, setSaving] = useState(false);
  const [shareId, setShareId] = useState<string | null>(null);
  const [shareModal, setShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleAutoSave = useCallback(
    (newData: AppData) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        setSaving(true);
        const ok = await saveToStorage(newData, shareId);
        setSaving(false);
        if (!ok) showToast("クラウド保存に失敗しました。ネット接続を確認してください", "error");
      }, 1500);
    },
    [shareId, showToast]
  );

  const updateData = useCallback(
    (updater: AppData | ((prev: AppData) => AppData)) => {
      setData((prev) => {
        if (!prev) return prev;
        const next = typeof updater === "function" ? updater(prev) : updater;
        scheduleAutoSave(next);
        return next;
      });
    },
    [scheduleAutoSave]
  );

  // Load data on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get("share");

    (async () => {
      let loaded: AppData | null = null;
      if (sid) {
        loaded = await loadFromStorage(sid);
        if (loaded) {
          setShareId(sid);
          showToast("共有データを読み込みました");
        }
      }
      if (!loaded) {
        loaded = await loadFromStorage();
      }
      setData(loaded || buildDefaultData());
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Ensure daily data exists for current month
  useEffect(() => {
    if (!data) return;
    const days = getDaysArray(data.year, data.month);
    let changed = false;
    const newRecord = { ...data.dailyDataRecord };
    days.forEach(({ date }) => {
      if (!newRecord[date]) {
        newRecord[date] = { date, salesBudget: 500000, salesActual: 0, shifts: [] };
        changed = true;
      }
    });
    if (changed) updateData((d) => ({ ...d, dailyDataRecord: newRecord }));
  }, [data?.year, data?.month]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleShare = async () => {
    setSaving(true);
    let id = shareId;
    if (!id && data) {
      id = await generateShareId(data);
      setShareId(id);
    } else if (id && data) {
      await saveToStorage(data, id);
    }
    setSaving(false);
    const base = window.location.href.split("?")[0];
    const url = `${base}?share=${id}`;
    setShareUrl(url);
    setShareModal(true);
  };

  return { data, updateData, saving, shareId, shareUrl, shareModal, setShareModal, handleShare };
}
