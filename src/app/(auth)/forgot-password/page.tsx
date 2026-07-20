import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { emailIsDeliverable } from "@/server/email";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { LogoMark } from "@/components/ui/logo";

export const metadata: Metadata = {
  title: "Forgot password",
};

export default function ForgotPasswordPage() {
  if (!emailIsDeliverable) {
    notFound();
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-canvas px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Link href="/">
            <LogoMark size="lg" />
          </Link>
        </div>
        <h1 className="font-display-md text-ink text-center tracking-tight mb-2">
          Forgot your password?
        </h1>
        <p className="text-center font-sans text-ink-mute mb-8">
          Enter your email and we&apos;ll send you a link to set a new one.
        </p>

        <ForgotPasswordForm />

        <p className="mt-8 text-center font-sans text-body text-ink-mute">
          Remembered it?{" "}
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
