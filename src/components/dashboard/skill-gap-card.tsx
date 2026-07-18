import { Target } from "lucide-react";
import type { SkillGap } from "@/lib/insights";
import { EmptyState } from "@/components/ui/empty-state";

export function SkillGapCard({
  gaps,
  analyzedCount,
}: {
  gaps: SkillGap[];
  analyzedCount: number;
}) {
  if (gaps.length === 0) {
    return (
      <EmptyState className="flex-1 justify-center border-0 bg-transparent p-0">
        {analyzedCount === 0
          ? "Analyze a job description to see which skills come up most across your roles."
          : "No recurring skill gaps — your resumes cover the skills your roles ask for."}
      </EmptyState>
    );
  }

  const max = gaps[0].count;

  return (
    <ul className="flex flex-col gap-2.5">
      {gaps.map((gap) => (
        <li key={gap.skill} className="flex items-center gap-3">
          <Target
            size={14}
            aria-hidden="true"
            className="shrink-0 text-ink-mute"
          />
          <span className="min-w-0 flex-1 truncate font-sans text-body font-medium text-ink">
            {gap.skill}
          </span>
          <div
            className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-hairline sm:block"
            aria-hidden="true"
          >
            <div
              className="h-full rounded-full bg-semantic-warning"
              style={{ width: `${Math.round((gap.count / max) * 100)}%` }}
            />
          </div>
          <span className="shrink-0 font-mono text-caption tabular-nums text-ink-mute">
            {gap.count} role{gap.count === 1 ? "" : "s"}
          </span>
        </li>
      ))}
    </ul>
  );
}
