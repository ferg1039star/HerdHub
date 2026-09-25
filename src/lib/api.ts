import { supabase } from "./supabase";
import type {
  Animal,
  AnimalEvent,
  Location,
  MaintenanceItem,
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

export async function createMaintenance(input: MaintenanceInput): Promise<void> {
  const { error } = await supabase.from("maintenance_items").insert(input);
  if (error) throw error;
}

export async function deleteMaintenance(id: string): Promise<void> {
  const { error } = await supabase.from("maintenance_items").delete().eq("id", id);
  if (error) throw error;
}

// Deletes all ranch data (cascades to locations, animals, protocols, events,
// maintenance and profile via ON DELETE CASCADE). The auth user row itself
// requires a service-role edge function; see README "Account deletion".
export async function deleteRanchData(ranchId: string): Promise<void> {
  const { error } = await supabase.from("ranches").delete().eq("id", ranchId);
  if (error) throw error;
}
