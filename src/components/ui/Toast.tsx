import { Check } from "lucide-react";
import type { ToastState } from "../../types";

interface ToastProps {
  toast: ToastState | null;
}

export default function Toast({ toast }: ToastProps) {
  if (!toast) return null;
  return (
    <div
      className={`fixed bottom-8 right-8 px-6 py-3.5 rounded-2xl text-white text-sm font-bold z-[9999] shadow-2xl flex items-center gap-3 animate-in slide-in-from-right-10 duration-300 ${
        toast.type === "error" ? "bg-rose-500" : "bg-emerald-500"
      }`}
    >
      <Check size={18} />
      {toast.msg}
    </div>
  );
}
