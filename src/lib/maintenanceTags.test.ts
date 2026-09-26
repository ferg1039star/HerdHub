import { describe, expect, it } from "vitest";
import { displayMaintenanceTag, formatNextMaintenanceTagNumber, sortMaintenanceByTag } from "./maintenanceTags";

describe("formatNextMaintenanceTagNumber", () => {
  it("starts at 001", () => {
    expect(formatNextMaintenanceTagNumber([])).toBe("001");
  });

  it("pads through 999 then uses 1000", () => {
    expect(formatNextMaintenanceTagNumber(["001", "002"])).toBe("003");
    expect(formatNextMaintenanceTagNumber(["999"])).toBe("1000");
  });
});

describe("sortMaintenanceByTag", () => {
  it("sorts numerically not lexically", () => {
    const sorted = sortMaintenanceByTag([
      { tag_number: "010" },
      { tag_number: "2" },
      { tag_number: "001" },
    ]);
    expect(sorted.map((i) => i.tag_number)).toEqual(["001", "2", "010"]);
  });
});
