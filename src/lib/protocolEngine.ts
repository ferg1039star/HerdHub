// Ranch Inventory v1 — deterministic due-item engine
// Keep this logic out of React components. Cover with unit tests.

import type { Animal, AnimalEvent, DueItem, DueStatus, Protocol } from "../types";
import { addDays, diffDays } from "./date";

export const HOME_DUE_HORIZON_DAYS = 14;
export const ANIMAL_DUE_HORIZON_DAYS = 40;

export { addDays } from "./date";

export function effectiveDob(animal: Animal, today: string): { dob: string | null; approximate: boolean } {
  if (animal.date_of_birth) {
    return {
      dob: animal.date_of_birth,
      approximate: animal.dob_precision !== "exact",
    };
  }
  if (animal.approx_age_days != null) {
    return { dob: addDays(today, -animal.approx_age_days), approximate: true };
  }
  return { dob: null, approximate: true };
}

export function dueStatus(
  dueDate: string,
  today: string,
  horizonDays: number = HOME_DUE_HORIZON_DAYS
): DueStatus | null {
  const delta = diffDays(today, dueDate);
  if (delta < 0) return "overdue";
  if (delta === 0) return "due";
  if (delta <= horizonDays) return "upcoming";
  return null;
}

function lastProtocolEvent(events: AnimalEvent[], protocolId: string): AnimalEvent | null {
  const matches = events
    .filter((e) => e.protocol_id === protocolId)
    .sort((a, b) => b.event_date.localeCompare(a.event_date));
  return matches[0] ?? null;
}

function speciesMatch(protocolSpecies: string, animalSpecies: string): boolean {
  return protocolSpecies.trim().toLowerCase() === animalSpecies.trim().toLowerCase();
}

function intervalDueDate(
  protocol: Protocol,
  last: AnimalEvent | null,
  dob: string | null,
  today: string
): { dueDate: string; reason: string } | null {
  if (protocol.interval_days == null) return null;
  if (last) {
    return {
      dueDate: addDays(last.event_date, protocol.interval_days),
      reason: `Protocol: ${protocol.name} · last event ${last.event_date} · interval ${protocol.interval_days} days`,
    };
  }
  if (dob) {
    return {
      dueDate: addDays(dob, protocol.interval_days),
      reason: `Protocol: ${protocol.name} · no event yet · first interval ${protocol.interval_days} days from birth`,
    };
  }
  return {
    dueDate: today,
    reason: `Protocol: ${protocol.name} · no event and no birth date · due now`,
  };
}

export function getDueItems(
  animal: Animal,
  protocols: Protocol[],
  events: AnimalEvent[],
  today: string,
  horizonDays: number = HOME_DUE_HORIZON_DAYS
): DueItem[] {
  const { dob, approximate } = effectiveDob(animal, today);
  const animalEvents = events.filter((e) => e.animal_id === animal.id);
  const items: DueItem[] = [];

  for (const protocol of protocols) {
    if (!speciesMatch(protocol.species, animal.species)) continue;

    const last = lastProtocolEvent(animalEvents, protocol.id);
    let dueDate: string | null = null;
    let reason = "";

    if (protocol.trigger_type === "age" || protocol.trigger_type === "both") {
      if (dob && protocol.age_days != null) {
        const ageDue = addDays(dob, protocol.age_days);
        const ageSatisfied = last != null && last.event_date >= ageDue;

        if (!ageSatisfied && protocol.trigger_type === "age") {
          dueDate = ageDue;
          reason = `Protocol: ${protocol.name} · age task at ${protocol.age_days} days`;
        }

        if (protocol.trigger_type === "both") {
          if (!ageSatisfied) {
            dueDate = ageDue;
            reason = `Protocol: ${protocol.name} · first due at ${protocol.age_days} days of age`;
          } else if (protocol.interval_days != null && last) {
            dueDate = addDays(last.event_date, protocol.interval_days);
            reason = `Protocol: ${protocol.name} · last event ${last.event_date} · interval ${protocol.interval_days} days`;
          }
        }
      } else if (protocol.trigger_type === "both") {
        const interval = intervalDueDate(protocol, last, dob, today);
        if (interval) {
          dueDate = interval.dueDate;
          reason = interval.reason;
        }
      }
    }

    if (protocol.trigger_type === "interval") {
      const interval = intervalDueDate(protocol, last, dob, today);
      if (interval) {
        dueDate = interval.dueDate;
        reason = interval.reason;
      }
    }

    if (!dueDate) continue;
    const status = dueStatus(dueDate, today, horizonDays);
    if (!status) continue;

    items.push({
      protocolId: protocol.id,
      protocolName: protocol.name,
      dueDate,
      status,
      reason,
      approximate,
      animalId: animal.id,
      tagNumber: animal.tag_number,
      species: animal.species,
    });
  }

  return items.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export function getRanchDueBoard(
  animals: Animal[],
  protocols: Protocol[],
  events: AnimalEvent[],
  today: string,
  horizonDays: number = HOME_DUE_HORIZON_DAYS
): DueItem[] {
  return animals
    .filter((a) => a.status === "active" && !a.archived_at)
    .flatMap((a) => getDueItems(a, protocols, events, today, horizonDays))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || compareTags(a.tagNumber, b.tagNumber));
}

function compareTags(a: string, b: string): number {
  const an = parseInt(a, 10);
  const bn = parseInt(b, 10);
  if (Number.isFinite(an) && Number.isFinite(bn) && an !== bn) return an - bn;
  return a.localeCompare(b);
}
