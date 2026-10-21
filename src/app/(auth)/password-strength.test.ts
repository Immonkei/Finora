import { describe, expect, it } from "vitest";
import { scorePassword } from "./password-strength";

describe("scorePassword", () => {
  it("rejects anything under 8 characters", () => {
    expect(scorePassword("Ab1!")).toBe(0);
  });
  it("rates common or repetitive passwords as weak", () => {
    expect(scorePassword("password123")).toBe(1);
    expect(scorePassword("aaaaaaaa1")).toBe(1);
  });
  it("rewards length and variety", () => {
    expect(scorePassword("dara2026x")).toBe(1);
    expect(scorePassword("Dara2026x")).toBe(2);
    expect(scorePassword("Dara2026x!")).toBe(3);
    expect(scorePassword("Dara-Savings-2026!")).toBe(4);
  });
});
