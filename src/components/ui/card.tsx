import { cn } from "@/lib/cn";

export function cardClass(className?: string): string {
  return cn("rounded-2xl border border-hairline bg-canvas", className);
}

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cardClass(className)} {...props} />;
}
