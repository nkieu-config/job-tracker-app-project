import { cn } from "@/lib/cn";

const LOGO_SIZES = {
  sm: { box: "size-7", glyph: "" },
  md: { box: "h-8 w-8", glyph: "text-xl" },
  lg: { box: "h-12 w-12", glyph: "text-2xl" },
} as const;

export type LogoSize = keyof typeof LOGO_SIZES;

export function LogoMark({
  size = "md",
  className,
}: {
  size?: LogoSize;
  className?: string;
}) {
  const { box, glyph } = LOGO_SIZES[size];
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md bg-primary",
        box,
        className,
      )}
    >
      <span className={cn("font-bold leading-none text-on-primary", glyph)}>
        A
      </span>
    </div>
  );
}
