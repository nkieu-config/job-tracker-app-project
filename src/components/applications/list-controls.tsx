"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { inputClass } from "@/components/ui/form-styles";
import { isOneOf } from "@/lib/guards";
import {
  APPLICATION_SORTS,
  SORT_LABELS,
  type ApplicationSort,
  type ApplicationStatus,
} from "@/lib/schemas/application";

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
  const [, startTransition] = useTransition();
  const [optimisticSort, setOptimisticSort] = useOptimistic(sort);

  function apply(nextQuery: string, nextSort: ApplicationSort) {
    const params = new URLSearchParams({ view: "list" });
    if (status) params.set("status", status);
    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    if (nextSort !== "newest") params.set("sort", nextSort);
    startTransition(() => {
      setOptimisticSort(nextSort);
      router.push(`/dashboard/applications?${params.toString()}`);
    });
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
        key={query}
        type="search"
        name="q"
        defaultValue={query}
        placeholder="Search company or role…"
        aria-label="Search applications"
        autoComplete="off"
        className={`${inputClass} flex-1 text-body`}
      />
      <label className="flex items-center gap-2 font-sans text-body text-ink-mute">
        Sort by
        <select
          value={optimisticSort}
          onChange={(e) => {
            const next = e.target.value;
            if (isOneOf(APPLICATION_SORTS, next)) apply(query, next);
          }}
          aria-label="Sort applications"
          className={`${inputClass} text-body`}
        >
          {APPLICATION_SORTS.map((value) => (
            <option key={value} value={value}>
              {SORT_LABELS[value]}
            </option>
          ))}
        </select>
      </label>
    </form>
  );
}
