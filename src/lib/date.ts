// Local-date helpers. "today" is the operator's local calendar day (YYYY-MM-DD),
// which is what the due engine compares against.

export function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return iso;
}
