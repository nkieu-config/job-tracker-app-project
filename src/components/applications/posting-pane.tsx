"use client";

import { useState, type ReactNode } from "react";

// On a phone the two panes stack, so a long posting would bury the tabs under
// several screens of scrolling. Clamp it there and let the reader open it;
// on a wide screen the pane gets its own scroll and no clamp is needed.
export function PostingPane({
  children,
  clampable,
}: {
  children: ReactNode;
  clampable: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!clampable) return <>{children}</>;

  return (
    <div>
      <div
        className={
          expanded
            ? ""
            : "relative max-h-[45svh] overflow-hidden after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-24 after:bg-gradient-to-t after:from-canvas-lavender after:to-transparent lg:max-h-none lg:overflow-visible lg:after:hidden"
        }
      >
        {children}
      </div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-2 font-sans text-caption font-semibold text-link-blue underline-offset-4 hover:underline lg:hidden"
      >
        {expanded ? "Collapse posting" : "Show the full posting"}
      </button>
    </div>
  );
}
