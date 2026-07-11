"use client";

import { useEffect } from "react";

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
          <p className="mt-1 font-sans text-caption text-ink-mute tabular-nums">
            Reference: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          className="mt-6 inline-flex items-center justify-center bg-primary text-on-primary font-sans font-bold text-body-lg tracking-[0.2px] py-3.5 px-7 rounded-pill transition-colors hover:bg-primary-press"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
