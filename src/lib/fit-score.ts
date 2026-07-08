export type FitBand = {
  label: "Strong fit" | "Moderate fit" | "Weak fit";
  className: string;
};

export function fitBand(score: number): FitBand {
  if (score >= 0.7) {
    return {
      label: "Strong fit",
      className: "bg-semantic-success-tint text-semantic-success",
    };
  }
  if (score >= 0.6) {
    return {
      label: "Moderate fit",
      className: "bg-semantic-warning-tint text-semantic-warning",
    };
  }
  return {
    label: "Weak fit",
    className: "bg-semantic-error-tint text-semantic-error",
  };
}
