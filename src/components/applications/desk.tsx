"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type DeskTab = { id: string; label: string; panel: ReactNode };

// Two panes: the posting on the left, you on the right. Every tab's panel stays
// mounted and is hidden rather than unmounted — TailorBullets and InterviewPrep
// abort their stream on unmount, so switching tabs mid-generation would cancel
// a metered Gemini call and throw the tokens away.
export function Desk({
  posting,
  tabs,
  initialTabId,
}: {
  posting: ReactNode;
  tabs: DeskTab[];
  initialTabId?: string;
}) {
  const fallback = tabs[0]?.id;
  const [active, setActive] = useState(
    initialTabId && tabs.some((t) => t.id === initialTabId)
      ? initialTabId
      : fallback,
  );
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const current = tabs.findIndex((t) => t.id === active);
    if (current === -1) return;
    let next = -1;
    if (event.key === "ArrowRight") next = (current + 1) % tabs.length;
    else if (event.key === "ArrowLeft")
      next = (current - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    if (next === -1) return;
    event.preventDefault();
    const id = tabs[next].id;
    setActive(id);
    tabRefs.current[id]?.focus();
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-8">
      {/* The pane scrolls on its own at wide widths, which makes it unreachable
          by keyboard unless it can take focus — a mouse can scroll it, a
          keyboard could not. */}
      <div
        role="region"
        aria-label="Job posting"
        tabIndex={0}
        className="lg:sticky lg:top-6 lg:max-h-[calc(100dvh-5rem)] lg:overflow-y-auto lg:pr-1"
      >
        {posting}
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        <div
          role="tablist"
          aria-label="Your side of this application"
          onKeyDown={onKeyDown}
          className="flex gap-1 border-b border-hairline"
        >
          {tabs.map((tab) => {
            const selected = tab.id === active;
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  tabRefs.current[tab.id] = el;
                }}
                type="button"
                role="tab"
                id={`desk-tab-${tab.id}`}
                aria-selected={selected}
                aria-controls={`desk-panel-${tab.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(tab.id)}
                className={cn(
                  "-mb-px border-b-2 px-3 py-2 font-sans text-body font-semibold transition-colors",
                  selected
                    ? "border-primary-ink text-ink"
                    : "border-transparent text-ink-mute hover:text-ink",
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {tabs.map((tab) => (
          <div
            key={tab.id}
            role="tabpanel"
            id={`desk-panel-${tab.id}`}
            aria-labelledby={`desk-tab-${tab.id}`}
            hidden={tab.id !== active}
            tabIndex={0}
            className="focus-visible:outline-none"
          >
            {tab.panel}
          </div>
        ))}
      </div>
    </div>
  );
}
