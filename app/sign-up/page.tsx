"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUp } from "@/lib/auth-client";
import { DemoButton } from "@/app/components/demo-button";
import { inputClass, labelClass } from "@/lib/form-styles";

export default function SignUpPage() {
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
    const { error } = await signUp.email({ name, email, password });
    setLoading(false);
    if (error) {
      setError(error.message ?? "Could not create your account.");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-canvas px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
            <Link href="/">
              <div className="w-12 h-12 bg-primary rounded-md flex items-center justify-center">
                <span className="text-on-primary font-bold text-2xl leading-none">J</span>
              </div>
            </Link>
        </div>
        <h1 className="font-display-md text-ink text-center tracking-tight mb-2">
          Create your account
        </h1>
        <p className="text-center font-sans text-ink-mute mb-8">
          Start tracking your job applications.
        </p>

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
            <span className="text-[14px] font-normal font-sans text-ink-mute">
              At least 8 characters.
            </span>
          </label>

          {error && (
            <p
              role="alert"
              className="rounded-md bg-canvas-error px-4 py-3 text-sm text-semantic-error font-medium"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 inline-flex items-center justify-center bg-primary text-on-primary font-sans font-bold text-[16px] tracking-[0.2px] py-[14px] px-[28px] rounded-[90px] transition-colors hover:bg-primary-press disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Creating account…" : "Sign up"}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3 text-[14px] font-sans text-ink-mute">
          <span className="h-px flex-1 bg-hairline" />
          or
          <span className="h-px flex-1 bg-hairline" />
        </div>

        <DemoButton 
          onError={setError} 
          disabled={loading} 
          className="inline-flex w-full items-center justify-center bg-canvas text-primary font-sans font-bold text-[16px] tracking-[0.2px] py-[14px] px-[28px] rounded-[90px] border-2 border-primary transition-colors hover:bg-canvas-lavender disabled:opacity-60 disabled:cursor-not-allowed" 
        />

        <p className="mt-8 text-center font-sans text-[14px] text-ink-mute">
          Already have an account?{" "}
          <Link
            href="/sign-in"
            className="font-bold text-link-blue hover:text-link-hover hover:underline transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
