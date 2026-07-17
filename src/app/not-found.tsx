import Link from "next/link";
import { buttonClass } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-1 items-center justify-center bg-canvas px-6">
      <div className="text-center">
        <p className="text-body font-sans font-medium text-ink-mute">404</p>
        <h1 className="mt-2 font-display-md text-ink tracking-tight">
          Page not found
        </h1>
        <p className="mt-2 font-sans text-body-lg text-ink-mute">
          The page you’re looking for doesn’t exist or was moved.
        </p>
        <Link
          href="/dashboard"
          className={buttonClass({ size: "lg", className: "mt-6" })}
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
