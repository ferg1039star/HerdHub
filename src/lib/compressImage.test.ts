import { describe, expect, it } from "vitest";
import { MAX_LONG_EDGE, scaledDimensions } from "./compressImage";

describe("scaledDimensions", () => {
  it("leaves small images unchanged", () => {
    expect(scaledDimensions(800, 600, MAX_LONG_EDGE)).toEqual({ width: 800, height: 600 });
  });

  it("scales so the long edge is capped", () => {
    const { width, height } = scaledDimensions(2400, 1200, MAX_LONG_EDGE);
    expect(Math.max(width, height)).toBe(MAX_LONG_EDGE);
    expect(width).toBe(MAX_LONG_EDGE);
    expect(height).toBe(600);
  });
});
