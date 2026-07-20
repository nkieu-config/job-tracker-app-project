import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ToastProvider, useToast } from "@/components/ui/toast";

function Harness() {
  const toast = useToast();
  return (
    <>
      <button type="button" onClick={() => toast("Saved.")}>
        succeed
      </button>
      <button type="button" onClick={() => toast("Could not save.", "error")}>
        fail
      </button>
    </>
  );
}

function renderToasts() {
  render(
    <ToastProvider>
      <Harness />
    </ToastProvider>,
  );
}

describe("ToastProvider announcements", () => {
  it("announces errors assertively", () => {
    renderToasts();
    fireEvent.click(screen.getByRole("button", { name: "fail" }));

    const region = screen.getByText("Could not save.").closest("[aria-live]");
    expect(region).toHaveAttribute("aria-live", "assertive");
    expect(region).toHaveAttribute("role", "alert");
  });

  it("announces successes politely so they don't interrupt", () => {
    renderToasts();
    fireEvent.click(screen.getByRole("button", { name: "succeed" }));

    const region = screen.getByText("Saved.").closest("[aria-live]");
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region).not.toHaveAttribute("role", "alert");
  });

  it("keeps the two severities in separate regions", () => {
    renderToasts();
    fireEvent.click(screen.getByRole("button", { name: "succeed" }));
    fireEvent.click(screen.getByRole("button", { name: "fail" }));

    const polite = screen.getByText("Saved.").closest("[aria-live]");
    const assertive = screen
      .getByText("Could not save.")
      .closest("[aria-live]");
    expect(polite).not.toBe(assertive);
  });

  it("removes a toast when dismissed", () => {
    renderToasts();
    fireEvent.click(screen.getByRole("button", { name: "fail" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Dismiss notification" }),
    );

    expect(screen.queryByText("Could not save.")).not.toBeInTheDocument();
  });
});
