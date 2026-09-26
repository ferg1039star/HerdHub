import { sortMaintenanceByTag } from "./maintenanceTags";
import type { MaintenanceItem } from "../types";

/** Parent still on the Due board when it has a next due date set. */
export function isMaintenanceDue(m: MaintenanceItem): boolean {
  return Boolean(m.due_on);
}

export function maintenanceDueItems(items: MaintenanceItem[]): MaintenanceItem[] {
  return sortMaintenanceByTag(items.filter(isMaintenanceDue));
}
