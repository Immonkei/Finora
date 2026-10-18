import { describe, it, expect } from "vitest";
import { parseNaturalLanguageInput } from "./nlp-parser";

describe("Natural Language Parser", () => {
  it("parses coffee with decimal amount and infers Food & Drinks", () => {
    const res = parseNaturalLanguageInput("iced coffee 2.5");
    expect(res).not.toBeNull();
    expect(res?.amount).toBe(2.5);
    expect(res?.currency).toBe("USD");
    expect(res?.categoryName).toBe("Food & Drinks");
    expect(res?.note).toBe("Iced coffee");
  });

  it("parses grab ride in KHR and infers Transport", () => {
    const res = parseNaturalLanguageInput("grab bike 8000 khr");
    expect(res).not.toBeNull();
    expect(res?.amount).toBe(8000);
    expect(res?.currency).toBe("KHR");
    expect(res?.categoryName).toBe("Transport");
    expect(res?.note).toBe("Grab bike");
  });

  it("parses internet bill and infers Housing & Bills", () => {
    const res = parseNaturalLanguageInput("wifi bill 35");
    expect(res).not.toBeNull();
    expect(res?.amount).toBe(35);
    expect(res?.categoryName).toBe("Housing & Bills");
  });

  it("parses spoken phrase fallback with number words", () => {
    const res = parseNaturalLanguageInput("twenty five dollars on groceries at lucky supermarket");
    expect(res).not.toBeNull();
    expect(res?.amount).toBe(25);
    expect(res?.currency).toBe("USD");
    expect(res?.categoryName).toBe("Groceries");
  });

  it("returns null for non-monetary text", () => {
    expect(parseNaturalLanguageInput("hello world without money")).toBeNull();
    expect(parseNaturalLanguageInput("")).toBeNull();
  });
});
