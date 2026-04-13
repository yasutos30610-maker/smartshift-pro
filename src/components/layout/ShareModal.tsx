interface ShareModalProps {
  shareUrl: string;
  onClose: () => void;
  onCopy: () => void;
}

export default function ShareModal({ shareUrl, onClose, onCopy }: ShareModalProps) {
  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-black text-slate-900 mb-2 tracking-tight">URLで共有</h2>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          以下のURLを共有することで、他のユーザーがデータを閲覧・編集できます。
          <br />
          データはクラウドに保存され、URLにアクセスするたびに最新のデータが読み込まれます。
        </p>
        <div className="flex gap-2 mb-6">
          <input
            readOnly
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-600 font-mono outline-none focus:border-blue-500/50"
            value={shareUrl}
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <button
            className="px-5 py-3 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors shrink-0"
            onClick={onCopy}
          >
            コピー
          </button>
        </div>
        <button
          className="w-full py-3 text-slate-400 hover:text-slate-600 font-bold text-sm transition-colors"
          onClick={onClose}
        >
          閉じる
        </button>
      </div>
    </div>
  );
}
