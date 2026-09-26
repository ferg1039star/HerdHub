import { describe, it, expect } from "vitest";
import { getDueItems, getRanchDueBoard, addDays } from "./protocolEngine";
import type { Animal, AnimalEvent, Protocol } from "../types";

const TODAY = "2026-06-01";

function animal(overrides: Partial<Animal> = {}): Animal {
  return {
    id: "a1",
    ranch_id: "r1",
    tag_number: "142",
    species: "cow",
    breed: null,
    sex: null,
    date_of_birth: null,
    approx_age_days: null,
    dob_precision: "unknown",
    status: "active",
    location_id: null,
    photo_url: null,
    notes: null,
    created_at: TODAY,
    archived_at: null,
    ...overrides,
  };
}

function protocol(overrides: Partial<Protocol> = {}): Protocol {
  return {
    id: "p1",
    ranch_id: "r1",
    species: "cow",
    name: "Cow deworm",
    trigger_type: "interval",
    age_days: null,
    interval_days: null,
    notes: null,
    created_at: TODAY,
    ...overrides,
  };
}

describe("getDueItems — age trigger", () => {
  it("becomes due from DOB + age_days", () => {
    const a = animal({ date_of_birth: "2026-05-01", dob_precision: "exact" });
    const p = protocol({ trigger_type: "age", age_days: 30, interval_days: null, name: "Weaning check" });
    const items = getDueItems(a, [p], [], TODAY);
    expect(items).toHaveLength(1);
    expect(items[0].dueDate).toBe("2026-05-31"); // 2026-05-01 + 30 days
    expect(items[0].status).toBe("overdue");
    expect(items[0].reason).toContain("age task at 30 days");
  });

  it("is satisfied once a linked event on/after the due date exists", () => {
    const a = animal({ date_of_birth: "2026-05-01", dob_precision: "exact" });
    const p = protocol({ trigger_type: "age", age_days: 30, interval_days: null });
    const events: AnimalEvent[] = [
      {
        id: "e1",
        ranch_id: "r1",
        animal_id: "a1",
        protocol_id: "p1",
        type: "check",
        event_date: "2026-05-31",
        product: null,
        withdrawal_until: null,
        notes: null,
        created_at: TODAY,
      },
    ];
    expect(getDueItems(a, [p], events, TODAY)).toHaveLength(0);
  });
});

describe("getDueItems — interval trigger", () => {
  it("rolls forward after a linked event", () => {
    const a = animal();
    const p = protocol({ trigger_type: "interval", interval_days: 90, name: "Cow deworm" });
    const events: AnimalEvent[] = [
      {
        id: "e1",
        ranch_id: "r1",
        animal_id: "a1",
        protocol_id: "p1",
        type: "treatment",
        event_date: "2026-03-01",
        product: "Ivermectin",
        withdrawal_until: null,
        notes: null,
        created_at: TODAY,
      },
    ];
    const items = getDueItems(a, [p], events, TODAY);
    expect(items).toHaveLength(1);
    expect(items[0].dueDate).toBe(addDays("2026-03-01", 90)); // 2026-05-30
    expect(items[0].status).toBe("overdue");
    expect(items[0].reason).toContain("last event 2026-03-01");
  });

  it("starts the clock now when no event and no birth date", () => {
    const a = animal();
    const p = protocol({ trigger_type: "interval", interval_days: 90 });
    const items = getDueItems(a, [p], [], TODAY);
    expect(items[0].dueDate).toBe(TODAY);
    expect(items[0].status).toBe("due");
  });

  it("both with no DOB and no event uses interval fallback due today", () => {
    const a = animal({ date_of_birth: null, approx_age_days: null, dob_precision: "unknown" });
    const p = protocol({ trigger_type: "both", age_days: 30, interval_days: 90, name: "Combo" });
    const items = getDueItems(a, [p], [], TODAY);
    expect(items).toHaveLength(1);
    expect(items[0].dueDate).toBe(TODAY);
    expect(items[0].status).toBe("due");
  });

  it("ignores protocols for other species (case-insensitive match)", () => {
    const a = animal({ species: "Cow" });
    const p = protocol({ species: "pig", trigger_type: "interval", interval_days: 30 });
    expect(getDueItems(a, [p], [], TODAY)).toHaveLength(0);
  });
});

describe("getRanchDueBoard", () => {
  it("only includes active, non-archived animals", () => {
    const active = animal({ id: "a1", tag_number: "142", status: "active" });
    const sold = animal({ id: "a2", tag_number: "143", status: "sold" });
    const archived = animal({ id: "a3", tag_number: "144", archived_at: TODAY });
    const p = protocol({ trigger_type: "interval", interval_days: 30 });
    const board = getRanchDueBoard([active, sold, archived], [p], [], TODAY);
    const tags = [...new Set(board.map((d) => d.tagNumber))];
    expect(tags).toEqual(["142"]);
  });
});
