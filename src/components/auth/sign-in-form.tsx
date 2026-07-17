"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/auth-client";
import { DemoButton } from "@/components/auth/demo-button";
import { Button, buttonClass } from "@/components/ui/button";
import { inputClass, labelClass } from "@/components/ui/form-styles";

export function SignInForm({
  passwordWasReset = false,
  canResetPassword = false,
}: {
  passwordWasReset?: boolean;
  canResetPassword?: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error } = await signIn.email({ email, password });
      if (error) {
        setError(error.message ?? "Invalid email or password.");
        setLoading(false);
        return;
      }
      // Keep the button disabled through navigation so a second submit can't
      // fire during the redirect.
      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <>
      {passwordWasReset && !error && (
        <p
          role="status"
          className="mb-5 rounded-lg bg-canvas-lavender px-4 py-3 text-center font-sans text-body text-ink"
        >
          Your password has been updated. Sign in with it below.
        </p>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <label className={labelClass}>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className={inputClass}
          />
        </label>

        <label className={labelClass}>
          <span className="flex items-center justify-between gap-2">
            Password
            {canResetPassword && (
              <Link
                href="/forgot-password"
                className="font-sans text-body font-bold text-link-blue transition-colors hover:text-link-hover hover:underline"
              >
                Forgot?
              </Link>
            )}
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className={inputClass}
          />
        </label>

        {error && (
          <p
            role="alert"
            className="rounded-lg bg-canvas-error px-4 py-3 text-body text-semantic-error font-medium"
          >
            {error}
          </p>
        )}

        <Button type="submit" size="lg" disabled={loading} className="mt-2">
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3 text-body font-sans text-ink-mute">
        <span className="h-px flex-1 bg-hairline" />
        or
        <span className="h-px flex-1 bg-hairline" />
      </div>

      <DemoButton
        onError={setError}
        disabled={loading}
        className={buttonClass({
          variant: "outline",
          size: "lg",
          className: "w-full",
        })}
      />
    </>
  );
}
