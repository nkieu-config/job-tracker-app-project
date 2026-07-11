"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Briefcase, FileText, Activity } from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
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
  orientation: "vertical" | "horizontal";
  isAdmin?: boolean;
}) {
  const pathname = usePathname();
  const items = isAdmin ? [...NAV_ITEMS, ...ADMIN_NAV_ITEMS] : NAV_ITEMS;

  return (
    <ul
      className={
        orientation === "vertical"
          ? "flex flex-col gap-1"
          : "flex items-center gap-1"
      }
    >
      {items.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 font-sans text-body font-bold transition-colors ${
                active
                  ? "bg-primary text-on-primary"
                  : "text-ink-mute hover:bg-canvas-lavender hover:text-ink"
              }`}
            >
              <item.icon size={18} strokeWidth={2} aria-hidden="true" />
              {/* `hidden` would drop the label from the accessibility tree,
                  leaving an icon-only link with no accessible name. */}
              <span
                className={
                  orientation === "horizontal" ? "sr-only sm:not-sr-only" : ""
                }
              >
                {item.label}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
