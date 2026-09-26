import { supabase } from "./supabase";
import { formatNextMaintenanceTagNumber } from "./maintenanceTags";
import { storagePathFromPublicUrl } from "./compressImage";
import { isUniqueViolation } from "./errors";
import type {
  Animal,
  AnimalEvent,
  Location,
  MaintenanceItem,
  MaintenanceLogEntry,
  Protocol,
  Ranch,
} from "../types";

export async function getRanch(): Promise<Ranch | null> {
  const { data, error } = await supabase.from("ranches").select("*").maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateRanchName(id: string, name: string): Promise<void> {
  const { error } = await supabase.from("ranches").update({ name }).eq("id", id);
  if (error) throw error;
}

export async function getLocations(): Promise<Location[]> {
  const { data, error } = await supabase
    .from("locations")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addLocation(ranchId: string, name: string, sortOrder: number): Promise<void> {
  const { error } = await supabase
    .from("locations")
    .insert({ ranch_id: ranchId, name, sort_order: sortOrder });
  if (error) throw error;
}

export async function deleteLocation(id: string): Promise<void> {
  const { error } = await supabase.from("locations").delete().eq("id", id);
  if (error) throw error;
}

export async function getAnimals(): Promise<Animal[]> {
  const { data, error } = await supabase.from("animals").select("*");
  if (error) throw error;
  return data ?? [];
}

export async function getAnimal(id: string): Promise<Animal | null> {
  const { data, error } = await supabase.from("animals").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export type AnimalInput = Omit<Animal, "id" | "created_at">;

export async function createAnimal(input: AnimalInput): Promise<Animal> {
  const { data, error } = await supabase.from("animals").insert(input).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateAnimal(id: string, input: Partial<AnimalInput>): Promise<void> {
  const { error } = await supabase.from("animals").update(input).eq("id", id);
  if (error) throw error;
}

export async function getProtocols(): Promise<Protocol[]> {
  const { data, error } = await supabase
    .from("protocols")
    .select("*")
    .order("species", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export type ProtocolInput = Omit<Protocol, "id" | "created_at">;

export async function createProtocol(input: ProtocolInput): Promise<void> {
  const { error } = await supabase.from("protocols").insert(input);
  if (error) throw error;
}

export async function updateProtocol(id: string, input: Partial<ProtocolInput>): Promise<void> {
  const { error } = await supabase.from("protocols").update(input).eq("id", id);
  if (error) throw error;
}

export async function deleteProtocol(id: string): Promise<void> {
  const { error } = await supabase.from("protocols").delete().eq("id", id);
  if (error) throw error;
}

export async function getEvents(): Promise<AnimalEvent[]> {
  const { data, error } = await supabase
    .from("animal_events")
    .select("*")
    .order("event_date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getAnimalEvents(animalId: string): Promise<AnimalEvent[]> {
  const { data, error } = await supabase
    .from("animal_events")
    .select("*")
    .eq("animal_id", animalId)
    .order("event_date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export type EventInput = Omit<AnimalEvent, "id" | "created_at">;

export async function createEvent(input: EventInput): Promise<void> {
  const { error } = await supabase.from("animal_events").insert(input);
  if (error) throw error;
}

export async function getMaintenance(): Promise<MaintenanceItem[]> {
  const { data, error } = await supabase
    .from("maintenance_items")
    .select("*")
    .order("due_on", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}

export type MaintenanceInput = Omit<MaintenanceItem, "id" | "created_at">;
export type MaintenanceCreateInput = Omit<MaintenanceInput, "tag_number">;

const MAINT_TAG_COLLISION =
  "That maintenance tag number already exists on this ranch. Try again.";

async function allocateNextMaintenanceTagNumber(ranchId: string): Promise<string> {
  const { data, error } = await supabase
    .from("maintenance_items")
    .select("tag_number")
    .eq("ranch_id", ranchId);
  if (error) throw error;
  return formatNextMaintenanceTagNumber((data ?? []).map((row) => row.tag_number));
}

export async function createMaintenance(input: MaintenanceCreateInput): Promise<void> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const tag_number = await allocateNextMaintenanceTagNumber(input.ranch_id);
    const { error } = await supabase.from("maintenance_items").insert({ ...input, tag_number });
    if (!error) return;
    if (isUniqueViolation(error) && attempt === 0) continue;
    if (isUniqueViolation(error)) throw new Error(MAINT_TAG_COLLISION);
    throw error;
  }
}

export async function updateMaintenance(id: string, input: Partial<MaintenanceInput>): Promise<void> {
  const { error } = await supabase.from("maintenance_items").update(input).eq("id", id);
  if (error) {
    if (isUniqueViolation(error)) throw new Error(MAINT_TAG_COLLISION);
    throw error;
  }
}

export async function deleteMaintenance(id: string): Promise<void> {
  const { error } = await supabase.from("maintenance_items").delete().eq("id", id);
  if (error) throw error;
}

export async function getMaintenanceLog(): Promise<MaintenanceLogEntry[]> {
  const { data, error } = await supabase
    .from("maintenance_log")
    .select("*")
    .order("performed_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export type MaintenanceLogInput = Omit<MaintenanceLogEntry, "id" | "created_at">;

export async function createMaintenanceLog(input: MaintenanceLogInput): Promise<void> {
  const { error } = await supabase.from("maintenance_log").insert(input);
  if (error) throw error;
}

export async function deleteMaintenanceLog(id: string): Promise<void> {
  const { error } = await supabase.from("maintenance_log").delete().eq("id", id);
  if (error) throw error;
}

export async function logMaintenanceDoneToday(
  ranchId: string,
  maintenanceId: string,
  performedOn: string
): Promise<void> {
  await createMaintenanceLog({
    ranch_id: ranchId,
    maintenance_id: maintenanceId,
    performed_on: performedOn,
    notes: null,
  });
}

/** Delete storage objects under animal-photos/{ranchId}/ not referenced by any animal photo_url. */
export async function removeUnusedAnimalPhotos(ranchId: string): Promise<number> {
  const animals = await getAnimals();
  const inUse = new Set<string>();
  for (const a of animals) {
    if (!a.photo_url) continue;
    const path = storagePathFromPublicUrl(a.photo_url);
    if (path) inUse.add(path);
  }

  const { data: files, error: listErr } = await supabase.storage.from("animal-photos").list(ranchId);
  if (listErr) throw listErr;

  const toRemove = (files ?? [])
    .filter((f) => f.name && !inUse.has(`${ranchId}/${f.name}`))
    .map((f) => `${ranchId}/${f.name}`);

  if (toRemove.length === 0) return 0;

  const { error: removeErr } = await supabase.storage.from("animal-photos").remove(toRemove);
  if (removeErr) throw removeErr;
  return toRemove.length;
}

// Deletes the signed-in user's account and all associated data.
//
// 1. Remove storage photos via the Storage API (RLS lets a user delete objects
//    under their own ranch folder; this also deletes the underlying files).
// 2. Call the `delete_account` RPC, which removes the auth user and cascades all
//    ranch data (supabase/migrations/0002).
// 3. If that RPC is unavailable (e.g. the migration hasn't been applied to the
//    project yet), fall back to deleting the ranch row directly via RLS, which
//    still cascades away every ranch-owned record so no user data is left
//    behind. The auth login row is only removed once the RPC is in place.
export async function deleteAccount(ranchId: string): Promise<void> {
  try {
    const { data: files } = await supabase.storage.from("animal-photos").list(ranchId);
    if (files && files.length > 0) {
      await supabase.storage.from("animal-photos").remove(files.map((f) => `${ranchId}/${f.name}`));
    }
  } catch {
    // Photo cleanup is best-effort and must not block account deletion.
  }

  const { error } = await supabase.rpc("delete_account");
  if (error) {
    const { error: fallbackError } = await supabase.from("ranches").delete().eq("id", ranchId);
    if (fallbackError) throw fallbackError;
  }
}
