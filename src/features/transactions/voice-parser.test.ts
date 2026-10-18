import { describe, it, expect } from "vitest";
import { parseVoiceExpense, spokenWordsToNumber } from "./voice-parser";

describe("Voice Expense Parser", () => {
  describe("spokenWordsToNumber", () => {
    it("converts simple units and tens", () => {
      expect(spokenWordsToNumber(["five"])).toBe(5);
      expect(spokenWordsToNumber(["twenty", "five"])).toBe(25);
      expect(spokenWordsToNumber(["forty", "two"])).toBe(42);
    });

    it("converts hundreds and thousands", () => {
      expect(spokenWordsToNumber(["eight", "thousand"])).toBe(8000);
      expect(spokenWordsToNumber(["one", "hundred", "twenty"])).toBe(120);
      expect(spokenWordsToNumber(["ten", "thousand", "five", "hundred"])).toBe(10500);
    });

    it("handles digits within tokens", () => {
      expect(spokenWordsToNumber(["8000"])).toBe(8000);
      expect(spokenWordsToNumber(["25"])).toBe(25);
    });
  });

  describe("parseVoiceExpense", () => {
    it("parses spoken dollars and cents with category inference", () => {
      const res = parseVoiceExpense("two dollars and fifty cents for iced coffee");
      expect(res).not.toBeNull();
      expect(res?.amount).toBe(2.5);
      expect(res?.currency).toBe("USD");
      expect(res?.categoryName).toBe("Food & Drinks");
      expect(res?.note.toLowerCase()).toContain("iced coffee");
    });

    it("parses colloquial 'two dollars fifty'", () => {
      const res = parseVoiceExpense("two dollars fifty for cappuccino");
      expect(res).not.toBeNull();
      expect(res?.amount).toBe(2.5);
      expect(res?.currency).toBe("USD");
      expect(res?.categoryName).toBe("Food & Drinks");
    });

    it("parses spoken riels in KHR", () => {
      const res = parseVoiceExpense("paid eight thousand riel for passapp ride");
      expect(res).not.toBeNull();
      expect(res?.amount).toBe(8000);
      expect(res?.currency).toBe("KHR");
      expect(res?.categoryName).toBe("Transport");
      expect(res?.note.toLowerCase()).toContain("passapp");
    });

    it("parses digits with currency symbols and text", () => {
      const res = parseVoiceExpense("spent $15.50 on lunch with team");
      expect(res).not.toBeNull();
      expect(res?.amount).toBe(15.5);
      expect(res?.currency).toBe("USD");
      expect(res?.categoryName).toBe("Food & Drinks");
      expect(res?.note.toLowerCase()).toContain("lunch");
    });

    it("parses groceries at Lucky Supermarket", () => {
      const res = parseVoiceExpense("twenty five dollars groceries at lucky supermarket");
      expect(res).not.toBeNull();
      expect(res?.amount).toBe(25);
      expect(res?.currency).toBe("USD");
      expect(res?.categoryName).toBe("Groceries");
      expect(res?.note.toLowerCase()).toContain("lucky supermarket");
    });

    it("parses electricity bill in USD", () => {
      const res = parseVoiceExpense("one hundred twenty dollars for electricity bill");
      expect(res).not.toBeNull();
      expect(res?.amount).toBe(120);
      expect(res?.currency).toBe("USD");
      expect(res?.categoryName).toBe("Housing & Bills");
    });

    it("infers KHR when amount is large (>=500) without currency keyword", () => {
      const res = parseVoiceExpense("passapp ride 6000");
      expect(res).not.toBeNull();
      expect(res?.amount).toBe(6000);
      expect(res?.currency).toBe("KHR");
      expect(res?.categoryName).toBe("Transport");
    });

    it("returns null for non-monetary phrases", () => {
      expect(parseVoiceExpense("hello this is just talking")).toBeNull();
      expect(parseVoiceExpense("")).toBeNull();
    });
  });
});
