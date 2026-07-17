"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    try {
      await signOut();
      router.push("/sign-in");
      router.refresh();
    } catch {
      setLoading(false);
    }
  }

  return (
    <Button variant="secondary" onClick={handleSignOut} disabled={loading}>
      {loading ? "Signing out…" : "Sign out"}
    </Button>
  );
}
