"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // `digest` correlates this client-visible error with the full stack in the
    // server logs; without logging it there's no way to tie the two together.
    console.error("Route error", { digest: error.digest, message: error.message });
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center bg-canvas px-6">
      <div className="text-center">
        <h1 className="font-display-md text-ink tracking-tight">
          Something went wrong
        </h1>
        <p className="mt-2 font-sans text-body-lg text-ink-mute">
          An unexpected error occurred. Please try again.
        </p>
        {error.digest && (
          <p className="mt-1 font-mono text-caption text-ink-mute">
            Reference: {error.digest}
          </p>
        )}
        <Button size="lg" onClick={reset} className="mt-6">
          Try again
        </Button>
      </div>
    </div>
  );
}
