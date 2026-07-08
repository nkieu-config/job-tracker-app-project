"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

type ToastVariant = "success" | "error";
type ToastItem = { id: number; message: string; variant: ToastVariant };
type ShowToast = (message: string, variant?: ToastVariant) => void;

const ToastContext = createContext<ShowToast>(() => {});

export function useToast(): ShowToast {
  return useContext(ToastContext);
}

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  success:
    "border-semantic-success bg-semantic-success-tint text-semantic-success",
  error: "border-semantic-error bg-semantic-error-tint text-semantic-error",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback<ShowToast>(
    (message, variant = "success") => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, message, variant }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-6 right-6 z-50 flex w-full max-w-xs flex-col gap-2"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`animate-rise pointer-events-auto flex items-center justify-between gap-3 rounded-xl border px-4 py-3 font-sans text-[14px] font-bold shadow-lg ${VARIANT_CLASSES[t.variant]}`}
          >
            <span>{t.message}</span>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
              className="shrink-0 text-[16px] leading-none opacity-70 hover:opacity-100"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
