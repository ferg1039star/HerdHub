import { describe, expect, it } from "vitest";
import { toIsoDate } from "./date";

describe("toIsoDate local calendar", () => {
  it("uses local date parts, not UTC midnight rollover", () => {
    const eveningLocal = new Date(2026, 8, 26, 22, 30, 0);
    expect(toIsoDate(eveningLocal)).toBe("2026-09-26");
  });
});
