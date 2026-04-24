import { useState, useEffect } from "react";
import { Plus, Trash2, RefreshCw, CloudUpload, Wifi, WifiOff, UserPlus, Pencil, X, Check } from "lucide-react";
import NumberInput from "../ui/NumberInput";
import type { AppData, UpdateDataFn } from "../../types";
import type { AuthUser, UserRole } from "../../types/auth";
import { useAuth } from "../../contexts/AuthContext";
import {
  testSupabaseConnection,
  forceSaveToCloud,
  forceLoadFromCloud,
} from "../../lib/storage";
import {
  fetchAllUsers,
  createUser,
  deleteUser,
  updateUserStores,
  updateUserPassword,
} from "../../lib/auth";

interface SettingsTabProps {
  data: AppData;
  updateData: UpdateDataFn;
}

type SyncStatus = "idle" | "testing" | "saving" | "loading";

const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Admin",
  area_manager: "エリアMgr",
  store_manager: "店舗Mgr",
};

interface UserWithHash extends AuthUser {
  passwordHash: string;
}

interface NewUserForm {
  username: string;
  password: string;
  displayName: string;
  role: UserRole;
  storeIds: string[];
}

const EMPTY_FORM: NewUserForm = {
  username: "",
  password: "",
  displayName: "",
  role: "store_manager",
  storeIds: [],
};

