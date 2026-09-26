import type { Animal } from "../types";
import { diffDays, formatDisplayDate } from "./date";

export function formatAgeFromDays(days: number, approximate: boolean): string {
  const safe = Math.max(0, days);
  const prefix = approximate ? "~" : "";
  if (safe < 21) {
    return `${prefix}${safe} day${safe === 1 ? "" : "s"}`;
  }
  const months = Math.floor(safe / 30);
  if (months < 18) {
    return `${prefix}${months} mo`;
  }
  const years = Math.floor(months / 12);
  const remMo = months % 12;
  if (remMo > 0) {
    return `${prefix}${years} yr ${remMo} mo`;
  }
  return `${prefix}${years} yr`;
}

/** One line for tag detail identity block. */
export function formatAnimalAgeLine(animal: Animal, today: string): string {
  if (animal.date_of_birth) {
    const days = diffDays(animal.date_of_birth, today);
    const approx = animal.dob_precision !== "exact";
    return `${formatDisplayDate(animal.date_of_birth)} · ${formatAgeFromDays(days, approx)}`;
  }
  if (animal.approx_age_days != null) {
    return formatAgeFromDays(animal.approx_age_days, true);
  }
  return "Unknown";
}
