"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth-client";
import { useToast } from "@/components/ui/toast";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/constants/demo";

export function DemoButton({
  className,
  label = "Try the demo account",
  loadingLabel = "Loading demo…",
  onError,
  disabled,
}: {
  className?: string;
  label?: string;
  loadingLabel?: string;
  onError?: (msg: string | null) => void;
  disabled?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [demoLoading, setDemoLoading] = useState(false);

  async function loginDemo() {
    setDemoLoading(true);
    if (onError) onError(null);
    try {
      const { error } = await signIn.email({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
      });
      if (error) {
        if (onError) onError("The demo account is unavailable right now.");
        else toast("The demo account is unavailable right now.", "error");
        return;
      }
      router.push("/dashboard");
    } catch {
      if (onError) onError("The demo account is unavailable right now.");
      else toast("The demo account is unavailable right now.", "error");
    } finally {
      setDemoLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={loginDemo}
      disabled={disabled || demoLoading}
      className={className}
    >
      {demoLoading ? loadingLabel : label}
    </button>
  );
}
