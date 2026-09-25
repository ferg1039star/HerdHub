import { describe, it, expect } from "vitest";
import { compareTagNumbers, sortAnimalsByTag, isIntegerTag, parseTag } from "./sortTags";

describe("compareTagNumbers", () => {
  it("sorts numerically across species (142 cow, 143 pig, 144 cow)", () => {
    const tags = ["144", "142", "143"];
    expect([...tags].sort(compareTagNumbers)).toEqual(["142", "143", "144"]);
  });

  it("does not sort as raw strings (100 before 99)", () => {
    expect([...["99", "100", "9"]].sort(compareTagNumbers)).toEqual(["9", "99", "100"]);
  });

  it("keeps numeric order inside a species filter (142 then 144)", () => {
    const cows = ["144", "142"];
    expect([...cows].sort(compareTagNumbers)).toEqual(["142", "144"]);
  });

  it("is suffix-ready: 142 < 142A < 142B", () => {
    expect([...["142B", "142", "142A"]].sort(compareTagNumbers)).toEqual(["142", "142A", "142B"]);
  });

  it("places non-numeric tags after numbered tags", () => {
    expect([...["barn", "12", "3"]].sort(compareTagNumbers)).toEqual(["3", "12", "barn"]);
  });
});

describe("sortAnimalsByTag", () => {
  it("orders animal records by tag_number numerically", () => {
    const animals = [
      { tag_number: "144", species: "cow" },
      { tag_number: "142", species: "cow" },
      { tag_number: "143", species: "pig" },
    ];
    expect(sortAnimalsByTag(animals).map((a) => a.tag_number)).toEqual(["142", "143", "144"]);
  });
});

describe("parseTag / isIntegerTag", () => {
  it("parses a leading integer", () => {
    expect(parseTag("142A").n).toBe(142);
    expect(parseTag("142A").rest).toBe("a");
  });

  it("validates integer-only tags", () => {
    expect(isIntegerTag("142")).toBe(true);
    expect(isIntegerTag("142A")).toBe(false);
    expect(isIntegerTag(" 12 ")).toBe(true);
    expect(isIntegerTag("")).toBe(false);
  });
});
