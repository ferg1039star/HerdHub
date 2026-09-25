// Ranch Inventory v1 — numeric-aware tag sort
// "142", "143", "144" sort numerically even across species.
// Suffix-ready: "142" < "142A" < "142B"

export function parseTag(tag: string): { n: number | null; rest: string; raw: string } {
  const raw = tag.trim();
  const match = raw.match(/^(\d+)(.*)$/);
  if (!match) return { n: null, rest: raw.toLowerCase(), raw };
  return { n: Number(match[1]), rest: match[2].toLowerCase(), raw };
}

export function compareTagNumbers(a: string, b: string): number {
  const left = parseTag(a);
  const right = parseTag(b);

  if (left.n === null && right.n === null) {
    return left.rest.localeCompare(right.rest);
  }
  if (left.n === null) return 1;
  if (right.n === null) return -1;
  if (left.n !== right.n) return left.n - right.n;
  return left.rest.localeCompare(right.rest);
}

export function sortAnimalsByTag<T extends { tag_number: string }>(animals: T[]): T[] {
  return [...animals].sort((a, b) => compareTagNumbers(a.tag_number, b.tag_number));
}

export function isIntegerTag(value: string): boolean {
  return /^\d+$/.test(value.trim());
}
