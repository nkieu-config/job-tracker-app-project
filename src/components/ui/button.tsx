import { cn } from "@/lib/cn";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "danger-solid";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-sans font-bold whitespace-nowrap transition-colors disabled:opacity-60 disabled:cursor-not-allowed";

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-press",
  secondary: "bg-canvas-lavender text-ink hover:bg-canvas-lavender-hover",
  outline:
    "bg-canvas text-primary border-2 border-primary hover:bg-canvas-lavender",
  ghost: "bg-canvas text-ink border border-hairline hover:bg-canvas-lavender",
  danger:
    "bg-semantic-error-tint text-semantic-error hover:bg-semantic-error-hover",
  "danger-solid": "bg-semantic-error-solid text-on-primary hover:opacity-90",
};

const SIZE: Record<ButtonSize, string> = {
  sm: "text-body py-2 px-4",
  md: "text-body tracking-[0.144px] py-2.5 px-5",
  lg: "text-body-lg tracking-[0.2px] py-3.5 px-7",
};

export function buttonClass({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}): string {
  return cn(base, VARIANT[variant], SIZE[size], className);
}

export function Button({
  variant = "primary",
  size = "md",
  type = "button",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      type={type}
      className={buttonClass({ variant, size, className })}
      {...props}
    />
  );
}
