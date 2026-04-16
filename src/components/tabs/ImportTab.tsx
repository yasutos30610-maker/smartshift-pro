import { useState, useEffect, useCallback } from "react";
import { RefreshCw, CheckCheck, AlertCircle, CheckCircle } from "lucide-react";
import type { AppData, Staff, UpdateDataFn, ShiftRequest } from "../../types";
import { fetchRequests, updateRequestStatus } from "../../lib/requests";

interface ImportTabProps {
  data: AppData;
  currentStaff: Staff[];
  updateData: UpdateDataFn;
}

export default function ImportTab({ data, currentStaff, updateData }: ImportTabProps) {
  const [requests, setRequests] = useState<ShiftRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [reflecting, setReflecting] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    const list = await fetchRequests(data.selectedStoreId, data.year, data.month);
    setRequests(list);
    setLoading(false);
  }, [data.selectedStoreId, data.year, data.month]);

  useEffect(() => { void load(); }, [load]);

  // スタッフごとに最新の申請のみ取得
  const latestByStaff = new Map<string, ShiftRequest>();
  requests.forEach((r) => {
    const existing = latestByStaff.get(r.staffId);
    if (!existing || new Date(r.submittedAt) > new Date(existing.submittedAt)) {
      latestByStaff.set(r.staffId, r);
    }
  });

  const reflectRequest = async (req: ShiftRequest) => {
    setReflecting((prev) => new Set(prev).add(req.id));

    updateData((d) => {
      let next = { ...d, dailyDataRecord: { ...d.dailyDataRecord } };
      req.shifts.forEach((rs) => {
        const existing = next.dailyDataRecord[rs.date];
        if (!existing) return;
        const alreadyIdx = existing.shifts.findIndex((s) => s.staffId === req.staffId);
        const newShift = {
          storeId: d.selectedStoreId,
          staffId: req.staffId,
          inTime: rs.inTime,
          outTime: rs.outTime,
          breakMinutes: 60,
          isHelp: currentStaff.find((s) => s.id === req.staffId)?.isHelp ?? false,
          requestedInTime: rs.inTime,
          requestedOutTime: rs.outTime,
        };
        const shifts =
          alreadyIdx >= 0
            ? existing.shifts.map((s, i) => (i === alreadyIdx ? newShift : s))
            : [...existing.shifts, newShift];
        next = {
          ...next,
          dailyDataRecord: {
            ...next.dailyDataRecord,
            [rs.date]: { ...existing, shifts },
          },
        };
      });
      return next;
    });

    await updateRequestStatus(req.id, "reflected");
    setRequests((prev) =>
      prev.map((r) => (r.id === req.id ? { ...r, status: "reflected" } : r))
    );
    setReflecting((prev) => {
      const next = new Set(prev);
      next.delete(req.id);
      return next;
    });
  };

  const reflectAll = async () => {
    const pending = Array.from(latestByStaff.values()).filter((r) => r.status === "pending");
    for (const req of pending) {
      await reflectRequest(req);
    }
  };

  const submittedCount = latestByStaff.size;
  const pendingCount = Array.from(latestByStaff.values()).filter((r) => r.status === "pending").length;
  const reflectedCount = Array.from(latestByStaff.values()).filter((r) => r.status === "reflected").length;
  const unsubmittedCount = currentStaff.length - submittedCount;
  const currentStore = data.stores.find((s) => s.id === data.selectedStoreId);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">

      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-base font-black text-slate-900 tracking-tight">シフト取込</h1>
          <p className="text-[11px] text-slate-400">
            {data.year}年{data.month}月 — {currentStore?.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-black shadow hover:bg-amber-600 transition-all"
              onClick={reflectAll}
            >
              <CheckCheck size={13} />
              一括反映（{pendingCount}件）
            </button>
          )}
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 text-xs font-bold hover:border-slate-300 transition-all"
            onClick={load}
            disabled={loading}
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            更新
          </button>
        </div>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-white border border-slate-200 rounded-xl px-3 py-3 shadow-sm text-center">
          <div className="text-2xl font-black text-slate-800">{currentStaff.length}</div>
          <div className="text-[10px] text-slate-400 font-bold mt-0.5">スタッフ</div>
        </div>
        <div className="bg-white border border-emerald-200 rounded-xl px-3 py-3 shadow-sm text-center">
          <div className="text-2xl font-black text-emerald-600">{submittedCount}</div>
          <div className="text-[10px] text-slate-400 font-bold mt-0.5">提出済み</div>
        </div>
        <div className={`bg-white rounded-xl px-3 py-3 shadow-sm text-center border ${unsubmittedCount > 0 ? "border-rose-200" : "border-slate-200"}`}>
          <div className={`text-2xl font-black ${unsubmittedCount > 0 ? "text-rose-500" : "text-slate-300"}`}>
            {unsubmittedCount}
          </div>
          <div className="text-[10px] text-slate-400 font-bold mt-0.5">未提出</div>
        </div>
        <div className="bg-white border border-blue-100 rounded-xl px-3 py-3 shadow-sm text-center">
          <div className="text-2xl font-black text-blue-600">{reflectedCount}</div>
          <div className="text-[10px] text-slate-400 font-bold mt-0.5">取込済み</div>
        </div>
      </div>

      {/* スタッフテーブル */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
          <span className="text-xs font-bold text-slate-600">提出状況一覧</span>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="w-6 h-6 border-2 border-slate-200 border-t-amber-500 rounded-full animate-spin" />
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100">
                {["名前", "提出状況", "提出日時", "日数", "取込", ""].map((h) => (
                  <th key={h} className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentStaff.map((staff) => {
                const req = latestByStaff.get(staff.id);
                const isSubmitted = !!req;
                const isReflected = req?.status === "reflected";
                const isPending = req?.status === "pending";
                const isReflecting = req ? reflecting.has(req.id) : false;

                return (
                  <tr
                    key={staff.id}
                    className={`border-b border-slate-100 transition-colors ${
                      !isSubmitted ? "bg-rose-50/40" : "hover:bg-slate-50/50"
                    }`}
                  >
                    {/* 名前 */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                          staff.type === "社員"
                            ? "bg-blue-50 text-blue-600 border-blue-100"
                            : "bg-slate-50 text-slate-500 border-slate-200"
                        }`}>
                          {staff.type === "社員" ? "社" : "AP"}
                        </span>
                        <span className="text-sm font-bold text-slate-800">{staff.name}</span>
                      </div>
                    </td>

                    {/* 提出状況 */}
                    <td className="px-4 py-3">
                      {isSubmitted ? (
                        <div className="flex items-center gap-1.5">
                          <CheckCircle size={13} className="text-emerald-500 shrink-0" />
                          <span className="text-xs font-bold text-emerald-700">提出済み</span>
                          {req.resubmit && (
                            <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                              再申請
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <AlertCircle size={13} className="text-rose-400 shrink-0" />
                          <span className="text-xs font-bold text-rose-500">未提出</span>
                        </div>
                      )}
                    </td>

                    {/* 提出日時 */}
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {req
                        ? new Date(req.submittedAt).toLocaleString("ja-JP", {
                            month: "numeric",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : <span className="text-slate-300">—</span>
                      }
                    </td>

                    {/* 日数 */}
                    <td className="px-4 py-3 text-center">
                      {req ? (
                        <span className="text-sm font-black text-slate-700">
                          {req.shifts.length}
                          <span className="text-xs font-medium text-slate-400 ml-0.5">日</span>
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>

                    {/* 取込状態 */}
                    <td className="px-4 py-3 text-center">
                      {isReflected ? (
                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          取込済
                        </span>
                      ) : isPending ? (
                        <span className="text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          未取込
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>

                    {/* アクション */}
                    <td className="px-4 py-3 text-right">
                      {isPending && (
                        <button
                          className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-black transition-all ${
                            isReflecting
                              ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                              : "bg-amber-500 hover:bg-amber-600 text-white shadow-sm"
                          }`}
                          onClick={() => req && void reflectRequest(req)}
                          disabled={isReflecting}
                        >
                          <CheckCheck size={11} />
                          {isReflecting ? "取込中..." : "反映"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
