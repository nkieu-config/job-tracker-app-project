"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

export type Section = { id: string; label: string };

export function SectionNav({ sections }: { sections: Section[] }) {
  const [active, setActive] = useState(sections[0]?.id);

  useEffect(() => {
    const elements = sections
      .map((section) => document.getElementById(section.id))
      .filter((el): el is HTMLElement => el !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        const topmost = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
          )[0];
        if (topmost) setActive(topmost.target.id);
      },
      { rootMargin: "-15% 0px -75% 0px" },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  if (sections.length < 2) return null;

  return (
    <nav aria-label="On this page" className="hidden lg:block">
      <p className="mb-2 pl-3 font-sans text-fine font-medium uppercase tracking-wide text-ink-mute">
        On this page
      </p>
      <ul className="flex flex-col">
        {sections.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              aria-current={active === section.id ? "true" : undefined}
              className={cn(
                "block border-l-2 py-1 pl-3 pr-2 font-sans text-caption transition-colors",
                active === section.id
                  ? "border-primary font-semibold text-ink"
                  : "border-hairline font-medium text-ink-mute hover:border-ink-mute hover:text-ink",
              )}
            >
              {section.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
