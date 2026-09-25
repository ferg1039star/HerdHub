// End-to-end data-path check against the live Supabase project, exercised as a
// normal signed-in user through the anon key + RLS (same path the web app uses).
//
// Usage:
//   VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... \
//   node scripts/verify-e2e.mjs <email> <password>
//
// Assumes the user already exists and is confirmed (see dev-create-test-user.mjs).
// Verifies: ranch auto-provisioned by the signup trigger, seeded locations,
// inserting animals across species with integer tags, numeric tag ordering,
// and protocol creation — then cleans up the animals/protocols it created.

import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL;
const anon = process.env.VITE_SUPABASE_ANON_KEY;
const email = process.argv[2];
const password = process.argv[3];

if (!url || !anon || !email || !password) {
  console.error("Need VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, <email> <password>.");
  process.exit(1);
}

const supabase = createClient(url, anon, { auth: { persistSession: false } });

function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    process.exit(1);
  }
  console.log("ok:", msg);
}

const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
assert(!authErr && auth.session, `signed in as ${email}` + (authErr ? ` (${authErr.message})` : ""));

const { data: ranch } = await supabase.from("ranches").select("*").maybeSingle();
assert(ranch, `ranch auto-provisioned by signup trigger: "${ranch?.name}"`);

const { data: locations } = await supabase.from("locations").select("*").order("sort_order");
assert(locations && locations.length >= 2, `seeded locations present (${locations?.map((l) => l.name).join(", ")})`);
const frontTrap = locations.find((l) => l.name === "Front Trap") ?? locations[0];
const backPasture = locations.find((l) => l.name === "Back Pasture") ?? locations[1];

const stamp = Date.now();
const mk = (tag, species, loc, extra = {}) => ({
  ranch_id: ranch.id,
  tag_number: tag,
  species,
  status: "active",
  dob_precision: "unknown",
  location_id: loc.id,
  notes: `e2e-${stamp}`,
  ...extra,
});

// Insert out of order and across species to prove numeric sort, not insert order.
const toInsert = [
  mk("144", "cow", backPasture),
  mk("142", "cow", frontTrap, { date_of_birth: "2026-05-01", dob_precision: "exact" }),
  mk("143", "pig", frontTrap),
  mk("9", "goat", backPasture),
];
const { data: inserted, error: insErr } = await supabase.from("animals").insert(toInsert).select("*");
assert(!insErr && inserted?.length === 4, `inserted 4 animals across 3 species` + (insErr ? ` (${insErr.message})` : ""));

const { data: mine } = await supabase
  .from("animals")
  .select("tag_number, species")
  .eq("notes", `e2e-${stamp}`);
const sorted = [...mine].sort((a, b) => {
  const an = parseInt(a.tag_number, 10);
  const bn = parseInt(b.tag_number, 10);
  return an - bn;
});
assert(
  JSON.stringify(sorted.map((a) => a.tag_number)) === JSON.stringify(["9", "142", "143", "144"]),
  `numeric tag order across species: ${sorted.map((a) => `${a.tag_number}(${a.species})`).join(" < ")}`
);

const { error: protoErr } = await supabase.from("protocols").insert([
  { ranch_id: ranch.id, species: "cow", name: `e2e-${stamp}-deworm`, trigger_type: "interval", interval_days: 90 },
  { ranch_id: ranch.id, species: "cow", name: `e2e-${stamp}-weaning`, trigger_type: "age", age_days: 30 },
]);
assert(!protoErr, "created age + interval protocols" + (protoErr ? ` (${protoErr.message})` : ""));

// Cleanup so re-runs stay clean and the GUI demo starts from a known state.
await supabase.from("animals").delete().eq("notes", `e2e-${stamp}`);
await supabase.from("protocols").delete().like("name", `e2e-${stamp}-%`);
console.log("cleanup: removed e2e test animals + protocols");
console.log("\nE2E DATA PATH OK");
