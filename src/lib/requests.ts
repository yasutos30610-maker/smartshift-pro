import type { ShiftRequest, RequestedShift, AppData } from "../types";
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

// shift_data テーブル内の申請専用行の ID
// 通常行は "${storeId}_${year}_${month}"、申請行は "req:${storeId}:${year}:${month}"
function reqRowId(storeId: string, year: number, month: number): string {
  return `req:${storeId}:${year}:${month}`;
}

type ReqPayload = { requests: ShiftRequest[] };

// ─── シフト希望申請 CRUD（shift_data テーブルを共有）────────────────────────

export async function fetchRequests(
  storeId: string,
  year: number,
  month: number
): Promise<ShiftRequest[]> {
  try {
    const { data, error } = await supabase
      .from("shift_data")
      .select("payload")
      .eq("id", reqRowId(storeId, year, month))
      .maybeSingle();
    if (error) throw error;
    const reqs = ((data?.payload as unknown as ReqPayload) ?? {}).requests ?? [];
    saveLocal(storeId, year, month, reqs);
    return reqs;
  } catch {
    return loadLocal(storeId, year, month);
  }
}

export async function submitRequest(req: Omit<ShiftRequest, "id">): Promise<boolean> {
  const newReq: ShiftRequest = {
    ...req,
    id: `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
  };

  // localStorage に先行保存（オフライン対応）
  const localList = loadLocal(req.storeId, req.year, req.month);
  saveLocal(req.storeId, req.year, req.month, [
    ...localList.filter((r) => r.staffId !== req.staffId),
    newReq,
  ]);

  // shift_data テーブルの申請専用行に保存（別テーブル不要）
  try {
    const rowId = reqRowId(req.storeId, req.year, req.month);

    // 既存申請を読み込んでマージ
    const { data: existing } = await supabase
      .from("shift_data")
      .select("payload")
      .eq("id", rowId)
      .maybeSingle();

    const existingReqs = ((existing?.payload as unknown as ReqPayload) ?? {}).requests ?? [];
    const merged = [...existingReqs.filter((r) => r.staffId !== req.staffId), newReq];

    const { error } = await supabase.from("shift_data").upsert({
      id: rowId,
      store_id: req.storeId,
      year: req.year,
      month: req.month,
      payload: { requests: merged } as unknown as AppData,
    });
    if (error) console.warn("申請保存エラー:", error.message);
    return true;
  } catch (e) {
    console.warn("申請Supabase保存失敗:", e);
    return true; // localStorage には保存済み
  }
}

export async function updateRequestStatus(
  id: string,
  status: "pending" | "reflected",
  storeId: string,
  year: number,
  month: number
): Promise<boolean> {
  // localStorage 更新
  const localList = loadLocal(storeId, year, month);
  saveLocal(storeId, year, month, localList.map((r) => r.id === id ? { ...r, status } : r));

  // Supabase 更新
  try {
    const rowId = reqRowId(storeId, year, month);
    const { data: existing } = await supabase
      .from("shift_data")
      .select("payload")
      .eq("id", rowId)
      .maybeSingle();
    if (!existing?.payload) return true;

    const existingReqs = ((existing.payload as unknown as ReqPayload).requests ?? [])
      .map((r) => r.id === id ? { ...r, status } : r);

    await supabase.from("shift_data").upsert({
      id: rowId,
      store_id: storeId,
      year: year,
      month: month,
      payload: { requests: existingReqs } as unknown as AppData,
    });
    return true;
  } catch {
    return true;
  }
}

// ─── ストア一覧をSupabaseから取得（申請専用行を除外）────────────────────────

export async function loadStoresForMonth(
  _year: number,
  _month: number
): Promise<Array<{ storeId: string; storeName: string }>> {
  try {
    // "req:" プレフィックス行は申請専用なので除外
    const { data, error } = await supabase
      .from("shift_data")
      .select("payload")
      .not("id", "like", "req:%")
      .order("updated_at", { ascending: false })
      .limit(1);
    if (error) throw error;
    const payload = (data?.[0]?.payload as { stores?: Array<{ id: string; name: string }> }) ?? null;
    if (!payload?.stores?.length) return [];
    return payload.stores.map((s) => ({ storeId: s.id, storeName: s.name }));
  } catch (e) {
    console.error("ストア一覧取得エラー:", e);
    return [];
  }
}

// ─── 行変換ヘルパー（後方互換）──────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
