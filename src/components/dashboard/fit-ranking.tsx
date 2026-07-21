import Link from "next/link";
import { fitBand } from "@/components/ui/fit-score";
import { STATUS_COLORS } from "@/components/ui/status-colors";
import { STATUS_LABELS } from "@/lib/schemas/application";
import { cn } from "@/lib/cn";
import type { ApplicationFit } from "@/lib/insights";

const BAND_FILL: Record<string, string> = {
  success: "bg-semantic-success",
  warning: "bg-semantic-warning",
  error: "bg-semantic-error",
};

const BAND_TEXT: Record<string, string> = {
  success: "text-semantic-success",
  warning: "text-semantic-warning",
  error: "text-semantic-error",
};

export function FitRanking({ points }: { points: ApplicationFit[] }) {
  const sorted = [...points].sort((a, b) => b.score - a.score);

  return (
    <ul className="flex flex-col gap-3">
      {sorted.map((point) => {
        const band = fitBand(point.score);
        const pct = Math.round(point.score * 100);
        return (
          <li key={point.id}>
            <Link
              href={`/dashboard/applications/${point.id}`}
              className="group grid grid-cols-1 gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-canvas-lavender sm:grid-cols-[minmax(0,1fr)_150px] sm:items-center sm:gap-4"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-full",
                    STATUS_COLORS[point.status].dot,
                  )}
                  title={STATUS_LABELS[point.status]}
                />
                <span className="truncate font-sans text-body font-medium text-ink group-hover:underline">
                  {point.role}
                </span>
                <span className="truncate font-sans text-caption text-ink-mute">
                  {point.company}
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-hairline">
                  <div
                    className={cn("h-full rounded-full", BAND_FILL[band.tone])}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-9 shrink-0 text-right font-mono text-caption tabular-nums text-ink">
                  {pct}%
                </span>
                <span
                  className={cn(
                    "hidden shrink-0 font-sans text-fine font-semibold sm:inline",
                    BAND_TEXT[band.tone],
                  )}
                >
                  {band.label.replace(" fit", "")}
                </span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
