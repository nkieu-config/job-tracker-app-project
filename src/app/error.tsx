"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-1 items-center justify-center bg-canvas px-6">
      <div className="text-center">
        <h1 className="font-display-md text-ink tracking-tight">
          Something went wrong
        </h1>
        <p className="mt-2 font-sans text-[16px] text-ink-mute">
          An unexpected error occurred. Please try again.
        </p>
        <button
          onClick={reset}
          className="mt-6 inline-flex items-center justify-center bg-primary text-on-primary font-sans font-bold text-[16px] tracking-[0.2px] py-3.5 px-7 rounded-pill transition-colors hover:bg-primary-press"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
