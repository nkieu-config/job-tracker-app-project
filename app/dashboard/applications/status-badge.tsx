import {
  STATUS_LABELS,
  type ApplicationStatus,
} from "@/lib/validations/application";
import { STATUS_COLORS } from "@/lib/status-colors";

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status].badge}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
