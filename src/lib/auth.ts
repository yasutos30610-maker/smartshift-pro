import bcrypt from "bcryptjs";
import { supabase } from "./supabase";
import type { AuthUser } from "../types/auth";

const SESSION_KEY = "smartshift_auth";

export async function loginUser(
  username: string,
  password: string
): Promise<{ ok: boolean; user?: AuthUser; error?: string }> {
  const { data: rows, error } = await supabase
    .from("users")
    .select("*")
    .eq("username", username)
    .limit(1);

  if (error || !rows || rows.length === 0) {
    return { ok: false, error: "IDまたはパスワードが正しくありません" };
  }

  const row = rows[0];
  const match = await bcrypt.compare(password, row.password_hash);
  if (!match) {
    return { ok: false, error: "IDまたはパスワードが正しくありません" };
  }

  const { data: assignments } = await supabase
    .from("user_store_assignments")
    .select("store_id")
    .eq("user_id", row.id);

  const assignedStoreIds = (assignments ?? []).map((a: { store_id: string }) => a.store_id);

  const user: AuthUser = {
    id: row.id,
    username: row.username,
    role: row.role,
    displayName: row.display_name,
    assignedStoreIds,
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  return { ok: true, user };
}

export function loadSession(): AuthUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export async function createUser(params: {
  username: string;
  password: string;
  role: AuthUser["role"];
  displayName: string;
  storeIds: string[];
}): Promise<{ ok: boolean; error?: string }> {
  const hash = await bcrypt.hash(params.password, 10);

  const { data: inserted, error } = await supabase
    .from("users")
    .insert({ username: params.username, password_hash: hash, role: params.role, display_name: params.displayName })
    .select()
    .single();

  if (error || !inserted) {
    return { ok: false, error: error?.message ?? "作成に失敗しました" };
  }

  if (params.storeIds.length > 0) {
    await supabase.from("user_store_assignments").insert(
      params.storeIds.map((sid) => ({ user_id: inserted.id, store_id: sid }))
    );
  }

  return { ok: true };
}

export async function updateUserStores(userId: string, storeIds: string[]): Promise<void> {
  await supabase.from("user_store_assignments").delete().eq("user_id", userId);
  if (storeIds.length > 0) {
    await supabase.from("user_store_assignments").insert(
      storeIds.map((sid) => ({ user_id: userId, store_id: sid }))
    );
  }
}

export async function updateUserPassword(userId: string, newPassword: string): Promise<{ ok: boolean; error?: string }> {
  const hash = await bcrypt.hash(newPassword, 10);
  const { error } = await supabase.from("users").update({ password_hash: hash }).eq("id", userId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function deleteUser(userId: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from("users").delete().eq("id", userId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function fetchAllUsers(): Promise<
  Array<AuthUser & { passwordHash: string }>
> {
  const { data: users } = await supabase.from("users").select("*").order("created_at");
  if (!users) return [];

  const { data: assignments } = await supabase.from("user_store_assignments").select("*");
  const assignMap: Record<string, string[]> = {};
  for (const a of assignments ?? []) {
    if (!assignMap[a.user_id]) assignMap[a.user_id] = [];
    assignMap[a.user_id].push(a.store_id);
  }

  return users.map((u) => ({
    id: u.id,
    username: u.username,
    passwordHash: u.password_hash,
    role: u.role,
    displayName: u.display_name,
    assignedStoreIds: assignMap[u.id] ?? [],
  }));
}
