"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button, buttonClass } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error", {
      digest: error.digest,
      message: error.message,
    });
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="text-center">
        <h1 className="font-display-sm text-ink tracking-tight">
          This page couldn’t load
        </h1>
        <p className="mt-2 font-sans text-body-lg text-ink-mute">
          Something went wrong fetching your data. Your applications are safe.
        </p>
        {error.digest && (
          <p className="mt-1 font-mono text-caption text-ink-mute">
            Reference: {error.digest}
          </p>
        )}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" onClick={reset}>
            Try again
          </Button>
          <Link
            href="/dashboard"
            className={buttonClass({ variant: "outline", size: "lg" })}
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
