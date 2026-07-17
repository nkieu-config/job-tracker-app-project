import Link from "next/link";
import { cn } from "@/lib/cn";

export type SegmentedItem = {
  label: string;
  href: string;
  active: boolean;
};

export function SegmentedControl({
  ariaLabel,
  items,
}: {
  ariaLabel: string;
  items: SegmentedItem[];
}) {
  return (
    <nav
      aria-label={ariaLabel}
      className="flex rounded-lg border border-hairline bg-canvas p-0.5"
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className={cn(
            "rounded-md px-3 py-1 font-sans text-body font-medium transition-colors",
            item.active
              ? "bg-primary text-on-primary"
              : "text-ink-mute hover:bg-canvas-lavender hover:text-ink",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function filterChipClass({
  active = false,
  className,
}: {
  active?: boolean;
  className?: string;
} = {}): string {
  return cn(
    "rounded-md px-3 py-1.5 font-sans text-caption font-medium transition-colors",
    active
      ? "bg-primary text-on-primary"
      : "bg-canvas text-ink-mute border border-hairline hover:bg-canvas-lavender hover:text-ink",
    className,
  );
}
