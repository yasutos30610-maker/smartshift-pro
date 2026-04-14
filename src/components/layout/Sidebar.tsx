import {
  LayoutDashboard,
  ClipboardList,
  BarChart3,
  Users,
  Settings,
  Share2,
  CalendarDays,
  CalendarRange,
} from "lucide-react";
import type { AppData, UpdateDataFn } from "../../types";

export const TABS = [
  { id: "dashboard", label: "ダッシュボード",   icon: LayoutDashboard },
  { id: "shifts",    label: "シフト作成",       icon: ClipboardList },
  { id: "view",      label: "シフト(Daily)",    icon: CalendarDays },
  { id: "print",     label: "シフト(Weekly)",   icon: CalendarRange },
  { id: "stats",     label: "労働集計",         icon: BarChart3 },
  { id: "staff",     label: "スタッフ",         icon: Users },
  { id: "settings",  label: "設定",             icon: Settings },
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
    <nav className="
      shrink-0 bg-white border-r border-slate-200
      flex flex-col sticky top-0 h-screen overflow-y-auto
      w-14 lg:w-52
    ">
      {/* ロゴ */}
      <div className="flex items-center gap-2.5 px-3 lg:px-4 py-4 border-b border-slate-200">
        <div className="w-8 h-8 shrink-0 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center font-black text-white text-sm shadow-md">
          S
        </div>
        <div className="hidden lg:block">
          <div className="text-xs font-extrabold text-slate-900 tracking-tight leading-tight">SmartShift</div>
          <div className="text-[10px] text-amber-600 font-bold tracking-[0.15em]">PRO</div>
        </div>
      </div>

      {/* ナビゲーション */}
      <div className="flex-1 py-2 px-2 space-y-0.5">
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              title={tab.label}
              className={`
                flex items-center gap-3 w-full px-2.5 py-2.5 rounded-lg transition-all text-left
                ${active
                  ? "bg-amber-50 text-amber-700"
                  : "text-slate-400 hover:bg-slate-50 hover:text-slate-700"}
              `}
              onClick={() => onTabChange(tab.id)}
            >
              <tab.icon size={18} className="shrink-0" />
              <span className={`hidden lg:block text-xs font-semibold ${active ? "text-amber-700" : ""}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* 店舗セレクタ */}
      <div className="px-2 py-2 border-t border-slate-100">
        <div className="hidden lg:block text-[9px] text-slate-400 font-bold tracking-widest mb-1 px-1 uppercase">店舗</div>
        <select
          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-amber-500 transition-colors"
          value={data.selectedStoreId}
          onChange={(e) => updateData((d) => ({ ...d, selectedStoreId: e.target.value }))}
          title="表示店舗"
        >
          {data.stores.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* 月セレクタ */}
      <div className="px-2 py-2 border-t border-slate-100">
        <div className="hidden lg:block text-[9px] text-slate-400 font-bold tracking-widest mb-1 px-1 uppercase">対象月</div>
        <div className="flex gap-1">
          <select
            className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-1 py-1.5 text-xs text-slate-700 outline-none focus:border-amber-500"
            value={data.year}
            onChange={(e) => updateData((d) => ({ ...d, year: Number(e.target.value) }))}
          >
            {[data.year - 1, data.year, data.year + 1, data.year + 2].map((y) => (
              <option key={y} value={y}>{y}年</option>
            ))}
          </select>
          <select
            className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-1 py-1.5 text-xs text-slate-700 outline-none focus:border-amber-500"
            value={data.month}
            onChange={(e) => updateData((d) => ({ ...d, month: Number(e.target.value) }))}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>{m}月</option>
            ))}
          </select>
        </div>
      </div>

      {/* 共有 + 保存 */}
      <div className="px-2 py-2 border-t border-slate-100">
        <button
          className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all text-xs font-bold"
          onClick={onShare}
          title="URLで共有"
        >
          <Share2 size={13} />
          <span className="hidden lg:inline">共有する</span>
        </button>
        <div className="flex items-center justify-center lg:justify-start gap-1.5 mt-2 px-1">
          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${saving ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
          <span className="hidden lg:block text-[10px] text-slate-400 font-bold">
            {saving ? "保存中..." : "保存済み"}
          </span>
        </div>
      </div>
    </nav>
  );
}
