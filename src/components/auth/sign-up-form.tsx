"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signUp } from "@/lib/auth-client";
import { DemoButton } from "@/components/auth/demo-button";
import { inputClass, labelClass } from "@/components/ui/form-styles";

export function SignUpForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error } = await signUp.email({ name, email, password });
      if (error) {
        setError(error.message ?? "Could not create your account.");
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
      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <label className={labelClass}>
          Name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
            className={inputClass}
          />
        </label>

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
          Password
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

        {error && (
          <p
            role="alert"
            className="rounded-lg bg-canvas-error px-4 py-3 text-body text-semantic-error font-medium"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 inline-flex items-center justify-center bg-primary text-on-primary font-sans font-bold text-body-lg tracking-[0.2px] py-3.5 px-7 rounded-pill transition-colors hover:bg-primary-press disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "Creating account…" : "Sign up"}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3 text-body font-sans text-ink-mute">
        <span className="h-px flex-1 bg-hairline" />
        or
        <span className="h-px flex-1 bg-hairline" />
      </div>

      <DemoButton
        onError={setError}
        disabled={loading}
        className="inline-flex w-full items-center justify-center bg-canvas text-primary font-sans font-bold text-body-lg tracking-[0.2px] py-3.5 px-7 rounded-pill border-2 border-primary transition-colors hover:bg-canvas-lavender disabled:opacity-60 disabled:cursor-not-allowed"
      />
    </>
  );
}
