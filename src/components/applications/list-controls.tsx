"use client";

import { useRouter } from "next/navigation";
import { inputClass } from "@/lib/form-styles";
import type { ApplicationSort } from "@/lib/data/applications";
import type { ApplicationStatus } from "@/lib/schemas/application";

const SORT_OPTIONS: { value: ApplicationSort; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "deadline", label: "Deadline (soonest)" },
  { value: "company", label: "Company (A–Z)" },
];

export function ListControls({
  query,
  sort,
  status,
}: {
  query: string;
  sort: ApplicationSort;
  status?: ApplicationStatus;
}) {
  const router = useRouter();

  function apply(nextQuery: string, nextSort: ApplicationSort) {
    const params = new URLSearchParams({ view: "list" });
    if (status) params.set("status", status);
    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    if (nextSort !== "newest") params.set("sort", nextSort);
    router.push(`/dashboard/applications?${params.toString()}`);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const value = new FormData(e.currentTarget).get("q");
        apply(String(value ?? ""), sort);
      }}
      className="flex flex-col gap-2 sm:flex-row sm:items-center"
    >
      <input
        type="search"
        name="q"
        defaultValue={query}
        placeholder="Search company or role…"
        aria-label="Search applications"
        autoComplete="off"
        className={`${inputClass} flex-1 text-[14px]`}
      />
      <label className="flex items-center gap-2 font-sans text-[14px] text-ink-mute">
        Sort by
        <select
          value={sort}
          onChange={(e) => apply(query, e.target.value as ApplicationSort)}
          aria-label="Sort applications"
          className={`${inputClass} text-[14px]`}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </form>
  );
}
