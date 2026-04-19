import { useState, useEffect } from "react";
import { LogIn, Send, CalendarDays, CalendarRange, LogOut, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { syncFromSupabase } from "../lib/storage";
import { loadStoresForMonth, submitRequest, fetchRequests } from "../lib/requests";
import type { AppData, Staff, RequestedShift, ShiftRequest } from "../types";
import { getDaysArray, getWeeks, DOW, formatDate } from "../utils/date";
import { calcMinutes } from "../utils/calc";

// ─── 定数 ──────────────────────────────────────────────────────────────────
const START_HOUR = 9;
const END_HOUR = 26;

function timeToPercent(time: string): number {
  const [h, m] = time.split(":").map(Number);
  let total = h + m / 60;
  if (h < START_HOUR) total += 24;
  return Math.max(0, Math.min(100, ((total - START_HOUR) / (END_HOUR - START_HOUR)) * 100));
}

// 30分単位のグリッドスロット：整数時のみラベル表示、:30は線のみ
const GRID_SLOTS = Array.from({ length: (END_HOUR - START_HOUR) * 2 }, (_, i) => {
  const h = START_HOUR + Math.floor(i / 2);
  const isHour = i % 2 === 0;
  const label = isHour ? (h >= 24 ? `${h - 24}` : `${h}`) : "";
  return { label, isHour };
});

// ─── 15分単位の時刻選択肢 ────────────────────────────────────────────────────
const TIME_OPTIONS: { value: string; label: string }[] = [];
for (let h = 5; h < 24; h++) {
  for (const m of [0, 15, 30, 45]) {
    TIME_OPTIONS.push({
      value: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
      label: `${h}:${String(m).padStart(2, "0")}`,
    });
  }
}
[
  { value: "00:00", label: "24:00" }, { value: "00:15", label: "24:15" },
  { value: "00:30", label: "24:30" }, { value: "00:45", label: "24:45" },
  { value: "01:00", label: "25:00" }, { value: "01:15", label: "25:15" },
  { value: "01:30", label: "25:30" }, { value: "01:45", label: "25:45" },
  { value: "02:00", label: "26:00" },
].forEach((o) => TIME_OPTIONS.push(o));

function TimeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      className="flex-1 min-w-0 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-slate-800 outline-none focus:border-amber-400"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">--</option>
      {TIME_OPTIONS.map((opt) => (
        <option key={`${opt.value}-${opt.label}`} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

// ─── ログイン画面 ──────────────────────────────────────────────────────────
interface LoginScreenProps {
  onLogin: (staff: Staff, data: AppData) => void;
}

function LoginScreen({ onLogin }: LoginScreenProps) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [stores, setStores] = useState<Array<{ storeId: string; storeName: string }>>([]);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [appData, setAppData] = useState<AppData | null>(null);
  const [staffId, setStaffId] = useState("");
  const [pass, setPass] = useState("");
  const [passError, setPassError] = useState("");
  const [loadingStores, setLoadingStores] = useState(true);
  const [loadingStore, setLoadingStore] = useState(false);

  // ストア一覧を取得
  useEffect(() => {
    async function load() {
      setLoadingStores(true);
      // Supabase から今月のストア一覧を取得
      const list = await loadStoresForMonth(year, month);
      if (list.length > 0) {
        setStores(list);
      } else {
        // フォールバック: localStorage から取得
        const local = localStorage.getItem("smartshift_data");
        if (local) {
          try {
            const d = JSON.parse(local) as AppData;
            setStores(d.stores.map((s) => ({ storeId: s.id, storeName: s.name })));
          } catch { /* ignore */ }
        }
      }
      setLoadingStores(false);
    }
    void load();
  }, [year, month]);

  // ストア選択時にスタッフ一覧を読み込み
  useEffect(() => {
    if (!selectedStoreId) return;
    async function loadStore() {
      setLoadingStore(true);
      setStaffId("");
      setPass("");
      setPassError("");
      let data = await syncFromSupabase(selectedStoreId, year, month);
      if (!data) {
        // localStorage フォールバック
        const local = localStorage.getItem("smartshift_data");
        if (local) {
          try { data = JSON.parse(local) as AppData; } catch { /* ignore */ }
        }
      }
      setAppData(data);
      setLoadingStore(false);
    }
    void loadStore();
  }, [selectedStoreId, year, month]);

  const staffList = appData
    ? appData.allStaff.filter((s) => s.storeId === selectedStoreId)
    : [];

  const handleLogin = () => {
    if (!appData || !staffId) return;
    const staff = appData.allStaff.find((s) => s.id === staffId);
    if (!staff) return;
    // PASS 未設定のスタッフはログイン不可
    if (!staff.pass) {
      setPassError("PASSが設定されていません。管理者に設定を依頼してください");
      return;
    }
    // PASS 照合
    if (staff.pass !== pass) {
      setPassError("パスワードが違います");
      return;
    }
    setPassError("");
    onLogin(staff, appData);
  };

  return (
    <div className="min-h-dvh bg-gradient-to-br from-slate-900 via-slate-800 to-amber-900 flex flex-col overflow-y-auto">
      <div className="my-auto px-4 py-10 w-full flex flex-col items-center">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500 shadow-xl mb-4">
            <CalendarDays size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">SmartShift</h1>
          <p className="text-amber-200/70 text-sm font-bold mt-1">スタッフポータル</p>
        </div>

        {/* Card */}
        <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-6 shadow-2xl">
          {loadingStores ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-white/20 border-t-amber-400 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-white/60 text-sm">読み込み中...</p>
            </div>
          ) : stores.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle size={32} className="text-amber-400 mx-auto mb-3" />
              <p className="text-white/80 text-sm font-bold">店舗データが見つかりません</p>
              <p className="text-white/40 text-xs mt-1">管理者にお問い合わせください</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Store select */}
              <div>
                <label className="block text-xs font-black text-white/60 uppercase tracking-widest mb-1.5">店舗</label>
                <select
                  className="w-full bg-slate-800 border border-white/20 rounded-xl px-3 py-2.5 text-white text-sm font-bold outline-none focus:border-amber-400 transition-colors"
                  value={selectedStoreId}
                  onChange={(e) => setSelectedStoreId(e.target.value)}
                >
                  <option value="" className="text-slate-900 bg-white">選択してください</option>
                  {stores.map((s) => (
                    <option key={s.storeId} value={s.storeId} className="text-slate-900 bg-white">{s.storeName}</option>
                  ))}
                </select>
              </div>

              {/* Name select */}
              {selectedStoreId && (
                <div>
                  <label className="block text-xs font-black text-white/60 uppercase tracking-widest mb-1.5">名前</label>
                  {loadingStore ? (
                    <div className="w-6 h-6 border-2 border-white/20 border-t-amber-400 rounded-full animate-spin" />
                  ) : (
                    <select
                      className="w-full bg-slate-800 border border-white/20 rounded-xl px-3 py-2.5 text-white text-sm font-bold outline-none focus:border-amber-400 transition-colors"
                      value={staffId}
                      onChange={(e) => { setStaffId(e.target.value); setPass(""); setPassError(""); }}
                    >
                      <option value="" className="text-slate-900 bg-white">選択してください</option>
                      {staffList.map((s) => (
                        <option key={s.id} value={s.id} className="text-slate-900 bg-white">{s.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* PASS — 名前選択後は常に表示 */}
              {staffId && (
                <div>
                  <label className="block text-xs font-black text-white/60 uppercase tracking-widest mb-1.5">
                    パスワード
                  </label>
                  <input
                    type="password"
                    className={`w-full bg-slate-800 border rounded-xl px-3 py-2.5 text-white text-sm font-bold outline-none focus:border-amber-400 transition-colors ${passError ? "border-rose-400" : "border-white/20"}`}
                    value={pass}
                    onChange={(e) => { setPass(e.target.value); setPassError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    placeholder="パスワードを入力"
                    autoComplete="current-password"
                  />
                  {passError && <p className="text-rose-400 text-xs font-bold mt-1">{passError}</p>}
                </div>
              )}

              {/* Login button */}
              <button
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all ${
                  staffId && pass
                    ? "bg-amber-500 hover:bg-amber-400 text-white shadow-lg"
                    : "bg-white/10 text-white/30 cursor-not-allowed"
                }`}
                onClick={handleLogin}
                disabled={!staffId || !pass}
              >
                <LogIn size={16} /> ログイン
              </button>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

// ─── シフト提出タブ ────────────────────────────────────────────────────────
interface SubmitTabProps {
  staff: Staff;
  onToast: (msg: string, type?: "success" | "error") => void;
}

function SubmitTab({ staff, onToast }: SubmitTabProps) {
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1;
  const defaultYear = curMonth === 12 ? curYear + 1 : curYear;
  const defaultMonth = curMonth === 12 ? 1 : curMonth + 1;

  const [targetYear, setTargetYear] = useState(defaultYear);
  const [targetMonth, setTargetMonth] = useState(defaultMonth);
  const [weekIdx, setWeekIdx] = useState(0);
  // 全日付を空白(未チェック)で初期化
  const [inputs, setInputs] = useState<Record<string, { inTime: string; outTime: string; off: boolean }>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [existingRequest, setExistingRequest] = useState<ShiftRequest | null>(null);

  const days = getDaysArray(targetYear, targetMonth);
  const weeks = getWeeks(targetYear, targetMonth);
  const weekDays = weeks[weekIdx] ?? [];

  // 月変更時に週タブをリセット
  useEffect(() => { setWeekIdx(0); }, [targetYear, targetMonth]);

  // 既存申請の有無だけ確認（フォームには反映しない）
  useEffect(() => {
    async function load() {
      const reqs = await fetchRequests(staff.storeId, targetYear, targetMonth);
      const mine = reqs.find((r) => r.staffId === staff.id);
      setExistingRequest(mine ?? null);
      // フォームは常に空白スタート
      setInputs({});
      setSubmitted(false);
    }
    void load();
  }, [staff.id, staff.storeId, targetYear, targetMonth]);

  const setDay = (date: string, field: "inTime" | "outTime" | "off", value: string | boolean) => {
    setInputs((prev) => {
      const cur = prev[date] ?? { inTime: "", outTime: "", off: false };
      return { ...prev, [date]: { ...cur, [field]: value } };
    });
  };

  const isResubmit = existingRequest != null;

  const handleSubmit = async () => {
    // 今回のフォームで入力した日付
    const newShifts: RequestedShift[] = days
      .filter((d) => inputs[d.date] && !inputs[d.date].off && inputs[d.date].inTime)
      .map((d) => ({
        date: d.date,
        inTime: inputs[d.date].inTime,
        outTime: inputs[d.date].outTime || "18:00",
      }));

    // 再提出の場合：既存シフト ＋ 新しい入力をマージ（同じ日付は上書き、公休は除外）
    const mergedShifts: RequestedShift[] = isResubmit && existingRequest
      ? [
          ...existingRequest.shifts.filter(
            (s) => !newShifts.some((ns) => ns.date === s.date) && !inputs[s.date]?.off
          ),
          ...newShifts,
        ].sort((a, b) => a.date.localeCompare(b.date))
      : newShifts;

    if (mergedShifts.length === 0) {
      onToast("希望シフトを1日以上入力してください", "error");
      return;
    }

    setSubmitting(true);
    const ok = await submitRequest({
      staffId: staff.id,
      storeId: staff.storeId,
      year: targetYear,
      month: targetMonth,
      shifts: mergedShifts,
      submittedAt: new Date().toISOString(),
      status: "pending",
      resubmit: isResubmit,
    });
    setSubmitting(false);

    if (ok) {
      setSubmitted(true);
      const addedCount = newShifts.length;
      const totalCount = mergedShifts.length;
      onToast(
        isResubmit
          ? `再申請しました！（合計${totalCount}日 / 今回${addedCount}日追加）`
          : `シフト希望を送信しました！（${totalCount}日）`
      );
    } else {
      onToast("送信に失敗しました。もう一度お試しください", "error");
    }
  };

  const monthOptions = Array.from({ length: 4 }, (_, i) => {
    const m = ((curMonth - 1 + i) % 12) + 1;
    const y = curYear + Math.floor((curMonth - 1 + i) / 12);
    return { year: y, month: m };
  });

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center ${isResubmit ? "bg-blue-100" : "bg-emerald-100"}`}>
          <CheckCircle size={40} className={isResubmit ? "text-blue-600" : "text-emerald-600"} />
        </div>
        <h2 className="text-xl font-black text-slate-900">{isResubmit ? "再申請完了！" : "送信完了！"}</h2>
        <p className="text-slate-500 text-sm text-center">
          {targetYear}年{targetMonth}月のシフト希望を{isResubmit ? "再申請" : "送信"}しました。<br />
          管理者が確認後に反映されます。
        </p>
        {isResubmit && existingRequest && (
          <p className="text-xs text-blue-600 font-bold bg-blue-50 px-4 py-2 rounded-xl border border-blue-100 text-center">
            前回分を引き継いで上書き提出しました
          </p>
        )}
        <button
          className="mt-2 px-6 py-2 rounded-xl bg-amber-500 text-white font-bold text-sm hover:bg-amber-600 transition-colors"
          onClick={() => setSubmitted(false)}
        >
          もう一度入力する
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Month selector */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs font-black text-slate-400 shrink-0">対象月</span>
        <div className="flex gap-1.5 flex-wrap">
          {monthOptions.map((opt) => (
            <button
              key={`${opt.year}-${opt.month}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                targetYear === opt.year && targetMonth === opt.month
                  ? "bg-amber-500 text-white shadow"
                  : "bg-white border border-slate-200 text-slate-500"
              }`}
              onClick={() => { setTargetYear(opt.year); setTargetMonth(opt.month); }}
            >
              {opt.year !== curYear ? `${opt.year}/` : ""}{opt.month}月
            </button>
          ))}
        </div>
      </div>

      {/* 提出済みバナー */}
      {existingRequest && (
        <div className={`px-3 py-2.5 rounded-xl mb-4 border ${
          existingRequest.resubmit ? "bg-blue-50 border-blue-200" : "bg-amber-50 border-amber-200"
        }`}>
          <div className="flex items-center gap-2">
            <Clock size={13} className={existingRequest.resubmit ? "text-blue-500" : "text-amber-500"} />
            <span className="text-xs font-black text-slate-800">
              {existingRequest.resubmit ? "再申請済み" : "提出済み"}
            </span>
            <span className="text-[10px] text-slate-400">
              {existingRequest.status === "reflected" ? "反映済み" : "確認中"} ·{" "}
              {new Date(existingRequest.submittedAt).toLocaleDateString("ja-JP")} ·{" "}
              {existingRequest.shifts.length}日
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 ml-5">
            新しい日付を追加、または変更したい日を入力して再申請すると<br />
            <span className="font-bold text-slate-700">既存の{existingRequest.shifts.length}日に上書き追加</span>されます
          </p>
        </div>
      )}

      {/* 週タブ */}
      <div className="flex gap-0.5 bg-slate-100 border border-slate-200 rounded-lg p-0.5 mb-3">
        {weeks.map((wk, i) => (
          <button
            key={i}
            className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${
              weekIdx === i
                ? "bg-white text-amber-700 shadow-sm border border-amber-100"
                : "text-slate-400 hover:text-slate-600"
            }`}
            onClick={() => setWeekIdx(i)}
          >
            {wk[0] ? `${targetMonth}/${wk[0].day}〜` : `W${i + 1}`}
          </button>
        ))}
      </div>

      {/* Day inputs */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 rounded-t-xl flex items-center justify-between">
          <span className="text-[10px] font-black text-slate-400">
            {targetYear}年{targetMonth}月 W{weekIdx + 1}（{weekDays.length}日間）
          </span>
          {existingRequest && (
            <span className="text-[10px] text-blue-400 font-bold">
              {new Date(existingRequest.submittedAt).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}提出分 ▶ 青字
            </span>
          )}
        </div>
        <div className="divide-y divide-slate-100">
          {weekDays.map((d) => {
            const isWeekend = d.dow === 0 || d.dow === 6;
            const val = inputs[d.date];
            const isChecked = !!val && !val.off;
            const prevShift = existingRequest?.shifts.find((s) => s.date === d.date) ?? null;
            return (
              <div
                key={d.date}
                className={`px-3 py-2.5 transition-colors ${isChecked ? "bg-amber-50/40" : ""}`}
              >
                {/* メイン行：チェック + 日付 + 時間入力 */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded border-slate-300 shrink-0 accent-amber-500"
                    checked={isChecked}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setInputs((prev) => ({
                          ...prev,
                          [d.date]: { inTime: "12:00", outTime: "12:00", off: false },
                        }));
                      } else {
                        setInputs((prev) => {
                          const next = { ...prev };
                          delete next[d.date];
                          return next;
                        });
                      }
                    }}
                  />
                  <span className={`text-sm font-black w-20 shrink-0 ${isWeekend ? "text-rose-600" : "text-slate-800"}`}>
                    {targetMonth}/{d.day}({DOW[d.dow]})
                  </span>
                  {isChecked ? (
                    <div className="flex items-center gap-1 flex-1 min-w-0">
                      <TimeSelect value={val.inTime} onChange={(v) => setDay(d.date, "inTime", v)} />
                      <span className="text-slate-300 text-xs shrink-0">–</span>
                      <TimeSelect value={val.outTime} onChange={(v) => setDay(d.date, "outTime", v)} />
                    </div>
                  ) : val?.off ? (
                    <button
                      className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs font-black transition-colors"
                      onClick={() => setInputs((prev) => { const next = { ...prev }; delete next[d.date]; return next; })}
                    >
                      公休
                      <span className="text-rose-400 text-[10px] ml-0.5">×</span>
                    </button>
                  ) : (
                    <button
                      className="text-xs font-bold text-slate-300 hover:text-rose-500 hover:bg-rose-50 px-2 py-0.5 rounded-lg transition-colors border border-transparent hover:border-rose-200"
                      onClick={() => setDay(d.date, "off", true)}
                    >
                      公休
                    </button>
                  )}
                </div>
                {/* 前回申請（サブ行） */}
                {prevShift && existingRequest && (
                  <div className="ml-7 mt-1 flex items-center gap-1">
                    <span className="text-[10px] text-slate-400">
                      {new Date(existingRequest.submittedAt).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}提出
                    </span>
                    <span className="text-[10px] font-bold text-blue-500">{prevShift.inTime}</span>
                    <span className="text-[10px] text-slate-300">–</span>
                    <span className="text-[10px] font-bold text-blue-500">{prevShift.outTime}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Submit button */}
      <div className="mt-4 flex flex-col gap-2">
        <button
          className={`w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-black shadow transition-all ${
            submitting
              ? "bg-slate-200 text-slate-400 cursor-not-allowed"
              : isResubmit
              ? "bg-blue-500 text-white"
              : "bg-amber-500 text-white"
          }`}
          onClick={handleSubmit}
          disabled={submitting}
        >
          <Send size={15} />
          {submitting ? "送信中..." : isResubmit ? "再申請する" : "シフト希望を送信"}
        </button>
        <span className="text-[11px] text-slate-400 text-center">
          {Object.values(inputs).filter((v) => !v.off).length}日 選択中
        </span>
      </div>
    </div>
  );
}

// ─── シフト(Daily)タブ — 確定シフト確認 ──────────────────────────────────
interface DailyViewProps {
  appData: AppData;
  weeks: ReturnType<typeof getWeeks>;
}

function DailyView({ appData, weeks }: DailyViewProps) {
  const [weekIdx, setWeekIdx] = useState(0);
  const week = weeks[weekIdx] ?? [];
  const confirmedDates = new Set(appData.confirmedDates ?? []);

  const currentStaff = appData.allStaff.filter((s) => s.storeId === appData.selectedStoreId);

  const confirmedWeekDays = week.filter((d) => confirmedDates.has(d.date));

  if (confirmedDates.size === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <Clock size={36} className="text-slate-300" />
        <p className="text-slate-500 text-sm font-bold">まだシフトが発表されていません</p>
        <p className="text-slate-400 text-xs">管理者がシフトを確定後、ここに表示されます</p>
      </div>
    );
  }

  return (
    <div>
      {/* Week selector */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex gap-0.5 bg-slate-100 border border-slate-200 rounded-lg p-0.5">
          {weeks.map((_, i) => (
            <button
              key={i}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                weekIdx === i
                  ? "bg-white text-amber-700 shadow-sm border border-amber-100"
                  : "text-slate-400 hover:text-slate-600"
              }`}
              onClick={() => setWeekIdx(i)}
            >
              W{i + 1}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {confirmedWeekDays.length === 0 ? (
          <div className="py-8 text-center text-slate-300 text-xs font-bold">この週は未確定です</div>
        ) : (
          confirmedWeekDays.map((d) => {
            const dayData = appData.dailyDataRecord[d.date];
            if (!dayData) return null;

            const shifts = dayData.shifts
              .filter((sh) => sh.inTime && currentStaff.some((s) => s.id === sh.staffId))
              .sort((a, b) => {
                const sA = currentStaff.find((s) => s.id === a.staffId);
                const sB = currentStaff.find((s) => s.id === b.staffId);
                if (a.isHelp !== b.isHelp) return a.isHelp ? 1 : -1;
                if (sA?.type !== sB?.type) return sA?.type === "社員" ? -1 : 1;
                return a.inTime.localeCompare(b.inTime);
              });

            return (
              <div key={d.date} className="bg-white border border-slate-200 rounded-xl shadow-sm">
                {/* ヘッダー（固定） */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border-b border-slate-200 rounded-t-xl">
                  <span className="font-black text-xs text-slate-800">{formatDate(d.date)}</span>
                  <span className="text-[10px] text-slate-400 font-bold">{DOW[d.dow]}</span>
                  <span className="text-[10px] text-slate-400">{shifts.length}名</span>
                  <span className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">確定済み</span>
                </div>

                {shifts.length === 0 ? (
                  <div className="px-3 py-3 text-[11px] text-slate-300 text-center rounded-b-xl">シフトなし</div>
                ) : (
                  /* overflow-x-auto を外枠から切り離して独立させる */
                  <div className="overflow-x-auto rounded-b-xl" style={{ WebkitOverflowScrolling: "touch" }}>
                    <div className="px-3 py-2" style={{ minWidth: "580px" }}>
                      {/* 時間軸ラベル */}
                      <div className="flex mb-1" style={{ marginLeft: "80px" }}>
                        {GRID_SLOTS.map((slot, i) => (
                          <div key={i} className="flex-1 border-l border-slate-100 pl-0.5" style={{ minWidth: 0 }}>
                            {slot.isHour && (
                              <span className="text-[9px] font-bold text-slate-400 leading-none">{slot.label}</span>
                            )}
                          </div>
                        ))}
                      </div>
                      {/* シフト行 */}
                      <div className="space-y-1">
                        {shifts.map((sh) => {
                          const s = currentStaff.find((st) => st.id === sh.staffId);
                          const left = timeToPercent(sh.inTime);
                          const right = timeToPercent(sh.outTime);
                          const width = Math.max(0, right - left);
                          const isHelp = sh.isHelp;
                          const isSeishain = s?.type === "社員";
                          const badgeCls = isHelp ? "bg-emerald-100 text-emerald-700 border-emerald-200" : isSeishain ? "bg-blue-100 text-blue-700 border-blue-200" : "bg-amber-50 text-amber-700 border-amber-200";
                          const barCls = isHelp ? "bg-emerald-100 border-emerald-300 text-emerald-800" : isSeishain ? "bg-blue-100 border-blue-300 text-blue-800" : "bg-amber-100 border-amber-300 text-amber-800";
                          return (
                            <div key={sh.staffId} className="flex items-center gap-2 h-6">
                              <div className="shrink-0 flex items-center gap-1 overflow-hidden" style={{ width: "80px" }}>
                                <span className={`text-[8px] font-bold px-1 py-0.5 rounded border shrink-0 ${badgeCls}`}>
                                  {isHelp ? "HLP" : isSeishain ? "社" : "AP"}
                                </span>
                                <span className="text-[10px] font-bold text-slate-700 truncate">{s?.name ?? "—"}</span>
                              </div>
                              <div className="flex-1 relative h-5">
                                <div className="absolute inset-0 flex pointer-events-none">
                                  {GRID_SLOTS.map((slot, i) => (
                                    <div key={i} className={`flex-1 border-l ${slot.isHour ? "border-slate-200" : "border-slate-100"}`} />
                                  ))}
                                </div>
                                <div
                                  className={`absolute top-0 h-full rounded border text-[9px] font-bold flex items-center px-1 overflow-hidden ${barCls}`}
                                  style={{ left: `${left}%`, width: `${width}%` }}
                                >
                                  <span className="whitespace-nowrap">{sh.inTime}–{sh.outTime}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── シフト(Weekly)タブ ────────────────────────────────────────────────────
interface WeeklyViewProps {
  appData: AppData;
  weeks: ReturnType<typeof getWeeks>;
}

function WeeklyView({ appData, weeks }: WeeklyViewProps) {
  const [weekIdx, setWeekIdx] = useState(0);
  const week = weeks[weekIdx] ?? [];
  const confirmedDates = new Set(appData.confirmedDates ?? []);
  const currentStaff = appData.allStaff
    .filter((s) => s.storeId === appData.selectedStoreId)
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === "社員" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  if (confirmedDates.size === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <Clock size={36} className="text-slate-300" />
        <p className="text-slate-500 text-sm font-bold">まだシフトが発表されていません</p>
        <p className="text-slate-400 text-xs">管理者がシフトを確定後、ここに表示されます</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="flex gap-0.5 bg-slate-100 border border-slate-200 rounded-lg p-0.5">
          {weeks.map((_, i) => (
            <button
              key={i}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                weekIdx === i
                  ? "bg-white text-amber-700 shadow-sm border border-amber-100"
                  : "text-slate-400 hover:text-slate-600"
              }`}
              onClick={() => setWeekIdx(i)}
            >
              W{i + 1}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="overflow-x-auto rounded-xl" style={{ WebkitOverflowScrolling: "touch" }}>
          <table className="text-left" style={{ minWidth: "420px", width: "100%" }}>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap w-28">スタッフ</th>
                {week.map((d) => (
                  <th key={d.date} className={`px-2 py-2 text-center min-w-[72px] ${!confirmedDates.has(d.date) ? "opacity-30" : ""}`}>
                    <div className="text-[10px] font-bold text-slate-400">{DOW[d.dow]}</div>
                    <div className="text-xs font-black text-slate-700">{d.day}日</div>
                    {confirmedDates.has(d.date) && (
                      <div className="text-[8px] text-emerald-600 font-bold">確定</div>
                    )}
                  </th>
                ))}
                <th className="px-3 py-2 text-[10px] font-bold text-slate-400 text-center whitespace-nowrap">合計</th>
              </tr>
            </thead>
            <tbody>
              {currentStaff.map((staff) => {
                let weeklyMins = 0;
                return (
                  <tr key={staff.id} className="border-b border-slate-100 hover:bg-amber-50/20 transition-colors">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${staff.type === "社員" ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
                          {staff.type === "社員" ? "社" : "AP"}
                        </span>
                        <span className="text-xs font-bold text-slate-800">{staff.name}</span>
                      </div>
                    </td>
                    {week.map((d) => {
                      if (!confirmedDates.has(d.date)) {
                        return <td key={d.date} className="px-1 py-1.5 text-center opacity-20"><span className="text-[10px] text-slate-300">—</span></td>;
                      }
                      const dayData = appData.dailyDataRecord[d.date];
                      const shift = dayData?.shifts.find((s) => s.staffId === staff.id);
                      if (shift?.inTime) {
                        const net = Math.max(0, calcMinutes(shift.inTime, shift.outTime) - (shift.breakMinutes || 0));
                        weeklyMins += net;
                        return (
                          <td key={d.date} className="px-1 py-1.5 text-center align-middle">
                            <div className="text-[10px] font-black text-slate-800 leading-snug">{shift.inTime.replace(":00","")}</div>
                            <div className="text-[9px] text-slate-300 leading-none">↓</div>
                            <div className="text-[10px] font-black text-slate-800 leading-snug">{shift.outTime.replace(":00","")}</div>
                            {shift.isHelp && (
                              <div className="mt-0.5">
                                <span className="text-[8px] font-black bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full border border-emerald-200">HELP</span>
                              </div>
                            )}
                          </td>
                        );
                      }
                      return (
                        <td key={d.date} className="px-1 py-1.5 text-center bg-slate-50/40">
                          <span className="text-[10px] font-bold text-slate-300">公休</span>
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-center">
                      <span className="text-xs font-black text-slate-700 font-mono">{(weeklyMins / 60).toFixed(1)}h</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── メインコンポーネント ──────────────────────────────────────────────────
export default function StaffPortal() {
  const [loggedInStaff, setLoggedInStaff] = useState<Staff | null>(null);
  const [appData, setAppData] = useState<AppData | null>(null);
  const [activeTab, setActiveTab] = useState<"submit" | "daily" | "weekly">("submit");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLogin = (staff: Staff, data: AppData) => {
    // selectedStoreId をログインしたストアに合わせる
    setLoggedInStaff(staff);
    setAppData({ ...data, selectedStoreId: staff.storeId });
  };

  const handleLogout = () => {
    setLoggedInStaff(null);
    setAppData(null);
    setActiveTab("submit");
  };

  if (!loggedInStaff || !appData) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const weeks = getWeeks(appData.year, appData.month);

  const TABS = [
    { id: "submit" as const, label: "シフト提出", icon: <Send size={14} /> },
    { id: "daily" as const, label: "シフト(Daily)", icon: <CalendarDays size={14} /> },
    { id: "weekly" as const, label: "シフト(Weekly)", icon: <CalendarRange size={14} /> },
  ];

  return (
    <div className="min-h-dvh bg-slate-50 font-sans" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-20 shadow-sm" style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
            <CalendarDays size={16} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-black text-slate-900 leading-none">{loggedInStaff.name}</div>
            <div className="text-[10px] text-slate-400 font-bold leading-none mt-0.5">
              {appData.stores.find((s) => s.id === loggedInStaff.storeId)?.name} — {appData.year}年{appData.month}月
            </div>
          </div>
        </div>
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors border border-slate-200"
          onClick={handleLogout}
        >
          <LogOut size={13} /> ログアウト
        </button>
      </header>

      {/* Tab bar — スティッキー */}
      <div className="bg-white border-b border-slate-200 px-4 sticky z-10" style={{ top: "calc(3.5rem + env(safe-area-inset-top, 0px))" }}>
        <div className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold border-b-2 transition-all ${
                activeTab === tab.id
                  ? "text-amber-700 border-amber-500"
                  : "text-slate-400 border-transparent hover:text-slate-600"
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="p-4 max-w-3xl mx-auto">
        {activeTab === "submit" && (
          <SubmitTab staff={loggedInStaff} onToast={showToast} />
        )}
        {activeTab === "daily" && (
          <DailyView appData={appData} weeks={weeks} />
        )}
        {activeTab === "weekly" && (
          <WeeklyView appData={appData} weeks={weeks} />
        )}
      </main>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-sm font-bold text-white shadow-xl transition-all ${toast.type === "error" ? "bg-rose-500" : "bg-emerald-500"}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
