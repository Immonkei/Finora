import { describe, expect, it } from "vitest";
import { detectMailProvider, maskEmail } from "./mail-provider";

describe("detectMailProvider", () => {
  it("recognizes Gmail, Outlook and others", () => {
    expect(detectMailProvider("dara@gmail.com").kind).toBe("gmail");
    expect(detectMailProvider("DARA@GoogleMail.com").kind).toBe("gmail");
    expect(detectMailProvider("sok@hotmail.com").kind).toBe("outlook");
    expect(detectMailProvider("me@company.com.kh")).toEqual({ kind: "other", url: null });
  });
});

describe("maskEmail", () => {
  it("hides the middle of the local part", () => {
    expect(maskEmail("dara@gmail.com")).toBe("d**a@gmail.com");
    expect(maskEmail("ab@x.com")).toBe("a*@x.com");
    expect(maskEmail("not-an-email")).toBe("not-an-email");
  });
});
