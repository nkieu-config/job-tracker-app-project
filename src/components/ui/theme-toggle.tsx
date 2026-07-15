"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/cn";

type Theme = "system" | "light" | "dark";

const ORDER: Theme[] = ["system", "light", "dark"];
const ICON: Record<Theme, typeof Monitor> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
};
const LABEL: Record<Theme, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function getSnapshot(): Theme {
  const stored = localStorage.getItem("theme");
  return stored === "light" || stored === "dark" ? stored : "system";
}

function getServerSnapshot(): Theme {
  return "system";
}

function applyTheme(next: Theme) {
  if (next === "system") {
    localStorage.removeItem("theme");
    document.documentElement.removeAttribute("data-theme");
  } else {
    localStorage.setItem("theme", next);
    document.documentElement.setAttribute("data-theme", next);
  }
  listeners.forEach((listener) => listener());
}

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const Icon = ICON[theme];
  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];

  return (
    <button
      type="button"
      onClick={() => applyTheme(next)}
      aria-label={`Theme: ${LABEL[theme]}. Switch to ${LABEL[next]}.`}
      title={`Theme: ${LABEL[theme]}`}
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-hairline bg-canvas text-ink-mute transition-colors hover:bg-canvas-lavender hover:text-ink",
        className,
      )}
    >
      <Icon size={18} aria-hidden="true" />
    </button>
  );
}