export default function SettingsTab({ data, updateData }: SettingsTabProps) {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";

  const [connOk, setConnOk] = useState<boolean | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncMsg, setSyncMsg] = useState("");

  // ユーザー管理ステート
  const [users, setUsers] = useState<UserWithHash[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState<NewUserForm>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [formSaving, setFormSaving] = useState(false);
  const [editingPwdId, setEditingPwdId] = useState<string | null>(null);
  const [newPwd, setNewPwd] = useState("");

  useEffect(() => {
    testSupabaseConnection().then(({ ok }) => setConnOk(ok));
  }, []);

  useEffect(() => {
    if (isAdmin) loadUsers();
  }, [isAdmin]);

  const loadUsers = async () => {
    setUsersLoading(true);
    const list = await fetchAllUsers();
    setUsers(list);
    setUsersLoading(false);
  };

  const handleForceSave = async () => {
    setSyncStatus("saving");
    setSyncMsg("");
    const { ok, message } = await forceSaveToCloud(data);
    setSyncStatus("idle");
    setSyncMsg(message);
    if (ok) setConnOk(true);
  };

  const handleForceLoad = async () => {
    setSyncStatus("loading");
    setSyncMsg("");
    const { data: loaded, message } = await forceLoadFromCloud(
      data.selectedStoreId,
      data.year,
      data.month
    );
    setSyncStatus("idle");
    setSyncMsg(message);
    if (loaded) updateData(loaded);
  };

  const handleAddUser = async () => {
    if (!form.username || !form.password || !form.displayName) {
      setFormError("全項目を入力してください");
      return;
    }
    if (form.role !== "admin" && form.storeIds.length === 0) {
      setFormError("店舗を1つ以上選択してください");
      return;
    }
    setFormSaving(true);
    setFormError("");
    const result = await createUser(form);
    setFormSaving(false);
    if (!result.ok) {
      setFormError(result.error ?? "作成に失敗しました");
      return;
    }
    setShowAddForm(false);
    setForm(EMPTY_FORM);
    await loadUsers();
  };

  const handleDeleteUser = async (u: UserWithHash) => {
    if (u.id === currentUser?.id) {
      alert("自分自身は削除できません");
      return;
    }
    if (!window.confirm(`「${u.displayName}」を削除しますか？`)) return;
    await deleteUser(u.id);
    await loadUsers();
  };

  const handleUpdateStores = async (userId: string, storeIds: string[]) => {
    await updateUserStores(userId, storeIds);
    await loadUsers();
  };

  const handleUpdatePassword = async (userId: string) => {
    if (!newPwd) return;
    await updateUserPassword(userId, newPwd);
    setEditingPwdId(null);
    setNewPwd("");
  };

  const toggleStoreInForm = (storeId: string) => {
    setForm((f) => ({
      ...f,
      storeIds: f.storeIds.includes(storeId)
        ? f.storeIds.filter((id) => id !== storeId)
        : [...f.storeIds, storeId],
    }));
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <h1 className="text-base font-black text-slate-900 mb-3 tracking-tight">設定</h1>

      {/* 店舗設定 */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm mb-4">
        <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <span className="font-bold text-xs text-slate-700">店舗設定</span>
          {isAdmin && (
            <button
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-amber-700 hover:border-amber-200 transition-all text-[11px] font-bold"
              onClick={() => updateData((d) => ({
                ...d,
                stores: [...d.stores, { id: `store-${Date.now()}`, name: "新規店舗", targetRatio: 25 }],
              }))}
            >
              <Plus size={12} /> 追加
            </button>
          )}
        </div>
        <div className="p-4 space-y-2">
          {data.stores.map((store) => (
            <div key={store.id} className="flex gap-3 items-center">
              <input
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-amber-500 disabled:opacity-60"
                value={store.name}
                disabled={!isAdmin}
                placeholder="正式名称"
                onChange={(e) => updateData((d) => ({
                  ...d,
                  stores: d.stores.map((s) => s.id === store.id ? { ...s, name: e.target.value } : s),
                }))}
              />
              <input
                className="w-36 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-amber-500 disabled:opacity-60"
                value={store.shortName ?? ""}
                disabled={!isAdmin}
                placeholder="短縮名（例: 渋谷センター街）"
                onChange={(e) => updateData((d) => ({
                  ...d,
                  stores: d.stores.map((s) => s.id === store.id ? { ...s, shortName: e.target.value || undefined } : s),
                }))}
              />
              <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">目標人件費率</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-900 outline-none focus:border-amber-500 w-20 text-right font-mono disabled:opacity-60"
                  value={store.targetRatio}
                  disabled={!isAdmin}
                  onChange={(e) => updateData((d) => ({
                    ...d,
                    stores: d.stores.map((s) => s.id === store.id ? { ...s, targetRatio: parseFloat(e.target.value) || 0 } : s),
                  }))}
                />
                <span className="text-xs text-slate-400 font-bold">%</span>
              </div>
              {isAdmin && (
                <button
                  className="text-slate-300 hover:text-rose-500 transition-colors p-1"
                  onClick={() => {
                    if (data.stores.length > 1 && window.confirm("削除しますか？"))
                      updateData((d) => ({ ...d, stores: d.stores.filter((s) => s.id !== store.id) }));
                  }}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ユーザー管理（adminのみ） */}
      {isAdmin && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm mb-4">
          <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <span className="font-bold text-xs text-slate-700">ユーザー管理</span>
            <button
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-amber-700 hover:border-amber-200 transition-all text-[11px] font-bold"
              onClick={() => { setShowAddForm((v) => !v); setFormError(""); setForm(EMPTY_FORM); }}
            >
              <UserPlus size={12} /> 追加
            </button>
          </div>

          {/* 追加フォーム */}
          {showAddForm && (
            <div className="px-4 py-3 border-b border-slate-100 bg-amber-50/50 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">ユーザーID</label>
                  <input
                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-amber-500"
                    placeholder="例: 1234"
                    value={form.username}
                    onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">パスワード</label>
                  <input
                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-amber-500"
                    placeholder="例: 1234"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">表示名</label>
                  <input
                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-amber-500"
                    placeholder="例: 渋谷店 田中"
                    value={form.displayName}
                    onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">役職</label>
                  <select
                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-amber-500"
                    value={form.role}
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole, storeIds: [] }))}
                  >
                    <option value="admin">Admin</option>
                    <option value="area_manager">エリアマネージャー</option>
                    <option value="store_manager">店舗マネージャー</option>
                  </select>
                </div>
              </div>
              {form.role !== "admin" && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">担当店舗</label>
                  <div className="flex flex-wrap gap-1.5">
                    {data.stores.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleStoreInForm(s.id)}
                        className={`px-2 py-1 rounded-lg border text-[11px] font-bold transition-all ${
                          form.storeIds.includes(s.id)
                            ? "bg-amber-500 border-amber-500 text-white"
                            : "bg-white border-slate-200 text-slate-600 hover:border-amber-300"
                        }`}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {formError && <p className="text-[11px] text-rose-600 font-bold">{formError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleAddUser}
                  disabled={formSaving}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-[11px] font-bold hover:bg-amber-600 disabled:opacity-40 transition-all"
                >
                  {formSaving ? "作成中..." : "作成する"}
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 text-[11px] font-bold hover:bg-slate-50 transition-all"
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}

          {/* ユーザー一覧 */}
          <div className="divide-y divide-slate-100">
            {usersLoading ? (
              <div className="p-4 text-center text-xs text-slate-400">読み込み中...</div>
            ) : users.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">ユーザーなし</div>
            ) : (
              users.map((u) => (
                <div key={u.id} className="px-4 py-3 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800">{u.displayName}</span>
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                          u.role === "admin"
                            ? "bg-amber-100 text-amber-700"
                            : u.role === "area_manager"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-slate-100 text-slate-600"
                        }`}>
                          {ROLE_LABEL[u.role]}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">ID: {u.username}</div>
                    </div>
                    <button
                      onClick={() => { setEditingPwdId(editingPwdId === u.id ? null : u.id); setNewPwd(""); }}
                      title="パスワード変更"
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-amber-600 hover:border-amber-200 transition-all"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(u)}
                      title="削除"
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-200 transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>

                  {/* パスワード変更インライン */}
                  {editingPwdId === u.id && (
                    <div className="flex gap-2 items-center">
                      <input
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-amber-500"
                        placeholder="新パスワード"
                        value={newPwd}
                        onChange={(e) => setNewPwd(e.target.value)}
                      />
                      <button
                        onClick={() => handleUpdatePassword(u.id)}
                        className="p-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-all"
                      >
                        <Check size={12} />
                      </button>
                      <button
                        onClick={() => { setEditingPwdId(null); setNewPwd(""); }}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 transition-all"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}

                  {/* 担当店舗（admin以外） */}
                  {u.role !== "admin" && (
                    <div className="flex flex-wrap gap-1">
                      {data.stores.map((s) => {
                        const assigned = u.assignedStoreIds.includes(s.id);
                        return (
                          <button
                            key={s.id}
                            onClick={() => {
                              const next = assigned
                                ? u.assignedStoreIds.filter((id) => id !== s.id)
                                : [...u.assignedStoreIds, s.id];
                              handleUpdateStores(u.id, next);
                            }}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-all ${
                              assigned
                                ? "bg-amber-500 border-amber-500 text-white"
                                : "bg-white border-slate-200 text-slate-400 hover:border-amber-300"
                            }`}
                          >
                            {s.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* クラウド同期 */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm mb-4">
        <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
          {connOk === null ? (
            <RefreshCw size={12} className="text-slate-400 animate-spin" />
          ) : connOk ? (
            <Wifi size={12} className="text-emerald-500" />
          ) : (
            <WifiOff size={12} className="text-rose-500" />
          )}
          <span className="font-bold text-xs text-slate-700">クラウド同期</span>
          {connOk !== null && (
            <span className={`text-[10px] font-bold ${connOk ? "text-emerald-600" : "text-rose-600"}`}>
              {connOk ? "接続中" : "接続不可"}
            </span>
          )}
        </div>
        <div className="p-4 space-y-3">
          {syncMsg && (
            <p className={`text-[11px] font-bold px-3 py-2 rounded-lg ${
              syncMsg.includes("失敗") || syncMsg.includes("エラー") || syncMsg.includes("見つかりません")
                ? "bg-rose-50 text-rose-700"
                : "bg-emerald-50 text-emerald-700"
            }`}>
              {syncMsg}
            </p>
          )}
          <div className="flex gap-2">
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-amber-700 hover:border-amber-200 transition-all text-[11px] font-bold disabled:opacity-40"
              onClick={handleForceSave}
              disabled={syncStatus !== "idle"}
            >
              <CloudUpload size={12} />
              {syncStatus === "saving" ? "保存中..." : "今すぐ保存"}
            </button>
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-amber-700 hover:border-amber-200 transition-all text-[11px] font-bold disabled:opacity-40"
              onClick={handleForceLoad}
              disabled={syncStatus !== "idle"}
            >
              <RefreshCw size={12} className={syncStatus === "loading" ? "animate-spin" : ""} />
              {syncStatus === "loading" ? "取得中..." : "クラウドから再取得"}
            </button>
          </div>
          <p className="text-[10px] text-slate-400">
            別端末でデータが反映されない場合は「今すぐ保存」→ 別端末で「クラウドから再取得」を押してください
          </p>
        </div>
      </div>

      {/* 社員公休設定 */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50">
          <span className="font-bold text-xs text-slate-700">社員公休設定 — {data.year}年</span>
        </div>
        <div className="p-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {Array.from({ length: 12 }, (_, i) => i).map((i) => {
            const yearData = data.offDaySettings[data.year] || Array(12).fill(9);
            return (
              <div key={i} className="bg-slate-50 rounded-lg p-3 border border-slate-200 flex flex-col items-center">
                <div className="text-[10px] text-slate-400 font-black tracking-wider mb-2">{i + 1}月</div>
                <div className="flex items-center gap-1">
                  <NumberInput
                    className="bg-white border border-slate-200 rounded px-2 py-1 text-sm font-black text-slate-900 outline-none focus:border-amber-500 w-12 text-center"
                    value={yearData[i]}
                    onChange={(val) => updateData((d) => {
                      const yearArr = [...(d.offDaySettings[d.year] || Array(12).fill(9))];
                      yearArr[i] = val;
                      return { ...d, offDaySettings: { ...d.offDaySettings, [d.year]: yearArr } };
                    })}
                  />
                  <span className="text-[10px] text-slate-400 font-bold">日</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
