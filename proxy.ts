import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// OPTIMISTIC auth gate only — redirects obviously-unauthenticated users
// early for a better UX. This is NOT a security boundary: it only checks
// that a session cookie EXISTS, not that it is valid. The real check lives
// in the data/page layer (see lib/get-session.ts).
//
// Background: CVE-2025-29927 let attackers bypass Next.js middleware by
// forging a header, so middleware/proxy must never be the only auth check.
export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
