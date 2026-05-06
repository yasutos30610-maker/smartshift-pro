import { useState, useEffect, useRef, useCallback } from "react";
import type { AppData } from "../types";
import { loadFromStorage, saveToStorage, generateShareId, syncFromSupabase, persistLocalCache } from "../lib/storage";
import { buildDefaultData } from "../utils/defaults";
import { getDaysArray } from "../utils/date";

// 店舗データが newStoreId に対して正規のものかを判定する
// _savedForStore フィールド（保存時に付与）で確実に判定し、
// 旧データはシフト storeId とサスペクト salesBudget でヒューリスティック判定する
function isLegitimateForStore(storeData: AppData, storeId: string): boolean {
  // 保存修正後: 明示的なマーカーがある場合
  if (storeData._savedForStore === storeId) return true;
  if (storeData._savedForStore && storeData._savedForStore !== storeId) return false;

  // 保存修正前の旧データ: シフトの storeId でヒューリスティック判定
  const allShifts = Object.values(storeData.dailyDataRecord).flatMap((d) => d.shifts);
  const hasOwn = allShifts.some((sh) => !sh.storeId || sh.storeId === storeId);
  const hasForeign = allShifts.some((sh) => sh.storeId && sh.storeId !== storeId);

  if (hasForeign && !hasOwn) return false; // 他店のシフトのみ = 汚染
  if (hasOwn) return true;                  // 自店シフトあり = 正規

  // シフトなしの場合: salesBudget が 0 以外ならば汚染の疑い
  const hasBudgets = Object.values(storeData.dailyDataRecord).some((d) => (d.salesBudget ?? 0) > 0);
  return !hasBudgets;
}

interface UseAppDataResult {
  data: AppData | null;
  updateData: (updater: AppData | ((prev: AppData) => AppData)) => void;
  saving: boolean;
  storeSwitching: boolean;
  switchStore: (newStoreId: string) => Promise<void>;
  flushSave: () => Promise<boolean>;
  shareId: string | null;
  shareUrl: string;
  shareModal: boolean;
  setShareModal: (open: boolean) => void;
  handleShare: () => Promise<void>;
}

export function useAppData(showToast: (msg: string, type?: "success" | "error") => void): UseAppDataResult {
  const [data, setData] = useState<AppData | null>(null);
  const [saving, setSaving] = useState(false);
  const [storeSwitching, setStoreSwitching] = useState(false);
  const [shareId, setShareId] = useState<string | null>(null);
  const [shareModal, setShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataRef = useRef<AppData | null>(null);
  dataRef.current = data;
  const shareIdRef = useRef<string | null>(null);
  shareIdRef.current = shareId;

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

  // 対象月 or 店舗切替時に日別データの存在を保証する
  useEffect(() => {
    if (!data) return;
    const days = getDaysArray(data.year, data.month);
    let changed = false;
    const newRecord = { ...data.dailyDataRecord };
    days.forEach(({ date }) => {
      if (!newRecord[date]) {
        newRecord[date] = { date, salesBudget: 0, salesActual: 0, shifts: [] };
        changed = true;
      }
    });
    if (changed) updateData((d) => ({ ...d, dailyDataRecord: newRecord }));
  }, [data?.year, data?.month, data?.selectedStoreId]); // eslint-disable-line react-hooks/exhaustive-deps

  const switchStore = useCallback(async (newStoreId: string) => {
    const currentData = dataRef.current;
    const currentShareId = shareIdRef.current;
    if (!currentData || currentData.selectedStoreId === newStoreId) return;
    setStoreSwitching(true);

    // 現在の店舗データを先にフラッシュ保存（_savedForStore が付与される）
    if (saveTimer.current) clearTimeout(saveTimer.current);
    await saveToStorage(currentData, currentShareId);

    // 新しい店舗のデータを Supabase から取得
    const newStoreData = await syncFromSupabase(newStoreId, currentData.year, currentData.month);

    const buildNext = (prev: AppData): AppData => {
      if (newStoreData && isLegitimateForStore(newStoreData, newStoreId)) {
        // 正規データ: そのまま使用
        return {
          ...prev,
          selectedStoreId: newStoreId,
          dailyDataRecord: newStoreData.dailyDataRecord,
          confirmedDates: newStoreData.confirmedDates ?? {},
          importedHelpKeys: newStoreData.importedHelpKeys ?? {},
          offDaySettings: newStoreData.offDaySettings ?? prev.offDaySettings,
        };
      }
      // 汚染データ or 未設定: 空状態で開始（その後の useEffect で日別初期化される）
      return {
        ...prev,
        selectedStoreId: newStoreId,
        dailyDataRecord: {},
        confirmedDates: {},
        importedHelpKeys: {},
      };
    };

    const next = buildNext(currentData);
    persistLocalCache(next);
    setData((prev) => (prev ? buildNext(prev) : prev));
    setStoreSwitching(false);
  }, []);

  const flushSave = useCallback(async (): Promise<boolean> => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    if (!dataRef.current) return false;
    setSaving(true);
    const ok = await saveToStorage(dataRef.current, shareIdRef.current);
    setSaving(false);
    if (!ok) showToast("クラウド保存に失敗しました。ネット接続を確認してください", "error");
    return ok;
  }, [showToast]);

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

  return { data, updateData, saving, storeSwitching, switchStore, flushSave, shareId, shareUrl, shareModal, setShareModal, handleShare };
}
