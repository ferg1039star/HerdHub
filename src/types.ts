// Ranch Inventory v1 — shared types
// Must stay aligned with supabase/migrations schema (docs/ranch-inventory-v1-schema.sql)

export type AnimalStatus = "active" | "sold" | "dead" | "culled" | "missing";
export type DobPrecision = "exact" | "approximate" | "unknown";
export type AnimalSex = "female" | "male" | "unknown";
export type ProtocolTrigger = "age" | "interval" | "both";
export type EventType = "vaccine" | "treatment" | "check" | "other";
export type DueStatus = "upcoming" | "due" | "overdue";

export interface Ranch {
  id: string;
  owner_user_id: string;
  name: string;
  location_text: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  ranch_id: string;
  created_at: string;
}

export interface Location {
  id: string;
  ranch_id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface Animal {
  id: string;
  ranch_id: string;
  tag_number: string;
  species: string;
  breed: string | null;
  sex: AnimalSex | null;
  date_of_birth: string | null;
  approx_age_days: number | null;
  dob_precision: DobPrecision;
  status: AnimalStatus;
  location_id: string | null;
  photo_url: string | null;
  notes: string | null;
  created_at: string;
  archived_at: string | null;
}

export interface Protocol {
  id: string;
  ranch_id: string;
  species: string;
  name: string;
  trigger_type: ProtocolTrigger;
  age_days: number | null;
  interval_days: number | null;
  notes: string | null;
  created_at: string;
}

export interface AnimalEvent {
  id: string;
  ranch_id: string;
  animal_id: string;
  protocol_id: string | null;
  type: EventType;
  event_date: string;
  product: string | null;
  withdrawal_until: string | null;
  notes: string | null;
  created_at: string;
}

export interface MaintenanceItem {
  id: string;
  ranch_id: string;
  tag_number: string;
  title: string;
  completed_on: string | null;
  due_on: string | null;
  notes: string | null;
  created_at: string;
}

export interface DueItem {
  protocolId: string;
  protocolName: string;
  dueDate: string; // YYYY-MM-DD
  status: DueStatus;
  reason: string;
  approximate: boolean;
  animalId: string;
  tagNumber: string;
  species: string;
}
