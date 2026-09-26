import { compareTagNumbers, parseTag } from "./sortTags";

/** Next tag string for a ranch given existing tag_number values (numeric max + 1). */
export function formatNextMaintenanceTagNumber(existingTags: string[]): string {
  let max = 0;
  for (const raw of existingTags) {
    const { n } = parseTag(raw);
    if (n != null && n > max) max = n;
  }
  const next = max + 1;
  if (next <= 999) return String(next).padStart(3, "0");
  return String(next);
}

export function sortMaintenanceByTag<T extends { tag_number: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => compareTagNumbers(a.tag_number, b.tag_number));
}

export function displayMaintenanceTag(tagNumber: string): string {
  return `M${tagNumber}`;
}
