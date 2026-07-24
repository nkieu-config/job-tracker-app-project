import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { encodeStreamEnd, type StreamEnd } from "@/lib/stream-protocol";

const saveInterviewPrep = vi.fn();
vi.mock("@/actions/applications", () => ({
  saveInterviewPrep: (...args: unknown[]) => saveInterviewPrep(...args),
}));

const toast = vi.fn();
vi.mock("@/components/ui/toast", () => ({ useToast: () => toast }));

const { InterviewPrep } = await import("@/components/applications/interview-prep");

function respondWith(parts: string[]) {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const part of parts) controller.enqueue(encoder.encode(part));
      controller.close();
    },
  });
  const fetch = vi.fn().mockResolvedValue(new Response(body, { status: 200 }));
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

function respondWithPrep(text: string, end: StreamEnd) {
  return respondWith([text, encodeStreamEnd(end)]);
}

function generate() {
  render(<InterviewPrep id="app-1" />);
  fireEvent.click(screen.getByRole("button", { name: /draft my prep sheet/i }));
}

const SHEET = [
  "Technical questions",
  "- How would you scale this API?",
  "  Strong answers cover: caching and pagination.",
  "- How do you migrate a live schema?",
  "  Strong answers cover: backwards-compatible steps.",
  "",
  "Questions to ask the interviewer",
  "- What does on-call look like?",
].join("\n");

beforeEach(() => {
  saveInterviewPrep.mockReset().mockResolvedValue({ error: null });
  toast.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("InterviewPrep", () => {
  it("posts to its own endpoint and saves the prep sheet on success", async () => {
    const fetch = respondWithPrep("Q1. Why this role?", { ok: true });
    generate();

    await waitFor(() => expect(saveInterviewPrep).toHaveBeenCalledTimes(1));
    expect(fetch.mock.calls[0][0]).toBe("/api/applications/app-1/interview");
    expect(saveInterviewPrep).toHaveBeenCalledWith("app-1", "Q1. Why this role?");
    expect(toast).toHaveBeenCalledWith("Interview prep saved to this application.");
  });

  it("does not persist a truncated response when the stream reports failure", async () => {
    respondWithPrep("Q1. Why this ro", {
      ok: false,
      error: "The AI stopped responding before it finished.",
    });
    generate();

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/stopped responding/i),
    );
    expect(saveInterviewPrep).not.toHaveBeenCalled();
  });

  // The routes answer a rejection with the shared JSON error shape, so the
  // client must read the message out of it rather than showing the raw body.
  it("surfaces the message from a rejected request", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json(
          { error: "AI rate limit reached. Please try again later." },
          { status: 429 },
        ),
      ),
    );
    generate();

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/rate limit reached/i),
    );
    expect(saveInterviewPrep).not.toHaveBeenCalled();
  });

  it("falls back to its own wording when a rejection carries no message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("<html>502</html>", { status: 502 })),
    );
    generate();

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        /failed to generate interview prep/i,
      ),
    );
  });

  // A sheet that shows the answer beside the question is something to read; the
  // point of the panel is that you try first.
  it("keeps each answer key collapsed until the reader opens it", async () => {
    respondWithPrep(SHEET, { ok: true });
    generate();

    await waitFor(() =>
      expect(screen.getByText(/how would you scale this api/i)).toBeVisible(),
    );
    expect(screen.getByText(/caching and pagination/i)).not.toBeVisible();

    fireEvent.click(screen.getByText(/how would you scale this api/i));
    expect(screen.getByText(/caching and pagination/i)).toBeVisible();
  });

  it("offers a drill over the questions you answer, not the ones you ask", async () => {
    respondWithPrep(SHEET, { ok: true });
    generate();

    const practise = await screen.findByRole("button", {
      name: /practise 2 questions/i,
    });
    fireEvent.click(practise);

    expect(screen.getByText(/how would you scale this api/i)).toBeVisible();
    expect(screen.queryByText(/caching and pagination/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /show the answer/i }));
    expect(screen.getByText(/caching and pagination/i)).toBeVisible();
  });

  it("shows output verbatim when the model ignored the section contract", async () => {
    respondWithPrep("Some free-form thoughts about the role.", { ok: true });
    generate();

    await waitFor(() =>
      expect(screen.getByText(/free-form thoughts/i)).toBeVisible(),
    );
    expect(
      screen.queryByRole("button", { name: /practise/i }),
    ).not.toBeInTheDocument();
  });
});
