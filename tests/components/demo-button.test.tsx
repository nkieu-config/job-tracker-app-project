import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const signInEmail = vi.fn();
vi.mock("@/lib/auth-client", () => ({
  signIn: { email: (...a: unknown[]) => signInEmail(...a) },
}));

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const toast = vi.fn();
vi.mock("@/components/ui/toast", () => ({ useToast: () => toast }));

const { DemoButton } = await import("@/components/auth/demo-button");

beforeEach(() => {
  signInEmail.mockReset();
  push.mockReset();
  toast.mockReset();
});

describe("DemoButton", () => {
  it("navigates to the dashboard on a successful sign-in", async () => {
    signInEmail.mockResolvedValue({ error: null });
    render(<DemoButton />);

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard"));
  });

  it("reports a rejected sign-in without navigating", async () => {
    signInEmail.mockResolvedValue({ error: { message: "nope" } });
    render(<DemoButton />);

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => expect(toast).toHaveBeenCalled());
    expect(push).not.toHaveBeenCalled();
  });

  it("re-enables the button when the network call throws", async () => {
    signInEmail.mockRejectedValue(new Error("network unreachable"));
    render(<DemoButton />);
    const button = screen.getByRole("button");

    fireEvent.click(button);

    await waitFor(() => expect(button).not.toBeDisabled());
    expect(button).toHaveTextContent("Try the demo account");
    expect(toast).toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("surfaces a thrown failure through onError when one is supplied", async () => {
    signInEmail.mockRejectedValue(new Error("network unreachable"));
    const onError = vi.fn();
    render(<DemoButton onError={onError} />);

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() =>
      expect(onError).toHaveBeenCalledWith(
        "The demo account is unavailable right now.",
      ),
    );
    expect(toast).not.toHaveBeenCalled();
  });
});
