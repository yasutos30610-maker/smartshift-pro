import { Component, type ReactNode } from "react";

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex items-center justify-center h-screen bg-white">
          <div className="text-center max-w-sm px-6">
            <p className="text-2xl mb-2">⚠️</p>
            <p className="text-sm font-bold text-slate-700 mb-1">表示エラーが発生しました</p>
            <p className="text-xs text-slate-400 mb-4">{this.state.error.message}</p>
            <button
              className="px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-lg"
              onClick={() => { this.setState({ error: null }); window.location.reload(); }}
            >
              再読み込み
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
