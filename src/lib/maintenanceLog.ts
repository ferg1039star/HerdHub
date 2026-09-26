import { compareTagNumbers } from "./sortTags";
import type { MaintenanceItem, MaintenanceLogEntry } from "../types";

export type MaintenanceLogRow = MaintenanceLogEntry & {
  tag_number: string;
  title: string;
  location_id: string | null;
};

export function buildMaintenanceLogRows(
  logs: MaintenanceLogEntry[],
  items: MaintenanceItem[]
): MaintenanceLogRow[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  const rows: MaintenanceLogRow[] = [];
  for (const log of logs) {
    const item = byId.get(log.maintenance_id);
    if (!item) continue;
    rows.push({
      ...log,
      tag_number: item.tag_number,
      title: item.title,
      location_id: item.location_id,
    });
  }
  return sortMaintenanceLogRows(rows);
}

export function sortMaintenanceLogRows(rows: MaintenanceLogRow[]): MaintenanceLogRow[] {
  return [...rows].sort((a, b) => {
    if (a.performed_on !== b.performed_on) {
      return a.performed_on < b.performed_on ? 1 : -1;
    }
    const byTag = compareTagNumbers(a.tag_number, b.tag_number);
    if (byTag !== 0) return byTag;
    return a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0;
  });
}
