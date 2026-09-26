import { describe, expect, it } from "vitest";
import { isMaintenanceDue, maintenanceDueItems } from "./maintenanceDue";
import type { MaintenanceItem } from "../types";

const base: MaintenanceItem = {
  id: "1",
  ranch_id: "r",
  tag_number: "001",
  title: "Fence",
  location_id: "loc",
  created_on: "2026-01-01",
  completed_on: null,
  due_on: null,
  notes: null,
  created_at: "",
};

describe("isMaintenanceDue", () => {
  it("false when no due_on", () => {
    expect(isMaintenanceDue({ ...base, due_on: null })).toBe(false);
  });

  it("true when due_on is set (ignores legacy completed_on)", () => {
    expect(isMaintenanceDue({ ...base, due_on: "2026-01-01" })).toBe(true);
    expect(
      isMaintenanceDue({ ...base, due_on: "2026-01-01", completed_on: "2026-02-01" })
    ).toBe(true);
  });
});

describe("maintenanceDueItems", () => {
  it("sorts due parents by tag number", () => {
    const items: MaintenanceItem[] = [
      { ...base, id: "a", tag_number: "010", due_on: "2026-05-01" },
      { ...base, id: "b", tag_number: "002", due_on: "2026-06-01" },
    ];
    expect(maintenanceDueItems(items).map((i) => i.id)).toEqual(["b", "a"]);
  });
});
