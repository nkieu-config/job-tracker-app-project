import type { BadgeTone } from "@/components/ui/badge";

export type FitBand = {
  label: "Strong fit" | "Moderate fit" | "Weak fit";
  tone: BadgeTone;
};

export function fitBand(score: number): FitBand {
  if (score >= 0.7) {
    return { label: "Strong fit", tone: "success" };
  }
  if (score >= 0.6) {
    return { label: "Moderate fit", tone: "warning" };
  }
  return { label: "Weak fit", tone: "error" };
}
