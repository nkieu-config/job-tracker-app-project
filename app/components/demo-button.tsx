"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth-client";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/demo";

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
  const [demoLoading, setDemoLoading] = useState(false);

  async function loginDemo() {
    setDemoLoading(true);
    if (onError) onError(null);
    const { error } = await signIn.email({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });
    setDemoLoading(false);
    if (error) {
      if (onError) onError("The demo account is unavailable right now.");
      else alert("The demo account is unavailable right now.");
      return;
    }
    router.push("/dashboard");
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
