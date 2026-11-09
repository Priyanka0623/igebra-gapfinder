// Toast notification banner for user actions and status updates
import React from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

export interface ToastMessage {
  id: string;
  text: string;
  tone?: "success" | "info" | "error";
}

interface ToastProps {
  toast: ToastMessage | null;
  onDismiss: () => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  if (!toast) return null;
  const bg =
    toast.tone === "error"
      ? "bg-red-900 text-white border-red-700"
      : "bg-emerald-950 text-white border-emerald-800";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg transition-all no-print ${bg}`}
    >
      {toast.tone === "error" ? (
        <AlertCircle className="h-4 w-4 shrink-0 text-red-300" />
      ) : (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />
      )}
      <span>{toast.text}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Close notification"
        className="ml-2 rounded p-1 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};
