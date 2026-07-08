"use client";

import { useEffect, useRef } from "react";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  pending,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        if (!pending) onCancel();
      }}
      className="m-auto w-full max-w-sm rounded-2xl border border-hairline bg-canvas p-8 shadow-[0_20px_60px_rgba(74,21,75,0.15)] backdrop:bg-ink/40"
    >
      <h2 className="font-sans text-[18px] font-bold text-ink">{title}</h2>
      <p className="mt-2 font-sans text-[14px] leading-relaxed text-ink-mute">
        {description}
      </p>
      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="inline-flex items-center justify-center rounded-pill bg-canvas px-5 py-2.5 font-sans text-[14px] font-bold text-ink border border-hairline transition-colors hover:bg-canvas-lavender disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className="inline-flex items-center justify-center rounded-pill bg-semantic-error px-5 py-2.5 font-sans text-[14px] font-bold text-on-primary transition-colors hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Working…" : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
