import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { ActivityChart } from "@/components/dashboard/activity-chart";
import {
  APPLICATION_STATUSES,
  type ApplicationStatus,
} from "@/lib/schemas/application";
import { zeroRecord } from "@/lib/records";
import type { WeeklyActivity } from "@/lib/insights";

function week(
  label: string,
  counts: Partial<Record<ApplicationStatus, number>>,
): WeeklyActivity {
  const merged = zeroRecord(APPLICATION_STATUSES);
  for (const [k, v] of Object.entries(counts)) {
    merged[k as ApplicationStatus] = v as number;
  }
  const total = Object.values(merged).reduce((a, b) => a + b, 0);
  return { weekStart: `2026-05-${label}T00:00:00.000Z`, label: `May ${label}`, counts: merged, total };
}

describe("ActivityChart", () => {
  it("renders one hit target per week with a labelled total", () => {
    const weeks = [week("04", { APPLIED: 2 }), week("11", {}), week("18", { INTERVIEW: 1 })];
    render(<ActivityChart weeks={weeks} />);

    expect(screen.getByRole("button", { name: "Week of May 04: 2 applications" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Week of May 11: 0 applications" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Week of May 18: 1 application" })).toBeInTheDocument();
  });

  it("exposes an accessible summary of the whole series", () => {
    const weeks = [week("04", { APPLIED: 2 }), week("11", { OFFER: 1 })];
    render(<ActivityChart weeks={weeks} />);
    expect(screen.getByRole("img", { name: /3 total/ })).toBeInTheDocument();
  });

  it("provides an sr-only table carrying every weekly count", () => {
    const weeks = [week("04", { APPLIED: 2, INTERVIEW: 1 })];
    render(<ActivityChart weeks={weeks} />);
    const table = screen.getByRole("table");
    const row = within(table).getByRole("row", { name: /May 04/ });
    expect(within(row).getAllByRole("cell").map((c) => c.textContent)).toContain("2");
  });

  it("shows an empty note when nothing landed in the window", () => {
    const weeks = [week("04", {}), week("11", {})];
    render(<ActivityChart weeks={weeks} />);
    expect(screen.getByText(/No applications in the last 2 weeks/)).toBeInTheDocument();
  });
});
