import type { Animal, AnimalEvent } from "../types";

export interface ActiveWithdrawal {
  animalId: string;
  tagNumber: string;
  until: string;
}

/** Active meat/milk withhold: withdrawal_until >= today (YYYY-MM-DD). */
export function activeWithdrawalsForRanch(
  animals: Animal[],
  events: AnimalEvent[],
  today: string
): ActiveWithdrawal[] {
  const activeIds = new Set(
    animals.filter((a) => a.status === "active" && !a.archived_at).map((a) => a.id)
  );
  const tagById = new Map(animals.map((a) => [a.id, a.tag_number]));
  const bestUntil = new Map<string, string>();

  for (const e of events) {
    if (!e.withdrawal_until || e.withdrawal_until < today) continue;
    if (!activeIds.has(e.animal_id)) continue;
    const prev = bestUntil.get(e.animal_id);
    if (!prev || e.withdrawal_until > prev) {
      bestUntil.set(e.animal_id, e.withdrawal_until);
    }
  }

  return [...bestUntil.entries()]
    .map(([animalId, until]) => ({
      animalId,
      tagNumber: tagById.get(animalId) ?? "?",
      until,
    }))
    .sort((a, b) => a.until.localeCompare(b.until) || a.tagNumber.localeCompare(b.tagNumber));
}

export function activeWithdrawalForAnimal(
  events: AnimalEvent[],
  animalId: string,
  today: string
): string | null {
  let best: string | null = null;
  for (const e of events) {
    if (e.animal_id !== animalId) continue;
    if (!e.withdrawal_until || e.withdrawal_until < today) continue;
    if (!best || e.withdrawal_until > best) best = e.withdrawal_until;
  }
  return best;
}
