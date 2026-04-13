import { useState } from "react";
import type { ToastState } from "../types";

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = (msg: string, type: ToastState["type"] = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  return { toast, showToast };
}
