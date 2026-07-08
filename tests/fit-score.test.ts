import { describe, it, expect } from "vitest";
import { fitBand } from "@/lib/fit-score";

describe("fitBand", () => {
  it("labels scores of 0.7 and above as a strong fit", () => {
    expect(fitBand(0.7).label).toBe("Strong fit");
    expect(fitBand(0.92).label).toBe("Strong fit");
  });

  it("labels scores between 0.6 and 0.7 as a moderate fit", () => {
    expect(fitBand(0.6).label).toBe("Moderate fit");
    expect(fitBand(0.69).label).toBe("Moderate fit");
  });

  it("labels scores below 0.6 as a weak fit", () => {
    expect(fitBand(0.59).label).toBe("Weak fit");
    expect(fitBand(0).label).toBe("Weak fit");
  });
});
