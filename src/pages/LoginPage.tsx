import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setLoading(true);
    setError("");
    const result = await login(username, password);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "ログインに失敗しました");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* ロゴ */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center font-black text-white text-2xl shadow-lg mb-3">
            S
          </div>
          <div className="text-lg font-extrabold text-slate-900 tracking-tight">SmartShift</div>
          <div className="text-xs text-amber-600 font-bold tracking-[0.2em]">PRO</div>
        </div>

        {/* フォーム */}
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4"
        >
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1.5 tracking-wide uppercase">
              ユーザーID
            </label>
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 transition-all"
              placeholder="IDを入力"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1.5 tracking-wide uppercase">
              パスワード
            </label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 transition-all"
              placeholder="パスワードを入力"
            />
          </div>

          {error && (
            <p className="text-xs font-bold text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          >
            {loading ? "認証中..." : "ログイン"}
          </button>
        </form>
      </div>
    </div>
  );
}
