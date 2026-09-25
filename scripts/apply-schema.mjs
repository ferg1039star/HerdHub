// Applies the Ranch Inventory schema to a Supabase Postgres database.
// Usage: SUPABASE_DB_URL=postgresql://... node scripts/apply-schema.mjs
// The schema is idempotent (create ... if not exists / on conflict do nothing).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(__dirname, "..", "supabase", "migrations", "0001_init.sql");

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error("SUPABASE_DB_URL is not set. Provide the Supabase Postgres connection string.");
  process.exit(1);
}

const sql = readFileSync(schemaPath, "utf8");

const client = new pg.Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  await client.query(sql);
  console.log("Schema applied successfully.");
} catch (err) {
  console.error("Failed to apply schema:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
