import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { LogoMark } from "@/components/ui/logo";

export const metadata: Metadata = {
  title: "Reset password",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  const validToken = error || !token ? null : token;

  return (
    <div className="flex flex-1 items-center justify-center bg-canvas px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Link href="/">
            <LogoMark size="lg" />
          </Link>
        </div>
        <h1 className="font-display-md text-ink text-center tracking-tight mb-2">
          Set a new password
        </h1>
        <p className="text-center font-sans text-ink-mute mb-8">
          Choose a new password for your account.
        </p>

        <ResetPasswordForm token={validToken} />

        <p className="mt-8 text-center font-sans text-body text-ink-mute">
          Back to{" "}
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
