import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import NumberInput from "../ui/NumberInput";
import type { AppData, Store, Staff, UpdateDataFn } from "../../types";

interface StaffTabProps {
  data: AppData;
  currentStore: Store | undefined;
  updateData: UpdateDataFn;
}

function staffGroup(s: Staff): number {
  if (s.isRetired) return 2;
  return s.type === "社員" ? 0 : 1;
}

export default function StaffTab({ data, currentStore, updateData }: StaffTabProps) {
  const [expandedStaffId, setExpandedStaffId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const currentStaff = data.allStaff
    .filter((s) => s.storeId === data.selectedStoreId)
    .sort((a, b) => {
      if (staffGroup(a) !== staffGroup(b)) return staffGroup(a) - staffGroup(b);
      return a.name.localeCompare(b.name, "ja");
    });

  const updateStaff = (id: string, patch: Partial<Staff>) =>
    updateData((d) => ({ ...d, allStaff: d.allStaff.map((s) => s.id === id ? { ...s, ...patch } : s) }));

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">スタッフ管理</h1>
          <p className="text-xs font-bold text-slate-500">{currentStore?.name} のスタッフ一覧</p>
        </div>
        <button
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 text-white text-sm font-bold shadow-xl hover:bg-slate-800 active:scale-95 transition-all"
          onClick={() => updateData((d) => ({ ...d, allStaff: [...d.allStaff, { id: `s${Date.now()}`, storeId: d.selectedStoreId, name: "新規スタッフ", type: "AP", isSocialInsurance: false, isHelp: false, isRetired: false, hourlyRate: 1100, monthlySalary: 0, adjustments: [] }] }))}
        >
          <Plus size={18} /> 新規スタッフ追加
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {/* ヘッダー */}
          <div className="hidden md:grid grid-cols-[180px_90px_140px_90px_90px_70px_80px_90px_100px_110px_50px] gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest items-center">
            <div className="px-1">名前</div>
            <div className="px-1">種別</div>
            <div className="text-right">基本給与/時給</div>
            <div className="text-center">社会保険</div>
            <div className="text-center">ヘルプ</div>
            <div className="text-center">退職済</div>
            <div className="text-center">従業員番号</div>
            <div className="text-center">PASS</div>
            <div className="text-right">交通費</div>
            <div className="text-center">加算設定</div>
            <div className="text-right">操作</div>
          </div>

          <div className="divide-y divide-slate-100">
            {currentStaff.map((staff) => {
              const isExpanded = expandedStaffId === staff.id;
              const retired = !!staff.isRetired;

              return (
                <div
                  key={staff.id}
                  className={`transition-colors ${
                    retired
                      ? "bg-slate-50/80 opacity-60"
                      : isExpanded
                      ? "bg-blue-50/30"
                      : "hover:bg-slate-50/50"
                  }`}
                >
                  <div className="p-4 md:px-4 md:py-2 grid grid-cols-1 md:grid-cols-[180px_90px_140px_90px_90px_70px_80px_90px_100px_110px_50px] gap-4 items-center">

                    {/* 名前 */}
                    <div className="flex items-center gap-3">
                      <input
                        className={`flex-1 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-blue-500 text-sm font-bold outline-none px-1 py-1 transition-all ${retired ? "text-slate-400 line-through" : "text-slate-900"}`}
                        value={staff.name}
                        onChange={(e) => updateStaff(staff.id, { name: e.target.value })}
                      />
                      <select
                        className="md:hidden bg-slate-100 border-none rounded-lg px-2 py-1 text-[10px] font-bold text-slate-600 outline-none"
                        value={staff.type}
                        onChange={(e) => updateStaff(staff.id, { type: e.target.value as "社員" | "AP" })}
                      >
                        <option value="社員">社員</option>
                        <option value="AP">AP</option>
                      </select>
                    </div>

                    {/* 種別 (Desktop) */}
                    <div className="hidden md:block">
                      <select
                        className="w-full bg-transparent border-none text-xs font-bold text-slate-500 outline-none cursor-pointer hover:text-slate-900 px-1"
                        value={staff.type}
                        onChange={(e) => updateStaff(staff.id, { type: e.target.value as "社員" | "AP" })}
                      >
                        <option value="社員">社員</option>
                        <option value="AP">AP</option>
                      </select>
                    </div>

                    {/* 給与/時給 */}
                    <div className="flex items-center justify-end gap-2">
                      <NumberInput
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-900 font-mono text-right outline-none focus:border-blue-500"
                        value={staff.type === "社員" ? staff.monthlySalary : staff.hourlyRate}
                        onChange={(val) => updateStaff(staff.id, { [staff.type === "社員" ? "monthlySalary" : "hourlyRate"]: val })}
                      />
                      <span className="text-[10px] font-bold text-slate-400 w-4">円</span>
                    </div>

                    {/* 社会保険 */}
                    <div className="flex justify-between lg:justify-center items-center gap-2 lg:gap-0">
                      <span className="md:hidden text-[10px] font-bold text-slate-400">社会保険</span>
                      <input type="checkbox" checked={staff.isSocialInsurance} onChange={(e) => updateStaff(staff.id, { isSocialInsurance: e.target.checked })} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20" />
                    </div>

                    {/* ヘルプ */}
                    <div className="flex justify-between lg:justify-center items-center gap-2 lg:gap-0">
                      <span className="md:hidden text-[10px] font-bold text-slate-400">ヘルプ要員</span>
                      <input type="checkbox" checked={staff.isHelp} onChange={(e) => updateStaff(staff.id, { isHelp: e.target.checked })} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20" />
                    </div>

                    {/* 退職済 */}
                    <div className="flex justify-between lg:justify-center items-center gap-2 lg:gap-0">
                      <span className="md:hidden text-[10px] font-bold text-slate-400">退職済</span>
                      <input
                        type="checkbox"
                        checked={retired}
                        onChange={(e) => updateStaff(staff.id, { isRetired: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-300 text-slate-400 focus:ring-slate-300/20 accent-slate-400"
                      />
                    </div>

                    {/* 従業員番号 */}
                    <div className="flex justify-between lg:justify-center items-center gap-2">
                      <span className="md:hidden text-[10px] font-bold text-slate-400">従業員番号</span>
                      <input
                        type="text"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-900 font-mono outline-none focus:border-blue-500 placeholder:text-slate-300"
                        value={staff.employeeNo ?? ""}
                        placeholder="例: 10001"
                        onChange={(e) => updateStaff(staff.id, { employeeNo: e.target.value || undefined })}
                      />
                    </div>

                    {/* PASS */}
                    <div className="flex justify-between lg:justify-center items-center gap-2">
                      <span className="md:hidden text-[10px] font-bold text-slate-400">PASS</span>
                      <input
                        type="text"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-900 font-mono outline-none focus:border-blue-500 placeholder:text-slate-300"
                        value={staff.pass ?? ""}
                        placeholder="未設定"
                        onChange={(e) => updateStaff(staff.id, { pass: e.target.value || undefined })}
                      />
                    </div>

                    {/* 交通費 */}
                    <div className="flex justify-between lg:justify-end items-center gap-2">
                      <span className="md:hidden text-[10px] font-bold text-slate-400">
                        {staff.type === "AP" ? "1日往復交通費" : "月額定期代"}
                      </span>
                      <div className="flex items-center gap-1">
                        <NumberInput
                          className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-900 font-mono text-right outline-none focus:border-blue-500"
                          value={staff.type === "AP" ? (staff.dailyTransport ?? 0) : (staff.monthlyTransport ?? 0)}
                          onChange={(val) => updateStaff(staff.id, { [staff.type === "AP" ? "dailyTransport" : "monthlyTransport"]: val })}
                        />
                        <span className="text-[10px] font-bold text-slate-400">円</span>
                      </div>
                    </div>

                    {/* 加算設定 */}
                    <div className="flex justify-center">
                      <button
                        className={`flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold transition-all ${isExpanded ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                        onClick={() => setExpandedStaffId(isExpanded ? null : staff.id)}
                      >
                        {(staff.adjustments?.length ?? 0) > 0 && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1 animate-pulse" />}
                        加算設定 {isExpanded ? "閉じる" : `(${staff.adjustments?.length || 0})`}
                      </button>
                    </div>

                    {/* 削除 */}
                    <div className="flex justify-end">
                      {confirmDeleteId === staff.id ? (
                        <div className="flex items-center gap-2">
                          <button className="text-[10px] font-bold text-rose-600 hover:underline" onClick={() => { updateData((d) => ({ ...d, allStaff: d.allStaff.filter((s) => s.id !== staff.id) })); setConfirmDeleteId(null); }}>削除</button>
                          <button className="text-[10px] font-bold text-slate-400" onClick={() => setConfirmDeleteId(null)}>×</button>
                        </div>
                      ) : (
                        <button className="text-slate-300 hover:text-rose-500 transition-colors" onClick={() => setConfirmDeleteId(staff.id)}><Trash2 size={16} /></button>
                      )}
                    </div>
                  </div>

                  {/* 加算設定パネル */}
                  {isExpanded && (
                    <div className="px-6 pb-6 pt-2 animate-in slide-in-from-top-2 duration-200">
                      <div className="bg-white border border-blue-100 rounded-xl p-4 shadow-inner">
                        <div className="flex justify-between items-center mb-4">
                          <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest">期間限定給与加算設定</div>
                          <button className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1" onClick={() => updateData((d) => ({ ...d, allStaff: d.allStaff.map((s) => s.id === staff.id ? { ...s, adjustments: [...(s.adjustments || []), { start: "", end: "", hourly: 0, daily: 0 }] } : s) }))}>
                            <Plus size={12} /> 加算設定を追加
                          </button>
                        </div>
                        <div className="space-y-2">
                          {(staff.adjustments || []).map((adj, aIdx) => (
                            <div key={aIdx} className="flex flex-wrap lg:flex-nowrap items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-100">
                              <div className="flex items-center gap-2">
                                <input type="date" className="bg-white border border-slate-200 rounded px-2 py-1 text-[10px] text-slate-900 outline-none focus:border-blue-500" value={adj.start} onChange={(e) => updateData((d) => ({ ...d, allStaff: d.allStaff.map((s) => s.id === staff.id ? { ...s, adjustments: s.adjustments.map((a, i) => i === aIdx ? { ...a, start: e.target.value } : a) } : s) }))} />
                                <span className="text-slate-300 text-[10px]">〜</span>
                                <input type="date" className="bg-white border border-slate-200 rounded px-2 py-1 text-[10px] text-slate-900 outline-none focus:border-blue-500" value={adj.end} onChange={(e) => updateData((d) => ({ ...d, allStaff: d.allStaff.map((s) => s.id === staff.id ? { ...s, adjustments: s.adjustments.map((a, i) => i === aIdx ? { ...a, end: e.target.value } : a) } : s) }))} />
                              </div>
                              <div className="flex items-center gap-4 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-slate-400">時給+</span>
                                  <NumberInput className="bg-white border border-slate-200 rounded px-2 py-1 text-[10px] text-slate-900 w-16 text-right outline-none focus:border-blue-500" value={adj.hourly} onChange={(val) => updateData((d) => ({ ...d, allStaff: d.allStaff.map((s) => s.id === staff.id ? { ...s, adjustments: s.adjustments.map((a, i) => i === aIdx ? { ...a, hourly: val } : a) } : s) }))} />
                                  <span className="text-[10px] text-slate-400">円</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-slate-400">日給+</span>
                                  <NumberInput className="bg-white border border-slate-200 rounded px-2 py-1 text-[10px] text-slate-900 w-16 text-right outline-none focus:border-blue-500" value={adj.daily} onChange={(val) => updateData((d) => ({ ...d, allStaff: d.allStaff.map((s) => s.id === staff.id ? { ...s, adjustments: s.adjustments.map((a, i) => i === aIdx ? { ...a, daily: val } : a) } : s) }))} />
                                  <span className="text-[10px] text-slate-400">円</span>
                                </div>
                              </div>
                              <button className="text-slate-300 hover:text-rose-500 p-1" onClick={() => updateData((d) => ({ ...d, allStaff: d.allStaff.map((s) => s.id === staff.id ? { ...s, adjustments: s.adjustments.filter((_, i) => i !== aIdx) } : s) }))}><Trash2 size={14} /></button>
                            </div>
                          ))}
                          {(staff.adjustments || []).length === 0 && (
                            <div className="text-center py-4 border-2 border-dashed border-slate-100 rounded-lg">
                              <p className="text-[10px] font-bold text-slate-300">期間限定の給与加算（繁忙期手当など）を設定できます</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
