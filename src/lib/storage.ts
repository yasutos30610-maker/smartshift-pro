import type { AppData } from "../types";
import { supabase } from "./supabase";

// ─── ローカルフォールバック用キー ───────────────────────────────────────────
const LOCAL_KEY = "smartshift_data";

// shift_data テーブルの主キー: "{storeId}_{year}_{month}"
function rowId(data: AppData): string {
  return `${data.selectedStoreId}_${data.year}_${data.month}`;
}

// ─── ロード ────────────────────────────────────────────────────────────────

const SESSION_HINT_KEY = "smartshift_last_session";

type SessionHint = { storeId: string; year: number; month: number };

function loadSessionHint(): SessionHint | null {
  try {
    const raw = localStorage.getItem(SESSION_HINT_KEY);
    return raw ? (JSON.parse(raw) as SessionHint) : null;
  } catch {
    return null;
  }
}

export async function loadFromStorage(shareId: string | null = null): Promise<AppData | null> {
  // 共有スナップショットから読み込み
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

  // ローカルキャッシュを先読み（即時表示用）
  let localData: AppData | null = null;
  const local = localStorage.getItem(LOCAL_KEY);
  if (local) {
    try {
      localData = JSON.parse(local) as AppData;
    } catch { /* 破損は無視 */ }
  }

  // Supabase から最新データを取得（クロスブラウザ対応）
  // ヒント: ローカルデータがあればそのID, なければ前回セッション情報を使用
  const hint: SessionHint | null = localData
    ? { storeId: localData.selectedStoreId, year: localData.year, month: localData.month }
    : loadSessionHint();

  if (hint) {
    try {
      const remote = await syncFromSupabase(hint.storeId, hint.year, hint.month);
      if (remote) {
        // Supabase のデータを正とする（最新の編集を反映）
        localStorage.setItem(LOCAL_KEY, JSON.stringify(remote));
        return remote;
      }
    } catch { /* Supabase が使えない場合はローカルで続行 */ }
  }

  return localData;
}

// ─── セーブ ────────────────────────────────────────────────────────────────

export async function saveToStorage(
  data: AppData,
  shareId: string | null = null
): Promise<boolean> {
  // 共有スナップショットへの保存
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

  // ローカルストレージへ即時保存（オフライン対応）
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
    // 別ブラウザからの復元用ヒントも保存
    localStorage.setItem(SESSION_HINT_KEY, JSON.stringify({
      storeId: data.selectedStoreId,
      year: data.year,
      month: data.month,
    }));
  } catch {
    // ストレージ容量超過などは無視
  }

  // Supabase へ非同期保存
  try {
    const { error } = await supabase.from("shift_data").upsert({
      id: rowId(data),
      store_id: data.selectedStoreId,
      year: data.year,
      month: data.month,
      payload: data,
    });
    if (error) throw error;
    return true;
  } catch (e) {
    console.error("Supabase保存エラー:", e);
    // ローカルには保存済みなので false にはしない
    return true;
  }
}

// ─── 共有ID生成 ────────────────────────────────────────────────────────────

export async function generateShareId(data: AppData): Promise<string> {
  const id = `ss_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  const shared: AppData = { ...data, sharedAt: new Date().toISOString(), shareId: id };
  await saveToStorage(shared, id);
  return id;
}

// ─── Supabaseから最新データを取得（ページ読み込み時に呼ぶ） ────────────────

export async function syncFromSupabase(
  storeId: string,
  year: number,
  month: number
): Promise<AppData | null> {
  try {
    const { data, error } = await supabase
      .from("shift_data")
      .select("payload")
      .eq("id", `${storeId}_${year}_${month}`)
      .single();

    if (error) throw error;
    if (data?.payload) return data.payload as AppData;
  } catch (e) {
    console.error("Supabase同期エラー:", e);
  }
  return null;
}
