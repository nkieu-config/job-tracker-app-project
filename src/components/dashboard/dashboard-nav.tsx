"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sun, Briefcase, FileText, Activity } from "lucide-react";
import { cn } from "@/lib/cn";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Today", icon: Sun, exact: true },
  {
    href: "/dashboard/applications",
    label: "Applications",
    icon: Briefcase,
    exact: false,
  },
  { href: "/dashboard/resumes", label: "Resumes", icon: FileText, exact: false },
];

const ADMIN_NAV_ITEMS = [
  {
    href: "/dashboard/ai-usage",
    label: "AI usage",
    icon: Activity,
    exact: false,
  },
];

export function DashboardNav({
  orientation,
  isAdmin = false,
}: {
  orientation: "vertical" | "bottom";
  isAdmin?: boolean;
}) {
  const pathname = usePathname();
  const items = isAdmin ? [...NAV_ITEMS, ...ADMIN_NAV_ITEMS] : NAV_ITEMS;
  const bottom = orientation === "bottom";

  return (
    <ul className={bottom ? "flex" : "flex flex-col gap-1"}>
      {items.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        return (
          <li key={item.href} className={bottom ? "flex-1" : undefined}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "font-sans transition-colors",
                bottom
                  ? "flex flex-col items-center gap-1 px-1 py-2 text-fine font-semibold"
                  : "flex items-center gap-3 rounded-xl px-3 py-2.5 text-body font-bold",
                active
                  ? bottom
                    ? "text-primary"
                    : "bg-primary text-on-primary"
                  : "text-ink-mute hover:text-ink",
                !bottom && !active && "hover:bg-canvas-lavender",
              )}
            >
              <item.icon
                size={bottom ? 20 : 18}
                strokeWidth={2}
                aria-hidden="true"
              />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
