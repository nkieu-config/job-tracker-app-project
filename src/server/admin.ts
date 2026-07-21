import "server-only";

import { notFound } from "next/navigation";

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowlist = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return allowlist.includes(email.toLowerCase());
}

// Not exported, so an AdminScope can only be minted by requireAdmin below —
// which is the point: the admin-only queries ask for one in their signature.
const ADMIN_SCOPE: unique symbol = Symbol("admin-scope");

export type AdminScope = { readonly [ADMIN_SCOPE]: true };

export function requireAdmin(email: string | null | undefined): AdminScope {
  if (!isAdminEmail(email)) notFound();
  return { [ADMIN_SCOPE]: true };
}
