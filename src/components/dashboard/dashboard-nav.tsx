"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Briefcase, FileText } from "lucide-react";

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

export function DashboardNav({ orientation }: { orientation: "vertical" | "horizontal" }) {
  const pathname = usePathname();

  return (
    <ul
      className={
        orientation === "vertical"
          ? "flex flex-col gap-1"
          : "flex items-center gap-1"
      }
    >
      {NAV_ITEMS.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 font-sans text-[14px] font-bold transition-colors ${
                active
                  ? "bg-primary text-on-primary"
                  : "text-ink-mute hover:bg-canvas-lavender hover:text-ink"
              }`}
            >
              <item.icon size={18} strokeWidth={2} aria-hidden="true" />
              <span
                className={orientation === "horizontal" ? "hidden sm:inline" : ""}
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
