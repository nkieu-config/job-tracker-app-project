import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/actions/applications", () => ({ updateApplicationStatus: vi.fn() }));
vi.mock("@/components/ui/toast", () => ({ useToast: () => vi.fn() }));

const { ApplicationsBoard } = await import("@/components/applications/board");

const APPS = [
  {
    id: "a1",
    role: "Backend Engineer",
    company: "Acme",
    status: "SAVED" as const,
    deadline: null,
  },
];

describe("ApplicationsBoard accessibility", () => {
  it("never nests the card link inside an interactive drag control", () => {
    render(<ApplicationsBoard applications={APPS} />);
    const link = screen.getByRole("link", { name: /Backend Engineer/ });

    let ancestor = link.parentElement;
    while (ancestor) {
      expect(ancestor.getAttribute("role")).not.toBe("button");
      expect(ancestor.tagName).not.toBe("BUTTON");
      expect(ancestor.hasAttribute("tabindex")).toBe(false);
      ancestor = ancestor.parentElement;
    }
  });

  it("exposes exactly one link and one labelled drag handle per card", () => {
    render(<ApplicationsBoard applications={APPS} />);

    expect(screen.getAllByRole("link", { name: /Backend Engineer/ })).toHaveLength(1);
    expect(
      screen.getByRole("button", { name: "Reorder Backend Engineer at Acme" }),
    ).toBeInTheDocument();
  });

  it("collapses a column at every breakpoint, so aria-expanded is never a lie", () => {
    render(<ApplicationsBoard applications={APPS} />);
    const header = screen.getByRole("button", { name: /Saved/ });
    expect(header).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(header);

    expect(header).toHaveAttribute("aria-expanded", "false");
    const body = screen.getByRole("link", { name: /Backend Engineer/ })
      .parentElement!.parentElement!;
    expect(body.className).toContain("hidden");
    expect(body.className).not.toMatch(/lg:(flex|block|grid)\b/);
  });
});
