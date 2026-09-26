// Local calendar dates for the operator (YYYY-MM-DD storage, MM-DD-YYYY display).

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Local calendar day for "now" — not UTC (avoids rolling at 19:00 CDT). */
export function todayIso(): string {
  return toIsoDate(new Date());
}

/** Local calendar components from a Date (evening local time stays that calendar day). */
export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseIsoDate(value: string): Date {
  const [y, m, day] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}

export function addDays(isoDate: string, days: number): string {
  const d = parseIsoDate(isoDate);
  d.setUTCDate(d.getUTCDate() + days);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function diffDays(fromIso: string, toIso: string): number {
  return Math.round((parseIsoDate(toIso).getTime() - parseIsoDate(fromIso).getTime()) / MS_PER_DAY);
}

/** Person-readable date: 2026-09-26 → 09-26-2026 */
export function formatDisplayDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${m}-${d}-${y}`;
}

/** @deprecated use formatDisplayDate */
export function formatDate(iso: string | null): string {
  return formatDisplayDate(iso);
}
