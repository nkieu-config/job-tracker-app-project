"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    await signOut();
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={loading}
      className="inline-flex items-center justify-center bg-canvas-lavender text-ink font-sans font-bold text-[14px] tracking-[0.144px] py-[10px] px-[20px] rounded-[90px] transition-colors hover:bg-canvas-lavender-hover disabled:opacity-60"
    >
      {loading ? "Signing out…" : "Sign out"}
    </button>
  );
}
