import { describe, it, expect } from "vitest";
import { getMilestoneTier } from "./components/milestone-ring";

describe("Milestone Ring Helpers", () => {
  it("returns Goal Conquered for 100% and above", () => {
    const tier100 = getMilestoneTier(100);
    expect(tier100.label).toContain("Goal Conquered");
    expect(tier100.ringGradientId).toBe("grad-emerald");

    const tier150 = getMilestoneTier(150);
    expect(tier150.label).toContain("Goal Conquered");
  });

  it("returns Final Stretch for 75% to 99%", () => {
    const tier75 = getMilestoneTier(75);
    expect(tier75.label).toContain("Final Stretch");
    expect(tier75.ringGradientId).toBe("grad-amber");

    const tier90 = getMilestoneTier(90);
    expect(tier90.label).toContain("Final Stretch");
  });

  it("returns Halfway There for 50% to 74%", () => {
    const tier50 = getMilestoneTier(50);
    expect(tier50.label).toContain("Halfway There");
    expect(tier50.ringGradientId).toBe("grad-blue");
  });

  it("returns Quarter Way for 25% to 49%", () => {
    const tier25 = getMilestoneTier(25);
    expect(tier25.label).toContain("Quarter Way");
    expect(tier25.ringGradientId).toBe("grad-purple");
  });

  it("returns Starting Out for below 25%", () => {
    const tier10 = getMilestoneTier(10);
    expect(tier10.label).toContain("Starting Out");
    expect(tier10.ringGradientId).toBe("grad-brand");
  });
});
