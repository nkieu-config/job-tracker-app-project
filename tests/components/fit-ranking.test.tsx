import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { FitRanking } from "@/components/dashboard/fit-ranking";
import type { ApplicationFit } from "@/lib/insights";

const point = (over: Partial<ApplicationFit>): ApplicationFit => ({
  id: "a1",
  company: "Acme",
  role: "Frontend Engineer",
  status: "APPLIED",
  score: 0.82,
  ...over,
});

describe("FitRanking", () => {
  it("renders a row per application linking to its detail page", () => {
    render(<FitRanking points={[point({})]} />);
    const link = screen.getByRole("link", { name: /Frontend Engineer/ });
    expect(link).toHaveAttribute("href", "/dashboard/applications/a1");
    expect(within(link).getByText("Acme")).toBeInTheDocument();
  });

  it("shows the fit percentage rounded from the score", () => {
    render(<FitRanking points={[point({ score: 0.716 })]} />);
    expect(screen.getByText("72%")).toBeInTheDocument();
  });

  it("orders applications by descending fit score", () => {
    render(
      <FitRanking
        points={[
          point({ id: "low", role: "Low", score: 0.4 }),
          point({ id: "high", role: "High", score: 0.9 }),
          point({ id: "mid", role: "Mid", score: 0.65 }),
        ]}
      />,
    );
    const roles = screen
      .getAllByRole("link")
      .map((l) => within(l).getByText(/Low|High|Mid/).textContent);
    expect(roles).toEqual(["High", "Mid", "Low"]);
  });

  it("labels each row with its fit band", () => {
    render(
      <FitRanking
        points={[
          point({ id: "a", score: 0.75 }),
          point({ id: "b", score: 0.65 }),
          point({ id: "c", score: 0.4 }),
        ]}
      />,
    );
    expect(screen.getByText("Strong")).toBeInTheDocument();
    expect(screen.getByText("Moderate")).toBeInTheDocument();
    expect(screen.getByText("Weak")).toBeInTheDocument();
  });
});
