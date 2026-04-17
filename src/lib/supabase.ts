import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase環境変数が設定されていません。.env.local を確認してください。");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ─── テーブル型定義 ─────────────────────────────────────────────────────────

export interface ShiftDataRow {
  id: string;
  store_id: string;
  year: number;
  month: number;
  payload: unknown;
  created_at: string;
  updated_at: string;
}

export interface SharedSnapshotRow {
  share_id: string;
  payload: unknown;
  created_at: string;
  expires_at: string;
}

export interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  role: "admin" | "area_manager" | "store_manager";
  display_name: string;
  created_at: string;
}

export interface UserStoreAssignmentRow {
  id: string;
  user_id: string;
  store_id: string;
}
