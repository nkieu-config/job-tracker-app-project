import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-1 items-center justify-center bg-canvas px-6">
      <div className="text-center">
        <p className="text-[14px] font-sans font-medium text-ink-mute">404</p>
        <h1 className="mt-2 font-display-md text-ink tracking-tight">
          Page not found
        </h1>
        <p className="mt-2 font-sans text-[16px] text-ink-mute">
          The page you’re looking for doesn’t exist or was moved.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex items-center justify-center bg-primary text-on-primary font-sans font-bold text-[16px] tracking-[0.2px] py-[14px] px-[28px] rounded-[90px] transition-colors hover:bg-primary-press"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
