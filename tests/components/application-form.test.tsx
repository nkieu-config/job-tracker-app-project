import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

const autofillFromJd = vi.fn();
vi.mock("@/actions/applications", () => ({
  autofillFromJd: (...args: unknown[]) => autofillFromJd(...args),
}));

const { ApplicationForm } = await import(
  "@/components/applications/application-form"
);

const POSTING =
  "We are hiring a Senior Frontend Engineer at Acme Corp to own the design system and ship accessible components.";

function setup() {
  render(
    <ApplicationForm
      action={async () => ({})}
      submitLabel="Save"
      cancelHref="/dashboard/applications"
    />,
  );
  fireEvent.input(screen.getByLabelText(/job posting/i), {
    target: { value: POSTING },
  });
}

function read() {
  fireEvent.click(screen.getByRole("button", { name: /read the posting/i }));
}

beforeEach(() => {
  autofillFromJd.mockReset().mockResolvedValue({
    fields: { company: "Acme Corp", role: "Senior Frontend Engineer", deadline: null },
  });
});

describe("ApplicationForm", () => {
  it("will not read a posting too short to say anything", () => {
    render(
      <ApplicationForm
        action={async () => ({})}
        submitLabel="Save"
        cancelHref="/x"
      />,
    );
    expect(
      screen.getByRole("button", { name: /read the posting/i }),
    ).toBeDisabled();
  });

  it("fills the fields it could read and says so", async () => {
    setup();
    read();

    await waitFor(() =>
      expect(screen.getByLabelText(/company/i)).toHaveValue("Acme Corp"),
    );
    expect(screen.getByLabelText(/role/i)).toHaveValue(
      "Senior Frontend Engineer",
    );
    expect(screen.getAllByText(/read from the posting/i)).toHaveLength(2);
  });

  // A model that guesses a deadline it never saw is worse than one that admits
  // it did not find one.
  it("admits a field the posting never stated instead of guessing", async () => {
    setup();
    read();

    await waitFor(() =>
      expect(screen.getByText(/not stated — add it yourself/i)).toBeVisible(),
    );
    expect(screen.getByLabelText(/deadline/i)).toHaveValue("");
  });

  it("drops the mark as soon as you edit the field yourself", async () => {
    setup();
    read();

    await waitFor(() =>
      expect(screen.getAllByText(/read from the posting/i)).toHaveLength(2),
    );
    fireEvent.input(screen.getByLabelText(/company/i), {
      target: { value: "Acme Corporation" },
    });
    expect(screen.getAllByText(/read from the posting/i)).toHaveLength(1);
  });

  it("never overwrites something you typed first", async () => {
    setup();
    fireEvent.input(screen.getByLabelText(/company/i), {
      target: { value: "My own answer" },
    });
    read();

    await waitFor(() =>
      expect(screen.getByLabelText(/role/i)).toHaveValue(
        "Senior Frontend Engineer",
      ),
    );
    expect(screen.getByLabelText(/company/i)).toHaveValue("My own answer");
  });

  it("clears only what it filled", async () => {
    setup();
    read();

    await waitFor(() =>
      expect(screen.getByLabelText(/company/i)).toHaveValue("Acme Corp"),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /clear what it filled/i }),
    );
    expect(screen.getByLabelText(/company/i)).toHaveValue("");
    expect(screen.getByLabelText(/job posting/i)).toHaveValue(POSTING);
  });

  it("surfaces a refusal from the action", async () => {
    autofillFromJd.mockResolvedValue({ error: "AI rate limit reached." });
    setup();
    read();

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/rate limit/i),
    );
  });
});
