import { describe, it, expect, beforeAll } from "vitest";
import { generateQRToken, verifyQRToken } from "@/features/qr/services/qr-token";

beforeAll(() => {
  process.env.QR_SECRET ??= "test-secret-for-vitest-only";
});

describe("QR token signing", () => {
  it("generates a token containing the asset type", () => {
    const token = generateQRToken("MEMBER");
    expect(token.startsWith("MEMBER.")).toBe(true);
    expect(token.split(".")).toHaveLength(3);
  });

  it("verifies a token it generated as valid", () => {
    const token = generateQRToken("SPACE");
    const result = verifyQRToken(token);
    expect(result).toEqual({ type: "SPACE", valid: true });
  });

  it("rejects a tampered token", () => {
    const token = generateQRToken("PROJECT");
    const [type, random] = token.split(".");
    const tampered = `${type}.${random}.deadbeefdeadbeefdeadbeef`;
    const result = verifyQRToken(tampered);
    expect(result?.valid).toBe(false);
  });

  it("returns null for a malformed token", () => {
    expect(verifyQRToken("not-a-real-token")).toBeNull();
  });

  it("produces different tokens for repeated calls", () => {
    const a = generateQRToken("SPACE");
    const b = generateQRToken("SPACE");
    expect(a).not.toBe(b);
  });
});
