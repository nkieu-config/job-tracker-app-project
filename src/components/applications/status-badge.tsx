import {
  STATUS_LABELS,
  type ApplicationStatus,
} from "@/lib/schemas/application";
import { STATUS_COLORS } from "@/components/ui/status-colors";

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-sans text-caption font-medium text-ink">
      <span
        aria-hidden="true"
        className={`size-1.5 shrink-0 rounded-full ${STATUS_COLORS[status].dot}`}
      />
      {STATUS_LABELS[status]}
    </span>
  );
}
