import type { Metadata } from "next";
import Link from "next/link";
import { emailIsDeliverable } from "@/server/email";
import { SignInForm } from "@/components/auth/sign-in-form";
import { LogoMark } from "@/components/ui/logo";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  const { reset } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center bg-canvas px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Link href="/">
            <LogoMark size="lg" />
          </Link>
        </div>
        <h1 className="font-display-md text-ink text-center tracking-tight mb-2">
          Welcome back
        </h1>
        <p className="text-center font-sans text-ink-mute mb-8">
          Sign in to your job tracker.
        </p>

        <SignInForm
          passwordWasReset={reset === "1"}
          canResetPassword={emailIsDeliverable}
        />

        <p className="mt-8 text-center font-sans text-body text-ink-mute">
          Don&apos;t have an account?{" "}
          <Link
            href="/sign-up"
            className="font-bold text-link-blue hover:text-link-hover hover:underline transition-colors"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
