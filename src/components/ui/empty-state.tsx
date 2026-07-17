import { cn } from "@/lib/cn";

export function EmptyState({
  icon,
  title,
  children,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title?: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-hairline bg-canvas p-10 text-center",
        className,
      )}
    >
      {icon}
      {title && (
        <p className="font-sans text-body-lg font-bold text-ink">{title}</p>
      )}
      {children && (
        <div className="font-sans text-body-lg text-ink-mute">{children}</div>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
