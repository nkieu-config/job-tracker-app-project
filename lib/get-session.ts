import { headers } from "next/headers";
import { auth } from "@/lib/auth";

// Authoritative server-side session lookup. This validates the session
// against the database via Better Auth — use it in pages / server actions
// as the real authorization boundary (never rely on proxy.ts alone).
export async function getSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}
