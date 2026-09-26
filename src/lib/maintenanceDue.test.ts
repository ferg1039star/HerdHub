import { describe, expect, it } from "vitest";
import { isMaintenanceDue, maintenanceDueItems, maintenanceLogItems } from "./maintenanceDue";
import type { MaintenanceItem } from "../types";

const base: MaintenanceItem = {
  id: "1",
  ranch_id: "r",
  title: "Fence",
  completed_on: null,
  due_on: null,
  notes: null,
  created_at: "",
};

describe("isMaintenanceDue", () => {
  it("false when no due_on", () => {
    expect(isMaintenanceDue({ ...base, due_on: null })).toBe(false);
  });

  it("true when due_on and not completed", () => {
    expect(isMaintenanceDue({ ...base, due_on: "2026-01-01" })).toBe(true);
  });

  it("true when due_on after completed_on", () => {
    expect(
      isMaintenanceDue({ ...base, due_on: "2026-06-01", completed_on: "2026-01-01" })
    ).toBe(true);
  });

  it("false when completed_on on or after due_on", () => {
    expect(
      isMaintenanceDue({ ...base, due_on: "2026-01-01", completed_on: "2026-01-01" })
    ).toBe(false);
    expect(
      isMaintenanceDue({ ...base, due_on: "2026-01-01", completed_on: "2026-02-01" })
    ).toBe(false);
  });
});

describe("lists", () => {
  const items: MaintenanceItem[] = [
    { ...base, id: "a", due_on: "2026-05-01" },
    { ...base, id: "b", completed_on: "2026-03-01", due_on: "2026-01-01" },
    { ...base, id: "c", completed_on: "2026-04-01", due_on: "2026-06-01" },
  ];

  it("splits due and log", () => {
    expect(maintenanceDueItems(items).map((i) => i.id)).toEqual(["a", "c"]);
    expect(maintenanceLogItems(items).map((i) => i.id)).toEqual(["c", "b"]);
  });
});
