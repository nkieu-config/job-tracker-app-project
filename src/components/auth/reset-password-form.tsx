"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button, buttonClass } from "@/components/ui/button";
import { inputClass, labelClass } from "@/components/ui/form-styles";

export function ResetPasswordForm({ token }: { token: string | null }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;

    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const { error } = await authClient.resetPassword({
        newPassword: password,
        token,
      });
      if (error) {
        setError(error.message ?? "This reset link is invalid or has expired.");
        setLoading(false);
        return;
      }
      router.push("/sign-in?reset=1");
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="flex flex-col gap-4">
        <p
          role="alert"
          className="rounded-lg bg-canvas-error px-4 py-3 text-center text-body font-medium text-semantic-error"
        >
          This reset link is invalid or has expired.
        </p>
        <Link href="/forgot-password" className={buttonClass({ size: "lg" })}>
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <label className={labelClass}>
        New password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
          className={inputClass}
        />
        <span className="text-body font-normal font-sans text-ink-mute">
          At least 8 characters.
        </span>
      </label>

      <label className={labelClass}>
        Confirm new password
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
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
        {loading ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
