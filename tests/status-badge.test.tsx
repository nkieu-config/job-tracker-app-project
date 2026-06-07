import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { StatusBadge } from "@/app/dashboard/applications/status-badge";

afterEach(cleanup);

describe("StatusBadge", () => {
  it("renders the human label for a status", () => {
    render(<StatusBadge status="OFFER" />);
    expect(screen.getByText("Offer")).toBeInTheDocument();
  });

  it("renders the Interview label", () => {
    render(<StatusBadge status="INTERVIEW" />);
    expect(screen.getByText("Interview")).toBeInTheDocument();
  });
});
