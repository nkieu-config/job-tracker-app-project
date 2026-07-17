import { cn } from "@/lib/cn";

export type BadgeTone = "neutral" | "primary" | "success" | "warning" | "error";
export type BadgeSize = "sm" | "md";

const base = "inline-flex items-center rounded-md font-sans font-medium";

const TONE: Record<BadgeTone, string> = {
  neutral: "bg-canvas-lavender text-ink-mute",
  primary: "bg-canvas-lavender text-primary",
  success: "bg-semantic-success-tint text-semantic-success",
  warning: "bg-semantic-warning-tint text-semantic-warning",
  error: "bg-semantic-error-tint text-semantic-error",
};

const SIZE: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-fine",
  md: "px-2.5 py-1 text-caption",
};

export function badgeClass({
  tone = "neutral",
  size = "sm",
  className,
}: {
  tone?: BadgeTone;
  size?: BadgeSize;
  className?: string;
} = {}): string {
  return cn(base, TONE[tone], SIZE[size], className);
}

export function Badge({
  tone = "neutral",
  size = "sm",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
  size?: BadgeSize;
}) {
  return <span className={badgeClass({ tone, size, className })} {...props} />;
}

const DOT: Record<BadgeTone, string> = {
  neutral: "bg-ink-mute",
  primary: "bg-primary",
  success: "bg-semantic-success",
  warning: "bg-semantic-warning",
  error: "bg-semantic-error",
};

export function Dot({
  tone = "neutral",
  className,
}: {
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block size-1.5 shrink-0 rounded-full", DOT[tone], className)}
    />
  );
}
