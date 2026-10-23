import { describe, expect, it } from "vitest";
import { isCanonicalSearchParam } from "@/lib/search-params";

describe("isCanonicalSearchParam", () => {
  it("returns true when the param is absent", () => {
    expect(isCanonicalSearchParam(undefined, "2024")).toBe(true);
  });

  it("returns true when the param is present once and equal to the canonical value", () => {
    expect(isCanonicalSearchParam("2024", "2024")).toBe(true);
  });

  it("returns false when the param is present once but differs from the canonical value", () => {
    expect(isCanonicalSearchParam("1999", "2024")).toBe(false);
    expect(isCanonicalSearchParam("2024 ", "2024")).toBe(false);
  });

  it("returns false when the param is repeated, even if the first value matches", () => {
    expect(isCanonicalSearchParam(["2024", "2025"], "2024")).toBe(false);
    expect(isCanonicalSearchParam(["2024"], "2024")).toBe(false);
  });

  it("returns false for an empty string when the canonical value is not empty", () => {
    expect(isCanonicalSearchParam("", "all")).toBe(false);
  });

  it("returns true for an empty string only when the canonical value is empty", () => {
    expect(isCanonicalSearchParam("", "")).toBe(true);
  });
});
