import { useState, useEffect } from "react";
import { Plus, Trash2, RefreshCw, CloudUpload, Wifi, WifiOff } from "lucide-react";
import NumberInput from "../ui/NumberInput";
import type { AppData, UpdateDataFn } from "../../types";
import {
  testSupabaseConnection,
  forceSaveToCloud,
  forceLoadFromCloud,
} from "../../lib/storage";

interface SettingsTabProps {
  data: AppData;
  updateData: UpdateDataFn;
}

type SyncStatus = "idle" | "testing" | "saving" | "loading";

export default function SettingsTab({ data, updateData }: SettingsTabProps) {
  const [connOk, setConnOk] = useState<boolean | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncMsg, setSyncMsg] = useState("");

  useEffect(() => {
    testSupabaseConnection().then(({ ok }) => setConnOk(ok));
  }, []);

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

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <h1 className="text-base font-black text-slate-900 mb-3 tracking-tight">設定</h1>

      {/* 店舗設定 */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm mb-4">
        <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <span className="font-bold text-xs text-slate-700">店舗設定</span>
          <button
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-amber-700 hover:border-amber-200 transition-all text-[11px] font-bold"
            onClick={() => updateData((d) => ({
              ...d,
              stores: [...d.stores, { id: `store-${Date.now()}`, name: "新規店舗", targetRatio: 25 }],
            }))}
          >
            <Plus size={12} /> 追加
          </button>
        </div>
        <div className="p-4 space-y-2">
          {data.stores.map((store) => (
            <div key={store.id} className="flex gap-3 items-center">
              <input
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-amber-500"
                value={store.name}
                onChange={(e) => updateData((d) => ({
                  ...d,
                  stores: d.stores.map((s) => s.id === store.id ? { ...s, name: e.target.value } : s),
                }))}
              />
              <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">目標人件費率</span>
              <div className="flex items-center gap-1.5">
                <NumberInput
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-900 outline-none focus:border-amber-500 w-16 text-right font-mono"
                  value={store.targetRatio}
                  onChange={(val) => updateData((d) => ({
                    ...d,
                    stores: d.stores.map((s) => s.id === store.id ? { ...s, targetRatio: val } : s),
                  }))}
                />
                <span className="text-xs text-slate-400 font-bold">%</span>
              </div>
              <button
                className="text-slate-300 hover:text-rose-500 transition-colors p-1"
                onClick={() => {
                  if (data.stores.length > 1 && window.confirm("削除しますか？"))
                    updateData((d) => ({ ...d, stores: d.stores.filter((s) => s.id !== store.id) }));
                }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      </div>

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
