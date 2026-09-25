// Dev-only helper: create a pre-confirmed test user via the Supabase Admin API.
// Requires the service_role key (server-side only — never ship it to the browser).
//
// Usage:
//   VITE_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//   node scripts/dev-create-test-user.mjs <email> <password>
//
// Prints the created/confirmed user id. Safe to re-run: if the user already
// exists it is confirmed and its password is reset to the provided one.

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.argv[2];
const password = process.argv[3];

if (!url || !serviceKey) {
  console.error("Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
if (!email || !password) {
  console.error("Usage: node scripts/dev-create-test-user.mjs <email> <password>");
  process.exit(1);
}

const headers = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  "Content-Type": "application/json",
};

async function findUser() {
  const res = await fetch(`${url}/auth/v1/admin/users?per_page=200`, { headers });
  if (!res.ok) return null;
  const body = await res.json();
  const users = body.users || body;
  return users.find((u) => u.email === email) || null;
}

async function main() {
  const create = await fetch(`${url}/auth/v1/admin/users`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email, password, email_confirm: true }),
  });

  if (create.ok) {
    const u = await create.json();
    console.log(`Created confirmed user ${u.id} (${email})`);
    return;
  }

  // Likely already exists — confirm + reset password.
  const existing = await findUser();
  if (!existing) {
    console.error("Create failed:", await create.text());
    process.exit(1);
  }
  const update = await fetch(`${url}/auth/v1/admin/users/${existing.id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ password, email_confirm: true }),
  });
  if (!update.ok) {
    console.error("Update failed:", await update.text());
    process.exit(1);
  }
  console.log(`Confirmed existing user ${existing.id} (${email})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
