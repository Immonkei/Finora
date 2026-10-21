import { describe, expect, it } from "vitest";
import { interpolate } from "./define";
import { MESSAGES } from "./messages";

describe("interpolate", () => {
  it("fills named placeholders and leaves unknown ones intact", () => {
    expect(interpolate("{count} days left", { count: 3 })).toBe("3 days left");
    expect(interpolate("Hi {name}", {})).toBe("Hi {name}");
  });
});

describe("message catalogs", () => {
  it("gives every English key a non-empty Khmer translation with the same placeholders", () => {
    for (const [ns, { en, km }] of Object.entries(MESSAGES)) {
      for (const [key, enValue] of Object.entries(en)) {
        const kmValue = (km as Record<string, string>)[key];
        expect(kmValue, `${ns}.${key}`).toBeTruthy();
        const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
        expect(placeholders(kmValue), `${ns}.${key}`).toEqual(placeholders(enValue));
      }
    }
  });
});
