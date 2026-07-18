"use client";

import { cn } from "@/lib/cn";

export function ChartTooltip({
  x,
  align = "center",
  title,
  children,
}: {
  x: number;
  align?: "center" | "left" | "right";
  title: string;
  children: React.ReactNode;
}) {
  const translate =
    align === "left"
      ? "translate-x-0"
      : align === "right"
        ? "-translate-x-full"
        : "-translate-x-1/2";

  return (
    <div
      role="presentation"
      style={{ left: `${x}%` }}
      className={cn(
        "pointer-events-none absolute bottom-full z-10 mb-2 w-max max-w-56 rounded-lg border border-hairline bg-canvas p-3 shadow-md",
        translate,
      )}
    >
      <p className="font-sans text-caption font-bold text-ink">{title}</p>
      <div className="mt-1.5 flex flex-col gap-1">{children}</div>
    </div>
  );
}

export function TooltipRow({
  swatch,
  label,
  value,
}: {
  swatch?: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 font-sans text-caption text-ink-mute">
      {swatch && <span className={cn("h-2 w-2 shrink-0 rounded-full", swatch)} />}
      <span className="flex-1 whitespace-nowrap">{label}</span>
      <span className="font-mono tabular-nums text-ink">{value}</span>
    </div>
  );
}
