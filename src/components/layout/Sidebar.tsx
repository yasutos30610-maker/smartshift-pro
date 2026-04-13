import {
  LayoutDashboard,
  ClipboardList,
  BarChart3,
  Users,
  Settings,
  Share2,
  Eye,
  RefreshCw,
} from "lucide-react";
import type { AppData, UpdateDataFn } from "../../types";

export const TABS = [
  { id: "dashboard", label: "ダッシュボード", icon: LayoutDashboard },
  { id: "shifts", label: "シフト作成", icon: ClipboardList },
  { id: "view", label: "シフト表示", icon: Eye },
  { id: "print", label: "シフト印刷", icon: RefreshCw },
  { id: "stats", label: "労働集計", icon: BarChart3 },
  { id: "staff", label: "スタッフ", icon: Users },
  { id: "settings", label: "設定", icon: Settings },
] as const;

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  data: AppData;
  updateData: UpdateDataFn;
  saving: boolean;
  onShare: () => void;
}

export default function Sidebar({ activeTab, onTabChange, data, updateData, saving, onShare }: SidebarProps) {
  return (
    <nav className="w-64 bg-white border-r border-slate-200 flex flex-col sticky top-0 h-screen overflow-y-auto shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 p-6 border-b border-slate-200">
        <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center font-black text-white text-lg shadow-lg shadow-blue-500/20">
          S
        </div>
        <div>
          <div className="text-sm font-extrabold text-slate-900 tracking-tight">SmartShift</div>
          <div className="text-[11px] text-blue-600 font-bold tracking-[0.2em]">PRO</div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 p-3 space-y-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-all text-base font-semibold text-left ${
              activeTab === tab.id
                ? "bg-blue-50 text-blue-600"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            }`}
            onClick={() => onTabChange(tab.id)}
          >
            <tab.icon size={20} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Store selector */}
      <div className="p-4 border-t border-slate-200">
        <div className="text-[9px] text-slate-400 font-bold tracking-widest mb-2 uppercase">表示店舗</div>
        <select
          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-500 transition-colors"
          value={data.selectedStoreId}
          onChange={(e) => updateData((d) => ({ ...d, selectedStoreId: e.target.value }))}
        >
          {data.stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Month selector */}
      <div className="p-4 border-t border-slate-200">
        <div className="text-[9px] text-slate-400 font-bold tracking-widest mb-2 uppercase">対象月</div>
        <div className="flex gap-2">
          <select
            className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-xs text-slate-700 outline-none focus:border-blue-500"
            value={data.year}
            onChange={(e) => updateData((d) => ({ ...d, year: Number(e.target.value) }))}
          >
            {[data.year - 1, data.year, data.year + 1, data.year + 2].map((y) => (
              <option key={y} value={y}>
                {y}年
              </option>
            ))}
          </select>
          <select
            className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-xs text-slate-700 outline-none focus:border-blue-500"
            value={data.month}
            onChange={(e) => updateData((d) => ({ ...d, month: Number(e.target.value) }))}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {m}月
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Share + Save indicator */}
      <div className="p-4 border-t border-slate-200">
        <button
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all text-xs font-bold"
          onClick={onShare}
        >
          <Share2 size={14} />
          URLで共有する
        </button>
        <div className="flex items-center gap-2 mt-3 px-1">
          <div className={`w-1.5 h-1.5 rounded-full ${saving ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
          <span className="text-[10px] text-slate-400 font-bold">{saving ? "保存中..." : "保存済み"}</span>
        </div>
      </div>
    </nav>
  );
}
