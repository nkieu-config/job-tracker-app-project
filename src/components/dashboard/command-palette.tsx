"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { STATUS_LABELS, type ApplicationStatus } from "@/lib/schemas/application";
import { cn } from "@/lib/cn";

type IndexedApplication = {
  id: string;
  role: string;
  company: string;
  status: ApplicationStatus;
};

type Command = { id: string; label: string; hint: string; href: string };

const STATIC: Command[] = [
  { id: "today", label: "Today", hint: "Go", href: "/dashboard" },
  {
    id: "new",
    label: "New application",
    hint: "Go",
    href: "/dashboard/applications/new",
  },
  {
    id: "applications",
    label: "Applications",
    hint: "Go",
    href: "/dashboard/applications",
  },
  { id: "resumes", label: "Resumes", hint: "Go", href: "/dashboard/resumes" },
];

function score(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [apps, setApps] = useState<IndexedApplication[] | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((wasOpen) => {
          if (!wasOpen) {
            restoreTo.current = document.activeElement as HTMLElement | null;
            setQuery("");
            setActive(0);
          }
          return !wasOpen;
        });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  // The list is fetched the first time the palette opens and kept for the rest
  // of the session; a stale row costs a redirect to a page that says the
  // application is gone, which is cheaper than a request per keystroke.
  useEffect(() => {
    if (!open || apps !== null) return;
    let cancelled = false;
    fetch("/api/applications/search")
      .then((res) => (res.ok ? res.json() : { applications: [] }))
      .then((body: { applications?: IndexedApplication[] }) => {
        if (!cancelled) setApps(body.applications ?? []);
      })
      .catch(() => {
        if (!cancelled) setApps([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, apps]);

  function close() {
    setOpen(false);
    restoreTo.current?.focus();
  }

  if (!open) return null;

  const matches: Command[] = [
    ...STATIC.filter((c) => !query || score(c.label, query)),
    ...(apps ?? [])
      .filter((a) => !query || score(`${a.role} ${a.company}`, query))
      .slice(0, 8)
      .map((a) => ({
        id: a.id,
        label: a.role,
        hint: `${a.company} · ${STATUS_LABELS[a.status]}`,
        href: `/dashboard/applications/${a.id}`,
      })),
  ];

  function go(command: Command | undefined) {
    if (!command) return;
    close();
    router.push(command.href);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => (matches.length ? (i + 1) % matches.length : 0));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) =>
        matches.length ? (i - 1 + matches.length) % matches.length : 0,
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      go(matches[active]);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-ink/25 px-4 pt-[12vh]"
      onMouseDown={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
        className="w-full max-w-lg overflow-hidden rounded-xl border border-hairline bg-canvas shadow-lg"
      >
        <input
          ref={input}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          placeholder="Jump to an application, or a page…"
          aria-label="Search applications and pages"
          className="w-full border-b border-hairline bg-transparent px-4 py-3.5 font-sans text-body-lg text-ink outline-none placeholder:text-ink-mute"
        />

        {matches.length === 0 ? (
          <p className="px-4 py-6 font-sans text-body text-ink-mute">
            {apps === null ? "Loading…" : `Nothing matches “${query}”.`}
          </p>
        ) : (
          <ul className="max-h-80 overflow-y-auto py-1">
            {matches.map((command, i) => (
              <li key={`${command.href}-${command.id}`}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(command)}
                  aria-current={i === active ? "true" : undefined}
                  className={cn(
                    "flex w-full items-baseline justify-between gap-4 px-4 py-2.5 text-left",
                    i === active ? "bg-surface-hover" : "",
                  )}
                >
                  <span className="truncate font-sans text-body text-ink">
                    {command.label}
                  </span>
                  <span className="shrink-0 font-mono text-fine text-ink-mute">
                    {command.hint}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
