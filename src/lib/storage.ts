import type { AppData } from "../types";
import { supabase } from "./supabase";

const LOCAL_KEY = "smartshift_data";
const HINT_KEY   = "smartshift_last_session";

type SessionHint = { storeId: string; year: number; month: number };

function rowId(data: AppData): string {
  return `${data.selectedStoreId}_${data.year}_${data.month}`;
}

function saveHint(data: AppData): void {
  try {
    localStorage.setItem(HINT_KEY, JSON.stringify({
      storeId: data.selectedStoreId,
      year: data.year,
      month: data.month,
    }));
  } catch { /* quota */ }
}

function loadHint(): SessionHint | null {
  try {
    const raw = localStorage.getItem(HINT_KEY);
    return raw ? (JSON.parse(raw) as SessionHint) : null;
  } catch {
    return null;
  }
}

// ─── ロード ─────────────────────────────────────────────────────────────────
export async function loadFromStorage(shareId: string | null = null): Promise<AppData | null> {

  // ① 共有スナップショット
  if (shareId) {
    try {
      const { data, error } = await supabase
        .from("shared_snapshots")
        .select("payload")
        .eq("share_id", shareId)
        .gt("expires_at", new Date().toISOString())
        .single();
      if (error) throw error;
      if (data?.payload) return data.payload as AppData;
    } catch (e) {
      console.error("共有データ読み込みエラー:", e);
    }
    return null;
  }

  // ② ローカルキャッシュ（即時表示用）
  let localData: AppData | null = null;
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) localData = JSON.parse(raw) as AppData;
  } catch { /* 破損 */ }

  // ③ Supabase から最新データを取得（常に試みる）
  const hint: SessionHint | null = localData
    ? { storeId: localData.selectedStoreId, year: localData.year, month: localData.month }
    : loadHint();

  if (hint) {
    // ヒントあり → 特定の行を取得
    try {
      const remote = await _fetchById(hint.storeId, hint.year, hint.month);
      if (remote) {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(remote));
        saveHint(remote);
        return remote;
      }
    } catch { /* Supabase 不可 */ }
  } else {
    // ④ ヒントなし（完全に新しいブラウザ）→ 最新行をフェッチ
    try {
      const { data, error } = await supabase
        .from("shift_data")
        .select("payload")
        .order("year",  { ascending: false })
        .order("month", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data?.payload) {
        const remote = data.payload as AppData;
        localStorage.setItem(LOCAL_KEY, JSON.stringify(remote));
        saveHint(remote);
        return remote;
      }
    } catch { /* Supabase 不可 */ }
  }

  // ⑤ Supabase が使えなければローカルで続行
  return localData;
}

// ─── セーブ ─────────────────────────────────────────────────────────────────
export async function saveToStorage(
  data: AppData,
  shareId: string | null = null
): Promise<boolean> {

  // 共有スナップショット
  if (shareId) {
    try {
      const { error } = await supabase.from("shared_snapshots").upsert({
        share_id: shareId,
        payload: data,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
      if (error) throw error;
      return true;
    } catch (e) {
      console.error("共有保存エラー:", e);
      return false;
    }
  }

  // ローカルへ即時保存
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
    saveHint(data);
  } catch { /* quota */ }

  // Supabase へ保存（必須）
  try {
    const { error } = await supabase.from("shift_data").upsert({
      id: rowId(data),
      store_id: data.selectedStoreId,
      year: data.year,
      month: data.month,
      payload: data,
    });
    if (error) {
      console.error("Supabase保存失敗:", error.message, error.code);
      return false;
    }
    return true;
  } catch (e) {
    console.error("Supabase保存エラー:", e);
    return false;
  }
}

// ─── 共有ID生成 ──────────────────────────────────────────────────────────────
export async function generateShareId(data: AppData): Promise<string> {
  const id = `ss_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  const shared: AppData = { ...data, sharedAt: new Date().toISOString(), shareId: id };
  await saveToStorage(shared, id);
  return id;
}

// ─── Supabase から特定行を取得 ────────────────────────────────────────────────
async function _fetchById(storeId: string, year: number, month: number): Promise<AppData | null> {
  const { data, error } = await supabase
    .from("shift_data")
    .select("payload")
    .eq("id", `${storeId}_${year}_${month}`)
    .maybeSingle();
  if (error) throw error;
  return (data?.payload as AppData) ?? null;
}

export async function syncFromSupabase(
  storeId: string,
  year: number,
  month: number
): Promise<AppData | null> {
  try {
    return await _fetchById(storeId, year, month);
  } catch (e) {
    console.error("Supabase同期エラー:", e);
    return null;
  }
}
