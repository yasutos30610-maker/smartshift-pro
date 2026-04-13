import { Plus, Trash2 } from "lucide-react";
import NumberInput from "../ui/NumberInput";
import type { AppData, UpdateDataFn } from "../../types";

interface SettingsTabProps {
  data: AppData;
  updateData: UpdateDataFn;
}

export default function SettingsTab({ data, updateData }: SettingsTabProps) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <h1 className="text-2xl font-black text-slate-900 mb-6 tracking-tight">設定</h1>

      {/* Store settings */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm mb-6">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
          <span className="font-bold text-sm text-slate-900">店舗設定</span>
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all text-[11px] font-bold"
            onClick={() => updateData((d) => ({ ...d, stores: [...d.stores, { id: `store-${Date.now()}`, name: "新規店舗", targetRatio: 25 }] }))}
          >
            <Plus size={14} /> 追加
          </button>
        </div>
        <div className="p-6 space-y-3">
          {data.stores.map((store) => (
            <div key={store.id} className="flex gap-4 items-center">
              <input
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-500"
                value={store.name}
                onChange={(e) => updateData((d) => ({ ...d, stores: d.stores.map((s) => s.id === store.id ? { ...s, name: e.target.value } : s) }))}
              />
              <span className="text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap">目標人件費率</span>
              <div className="flex items-center gap-2">
                <NumberInput
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 outline-none focus:border-blue-500 w-20 text-right font-mono"
                  value={store.targetRatio}
                  onChange={(val) => updateData((d) => ({ ...d, stores: d.stores.map((s) => s.id === store.id ? { ...s, targetRatio: val } : s) }))}
                />
                <span className="text-xs text-slate-400 font-bold">%</span>
              </div>
              <button
                className="text-slate-300 hover:text-rose-500 transition-colors p-2"
                onClick={() => {
                  if (data.stores.length > 1 && window.confirm("削除しますか？"))
                    updateData((d) => ({ ...d, stores: d.stores.filter((s) => s.id !== store.id) }));
                }}
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Off-day settings */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
          <span className="font-bold text-sm text-slate-900">社員公休設定 — {data.year}年</span>
        </div>
        <div className="p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {Array.from({ length: 12 }, (_, i) => i).map((i) => {
            const yearData = data.offDaySettings[data.year] || Array(12).fill(9);
            return (
              <div key={i} className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col items-center">
                <div className="text-[10px] text-slate-400 font-black tracking-widest mb-3 uppercase">{i + 1}月</div>
                <div className="flex items-center gap-2">
                  <NumberInput
                    className="bg-white border border-slate-200 rounded-lg px-2 py-2 text-lg font-black text-slate-900 outline-none focus:border-blue-500 w-16 text-center"
                    value={yearData[i]}
                    onChange={(val) => updateData((d) => {
                      const yearArr = [...(d.offDaySettings[d.year] || Array(12).fill(9))];
                      yearArr[i] = val;
                      return { ...d, offDaySettings: { ...d.offDaySettings, [d.year]: yearArr } };
                    })}
                  />
                  <span className="text-xs text-slate-400 font-bold">日</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
