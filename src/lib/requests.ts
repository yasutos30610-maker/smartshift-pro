import type { ShiftRequest, RequestedShift } from "../types";
import { supabase } from "./supabase";

// ─── localStorage キー ──────────────────────────────────────────────────────
function localKey(storeId: string, year: number, month: number): string {
  return `smartshift_requests_${storeId}_${year}_${month}`;
}

function loadLocal(storeId: string, year: number, month: number): ShiftRequest[] {
  try {
    const raw = localStorage.getItem(localKey(storeId, year, month));
    return raw ? (JSON.parse(raw) as ShiftRequest[]) : [];
  } catch {
    return [];
  }
}

function saveLocal(storeId: string, year: number, month: number, list: ShiftRequest[]): void {
  try {
    localStorage.setItem(localKey(storeId, year, month), JSON.stringify(list));
  } catch { /* ignore quota errors */ }
}

// ─── shift_requests CRUD（Supabase + localStorage フォールバック）───────────

export async function fetchRequests(
  storeId: string,
  year: number,
  month: number
): Promise<ShiftRequest[]> {
  try {
    const { data, error } = await supabase
      .from("shift_requests")
      .select("*")
      .eq("store_id", storeId)
      .eq("year", year)
      .eq("month", month)
      .order("submitted_at", { ascending: false });
    if (error) throw error;
    const list = (data ?? []).map(rowToRequest);
    // ローカルにもキャッシュ
    saveLocal(storeId, year, month, list);
    return list;
  } catch {
    // Supabase が使えない場合は localStorage から返す
    return loadLocal(storeId, year, month);
  }
}

export async function submitRequest(
  req: Omit<ShiftRequest, "id">
): Promise<boolean> {
  const newReq: ShiftRequest = {
    ...req,
    id: `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
  };

  // まず localStorage に保存（オフライン対応）
  const existing = loadLocal(req.storeId, req.year, req.month);
  // 同じスタッフの既存申請を置き換え
  const updated = [
    ...existing.filter((r) => r.staffId !== req.staffId),
    newReq,
  ];
  saveLocal(req.storeId, req.year, req.month, updated);

  // Supabase にも保存
  try {
    const { error } = await supabase.from("shift_requests").insert({
      id: newReq.id,
      staff_id: req.staffId,
      store_id: req.storeId,
      year: req.year,
      month: req.month,
      shifts: req.shifts,
      submitted_at: req.submittedAt,
      status: req.status,
      resubmit: req.resubmit ?? false,
    });
    if (error) {
      console.warn("Supabase shift_requests 保存エラー:", error.message, error.code);
    }
  } catch (e) {
    console.warn("Supabase接続エラー（localStorage に保存済み）:", e);
  }

  return true; // localStorage に保存できれば成功とみなす
}

export async function updateRequestStatus(
  id: string,
  status: "pending" | "reflected"
): Promise<boolean> {
  // localStorage を更新
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith("smartshift_requests_")) continue;
    try {
      const list = JSON.parse(localStorage.getItem(key) ?? "[]") as ShiftRequest[];
      const idx = list.findIndex((r) => r.id === id);
      if (idx >= 0) {
        list[idx] = { ...list[idx], status };
        localStorage.setItem(key, JSON.stringify(list));
      }
    } catch { /* ignore */ }
  }

  // Supabase も更新（テーブルがない場合は無視）
  try {
    const { error } = await supabase
      .from("shift_requests")
      .update({ status })
      .eq("id", id);
    if (error) console.warn("Supabase status更新スキップ:", error.message);
  } catch (e) {
    console.warn("Supabase接続エラー:", e);
  }

  return true;
}

// ─── ストア一覧をSupabaseから取得（スタッフポータル用）─────────────────────

export async function loadStoresForMonth(
  year: number,
  month: number
): Promise<Array<{ storeId: string; storeName: string }>> {
  try {
    const { data, error } = await supabase
      .from("shift_data")
      .select("store_id, payload")
      .eq("year", year)
      .eq("month", month);
    if (error) throw error;
    return (data ?? []).flatMap((row) => {
      const payload = row.payload as { stores?: Array<{ id: string; name: string }> } | null;
      const store = payload?.stores?.find((s) => s.id === row.store_id);
      if (!store) return [];
      return [{ storeId: row.store_id as string, storeName: store.name }];
    });
  } catch (e) {
    console.error("ストア一覧取得エラー:", e);
    return [];
  }
}

// ─── 行変換ヘルパー ─────────────────────────────────────────────────────────

function rowToRequest(row: Record<string, unknown>): ShiftRequest {
  return {
    id: row.id as string,
    staffId: row.staff_id as string,
    storeId: row.store_id as string,
    year: row.year as number,
    month: row.month as number,
    shifts: (row.shifts as RequestedShift[]) ?? [],
    submittedAt: row.submitted_at as string,
    status: row.status as "pending" | "reflected",
    resubmit: (row.resubmit as boolean) ?? false,
  };
}
