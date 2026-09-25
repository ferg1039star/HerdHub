// Proves the delete_account() mechanism: deleting an auth user cascades away all
// ranch-owned rows (exactly what the RPC does via `delete from auth.users`).
// Uses the admin API + service role on a THROWAWAY user; it never touches real
// accounts. Dev/verification only.
//
// Usage:
//   VITE_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//   node scripts/verify-account-deletion.mjs

const URL = process.env.VITE_SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !SR) {
  console.error("Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const H = { apikey: SR, Authorization: `Bearer ${SR}`, "Content-Type": "application/json" };
const email = `delete-test-${Date.now()}@herdhub.app`;

const j = async (r) => { const t = await r.text(); try { return JSON.parse(t); } catch { return t; } };
const ok = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("ok:", m); };

const cu = await fetch(`${URL}/auth/v1/admin/users`, { method: "POST", headers: H, body: JSON.stringify({ email, password: "DeleteTest123!", email_confirm: true }) });
const user = await j(cu);
ok(cu.ok && user.id, `created throwaway user ${email}`);

const pr = await j(await fetch(`${URL}/rest/v1/profiles?id=eq.${user.id}&select=ranch_id`, { headers: H }));
const rid = pr[0]?.ranch_id;
ok(rid, `signup trigger provisioned ranch ${rid}`);

await fetch(`${URL}/rest/v1/animals`, { method: "POST", headers: H, body: JSON.stringify({ ranch_id: rid, tag_number: "777", species: "cow", status: "active", dob_precision: "unknown" }) });
await fetch(`${URL}/rest/v1/protocols`, { method: "POST", headers: H, body: JSON.stringify({ ranch_id: rid, species: "cow", name: "del-test", trigger_type: "interval", interval_days: 30 }) });
await fetch(`${URL}/rest/v1/maintenance_items`, { method: "POST", headers: H, body: JSON.stringify({ ranch_id: rid, title: "del-test" }) });

const countAll = async () => {
  const tables = ["ranches", "profiles", "locations", "animals", "protocols", "maintenance_items"];
  const out = {};
  for (const t of tables) {
    const col = t === "ranches" ? "id" : "ranch_id";
    const rows = await j(await fetch(`${URL}/rest/v1/${t}?${col}=eq.${rid}&select=${col}`, { headers: H }));
    out[t] = Array.isArray(rows) ? rows.length : 0;
  }
  return out;
};

const before = await countAll();
ok(before.animals >= 1 && before.locations >= 3 && before.ranches === 1, `seeded rows present: ${JSON.stringify(before)}`);

const del = await fetch(`${URL}/auth/v1/admin/users/${user.id}`, { method: "DELETE", headers: H });
ok(del.ok, "deleted auth user (same delete the RPC performs)");

const after = await countAll();
ok(Object.values(after).every((n) => n === 0), `all ranch rows cascaded away: ${JSON.stringify(after)}`);

console.log("\nACCOUNT-DELETION CASCADE VERIFIED");
