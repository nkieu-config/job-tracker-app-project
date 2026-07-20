"use client";

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type ToastVariant = "success" | "error";
type ToastItem = { id: number; message: string; variant: ToastVariant };
type ShowToast = (message: string, variant?: ToastVariant) => void;

const ToastContext = createContext<ShowToast>(() => {});

export function useToast(): ShowToast {
  return use(ToastContext);
}

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  success:
    "border-semantic-success bg-semantic-success-tint text-semantic-success",
  error: "border-semantic-error bg-semantic-error-tint text-semantic-error",
};

const TOAST_TIMEOUT_MS = 4000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback<ShowToast>(
    (message, variant = "success") => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, message, variant }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), TOAST_TIMEOUT_MS),
      );
    },
    [dismiss],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending.values()) clearTimeout(timer);
      pending.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex w-full max-w-xs flex-col gap-2">
        <ToastRegion
          toasts={toasts.filter((t) => t.variant === "success")}
          onDismiss={dismiss}
          aria-live="polite"
        />
        <ToastRegion
          toasts={toasts.filter((t) => t.variant === "error")}
          onDismiss={dismiss}
          role="alert"
          aria-live="assertive"
        />
      </div>
    </ToastContext.Provider>
  );
}

function ToastRegion({
  toasts,
  onDismiss,
  ...regionProps
}: {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...regionProps} className="flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`animate-rise pointer-events-auto flex items-center justify-between gap-3 rounded-xl border px-4 py-3 font-sans text-body font-bold shadow-lg ${VARIANT_CLASSES[t.variant]}`}
        >
          <span>{t.message}</span>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            aria-label="Dismiss notification"
            className="shrink-0 text-body-lg leading-none opacity-70 hover:opacity-100"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
