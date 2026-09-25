// Dev-only demo seed: populates one signed-in ranch with a small, realistic
// dataset so the due board and filters are meaningful in a walkthrough.
// Idempotent: clears the ranch's animals/protocols/events/maintenance first.
//
// Usage:
//   VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... \
//   node scripts/seed-demo.mjs <email> <password>

import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL;
const anon = process.env.VITE_SUPABASE_ANON_KEY;
const [email, password] = process.argv.slice(2);
if (!url || !anon || !email || !password) {
  console.error("Need VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, <email> <password>.");
  process.exit(1);
}

const supabase = createClient(url, anon, { auth: { persistSession: false } });
const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
if (authErr) {
  console.error("sign in failed:", authErr.message);
  process.exit(1);
}

const { data: ranch } = await supabase.from("ranches").select("*").maybeSingle();
const { data: locations } = await supabase.from("locations").select("*").order("sort_order");
const front = locations.find((l) => l.name === "Front Trap") ?? locations[0];
const back = locations.find((l) => l.name === "Back Pasture") ?? locations[1];

// Clean slate for the ranch.
await supabase.from("animal_events").delete().eq("ranch_id", ranch.id);
await supabase.from("animals").delete().eq("ranch_id", ranch.id);
await supabase.from("protocols").delete().eq("ranch_id", ranch.id);
await supabase.from("maintenance_items").delete().eq("ranch_id", ranch.id);

const { data: protos } = await supabase
  .from("protocols")
  .insert([
    { ranch_id: ranch.id, species: "cow", name: "Cow deworm", trigger_type: "interval", interval_days: 90, notes: "Rotate product yearly" },
    { ranch_id: ranch.id, species: "cow", name: "Weaning check", trigger_type: "age", age_days: 30 },
    { ranch_id: ranch.id, species: "pig", name: "Pig iron shot", trigger_type: "interval", interval_days: 60 },
  ])
  .select("*");

await supabase.from("animals").insert([
  { ranch_id: ranch.id, tag_number: "144", species: "cow", breed: "Angus", sex: "female", status: "active", dob_precision: "unknown", location_id: back.id },
  { ranch_id: ranch.id, tag_number: "142", species: "cow", breed: "Hereford", sex: "female", date_of_birth: "2026-05-01", dob_precision: "exact", status: "active", location_id: front.id },
  { ranch_id: ranch.id, tag_number: "143", species: "pig", sex: "male", status: "active", dob_precision: "unknown", location_id: front.id },
  { ranch_id: ranch.id, tag_number: "9", species: "goat", sex: "female", status: "active", dob_precision: "unknown", location_id: back.id },
  { ranch_id: ranch.id, tag_number: "20", species: "cow", sex: "male", status: "sold", dob_precision: "unknown", location_id: back.id },
]);

await supabase.from("maintenance_items").insert([
  { ranch_id: ranch.id, title: "Repair north fence", completed_on: "2026-03-01", due_on: "2026-09-01", notes: "Section by the creek" },
  { ranch_id: ranch.id, title: "Service water pump", due_on: "2026-10-05" },
]);

console.log(`Seeded ranch "${ranch.name}": ${protos.length} protocols, 5 animals, 2 maintenance items.`);
