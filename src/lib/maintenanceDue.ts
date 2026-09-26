import type { MaintenanceItem } from "../types";

/** Item still needs work on the due board / Maintenance Due section. */
export function isMaintenanceDue(m: MaintenanceItem): boolean {
  if (!m.due_on) return false;
  if (!m.completed_on) return true;
  return m.due_on > m.completed_on;
}

export function maintenanceDueItems(items: MaintenanceItem[]): MaintenanceItem[] {
  return items.filter(isMaintenanceDue);
}

export function maintenanceLogItems(items: MaintenanceItem[]): MaintenanceItem[] {
  return items
    .filter((m) => m.completed_on)
    .sort((a, b) => (a.completed_on! < b.completed_on! ? 1 : a.completed_on! > b.completed_on! ? -1 : 0));
}
