import { describe, expect, it } from "vitest";
import { sortMaintenanceLogRows } from "./maintenanceLog";
import type { MaintenanceLogRow } from "./maintenanceLog";

const base: MaintenanceLogRow = {
  id: "1",
  ranch_id: "r",
  maintenance_id: "m1",
  performed_on: "2026-01-01",
  notes: null,
  created_at: "",
  tag_number: "001",
  title: "Hay",
  location_id: null,
};

describe("sortMaintenanceLogRows", () => {
  it("newest performed_on first, then tag number", () => {
    const sorted = sortMaintenanceLogRows([
      { ...base, id: "a", performed_on: "2026-01-01", tag_number: "010" },
      { ...base, id: "b", performed_on: "2026-01-02", tag_number: "002" },
      { ...base, id: "c", performed_on: "2026-01-02", tag_number: "001" },
    ]);
    expect(sorted.map((r) => r.id)).toEqual(["c", "b", "a"]);
  });
});
