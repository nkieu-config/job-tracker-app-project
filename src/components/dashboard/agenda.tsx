import Link from "next/link";
import type { AgendaItem } from "@/lib/agenda";

export function Agenda({ items }: { items: AgendaItem[] }) {
  if (items.length === 0) {
    return (
      <p className="font-serif text-body-lg leading-relaxed text-ink-mute">
        Nothing is waiting on you. Every posting has been read, every interview
        has a sheet, and nothing has gone quiet.
      </p>
    );
  }

  return (
    <ul className="flex flex-col">
      {items.map((item) => (
        <li key={item.id} className="border-t border-hairline first:border-t-0">
          <Link
            href={`/dashboard/applications/${item.id}`}
            className="flex gap-4 py-4 transition-colors hover:bg-surface-hover"
          >
            <span
              className={`w-20 shrink-0 pt-0.5 font-mono text-caption tabular-nums ${
                item.urgent ? "text-semantic-error" : "text-ink-mute"
              }`}
            >
              {item.when}
            </span>
            <span className="min-w-0">
              <span className="block font-sans text-body font-semibold text-ink">
                {item.what} — {item.role}
              </span>
              <span className="mt-0.5 block font-sans text-caption text-ink-mute">
                {item.company} · {item.why}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
