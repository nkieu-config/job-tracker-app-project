import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

// Authoritative server-side session lookup. This validates the session
// against the database via Better Auth — use it in pages / server actions
// as the real authorization boundary (never rely on proxy.ts alone).
// Wrapped in React.cache so the layout guard and the page/action in the same
// request share one Better Auth lookup instead of hitting the DB twice.
export const getSession = cache(async () => {
  return auth.api.getSession({
    headers: await headers(),
  });
});

// Same check, but redirects unauthenticated callers to sign-in and returns a
// guaranteed non-null session — keeps pages free of non-null assertions.
export async function requireSession() {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }
  return session;
}
