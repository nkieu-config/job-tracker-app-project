"use client";

import { useState } from "react";
import {
  APPLICATION_STATUSES,
  STATUS_LABELS,
  type ApplicationStatus,
} from "@/lib/schemas/application";
import { STATUS_COLORS } from "@/components/ui/status-colors";
import { niceScale, stackSegments } from "@/lib/chart";
import { cn } from "@/lib/cn";
import type { WeeklyActivity } from "@/server/data/insights";
import { ChartTooltip, TooltipRow } from "./chart-tooltip";

const W = 480;
const H = 150;
const PLOT_TOP = 8;
const PLOT_BOTTOM = 126;
const PLOT_H = PLOT_BOTTOM - PLOT_TOP;

const swatch: Record<ApplicationStatus, string> = {
  SAVED: "bg-zinc-400",
  APPLIED: "bg-blue-500",
  INTERVIEW: "bg-amber-500",
  OFFER: "bg-green-500",
  REJECTED: "bg-red-400",
};

export function ActivityChart({ weeks }: { weeks: WeeklyActivity[] }) {
  const [active, setActive] = useState<number | null>(null);

  const n = weeks.length;
  const slotW = W / n;
  const barW = Math.min(slotW * 0.55, 18);
  const grandTotal = weeks.reduce((sum, w) => sum + w.total, 0);
  const { max, ticks } = niceScale(Math.max(...weeks.map((w) => w.total)));

  const y = (value: number) => PLOT_BOTTOM - (value / max) * PLOT_H;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`Applications added per week over the last ${n} weeks — ${grandTotal} total.`}
      >
        {ticks.map((tick) => (
          <line
            key={tick}
            x1={0}
            x2={W}
            y1={y(tick)}
            y2={y(tick)}
            className={tick === 0 ? "stroke-ink-mute/40" : "stroke-hairline"}
            strokeWidth={1}
          />
        ))}

        {weeks.map((week, i) => {
          const cx = i * slotW + slotW / 2;
          const counts = APPLICATION_STATUSES.map((s) => week.counts[s]);
          const segments = stackSegments(counts);
          return (
            <g key={week.weekStart}>
              {active === i && (
                <rect
                  x={i * slotW + 1}
                  y={PLOT_TOP}
                  width={slotW - 2}
                  height={PLOT_H}
                  rx={4}
                  className="fill-canvas-lavender"
                />
              )}
              {segments.map((seg, si) =>
                seg.size > 0 ? (
                  <rect
                    key={APPLICATION_STATUSES[si]}
                    x={cx - barW / 2}
                    y={y(seg.start + seg.size)}
                    width={barW}
                    height={(seg.size / max) * PLOT_H}
                    rx={2}
                    className={STATUS_COLORS[APPLICATION_STATUSES[si]].chartFill}
                  />
                ) : null,
              )}
            </g>
          );
        })}

        {weeks.map((week, i) =>
          i % 2 === 0 || i === n - 1 ? (
            <text
              key={week.weekStart}
              x={i * slotW + slotW / 2}
              y={H - 4}
              textAnchor="middle"
              className="fill-ink-mute font-mono text-[9px]"
            >
              {week.label}
            </text>
          ) : null,
        )}
      </svg>

      <div className="absolute inset-x-0 top-0 flex" style={{ height: "84%" }}>
        {weeks.map((week, i) => (
          <button
            key={week.weekStart}
            type="button"
            className="flex-1 cursor-default rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            aria-label={`Week of ${week.label}: ${week.total} application${week.total === 1 ? "" : "s"}`}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
          />
        ))}
      </div>

      {active !== null && weeks[active].total > 0 && (
        <ChartTooltip
          x={((active + 0.5) / n) * 100}
          align={active < 2 ? "left" : active > n - 3 ? "right" : "center"}
          title={`Week of ${weeks[active].label}`}
        >
          {APPLICATION_STATUSES.filter((s) => weeks[active].counts[s] > 0).map(
            (s) => (
              <TooltipRow
                key={s}
                swatch={swatch[s]}
                label={STATUS_LABELS[s]}
                value={String(weeks[active].counts[s])}
              />
            ),
          )}
          <TooltipRow label="Total" value={String(weeks[active].total)} />
        </ChartTooltip>
      )}

      {grandTotal === 0 && (
        <p className="absolute inset-0 flex items-center justify-center font-sans text-body text-ink-mute">
          No applications in the last {n} weeks.
        </p>
      )}

      <table className="sr-only">
        <caption>Applications added per week, by status</caption>
        <thead>
          <tr>
            <th scope="col">Week</th>
            {APPLICATION_STATUSES.map((s) => (
              <th key={s} scope="col">
                {STATUS_LABELS[s]}
              </th>
            ))}
            <th scope="col">Total</th>
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week.weekStart}>
              <th scope="row">{week.label}</th>
              {APPLICATION_STATUSES.map((s) => (
                <td key={s}>{week.counts[s]}</td>
              ))}
              <td>{week.total}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul
        className={cn(
          "mt-3 flex flex-wrap gap-x-4 gap-y-1.5",
          grandTotal === 0 && "invisible",
        )}
      >
        {APPLICATION_STATUSES.map((s) => (
          <li
            key={s}
            className="flex items-center gap-1.5 font-sans text-fine text-ink-mute"
          >
            <span className={cn("h-2 w-2 rounded-full", swatch[s])} />
            {STATUS_LABELS[s]}
          </li>
        ))}
      </ul>
    </div>
  );
}
