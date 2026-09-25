// Applies a .sql file to Postgres using standard PG* environment variables
// (PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE). Using PG* vars avoids having
// to URL-encode passwords with special characters. SSL is required for Supabase.
//
// Usage:
//   PGHOST=... PGPORT=5432 PGUSER=... PGPASSWORD=... PGDATABASE=postgres \
//   node scripts/apply-sql.mjs supabase/migrations/0002_account_deletion.sql

import { readFileSync } from "node:fs";
import pg from "pg";

const file = process.argv[2];
if (!file) {
  console.error("usage: node scripts/apply-sql.mjs <file.sql>");
  process.exit(1);
}

const sql = readFileSync(file, "utf8");
const client = new pg.Client({ ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  await client.query(sql);
  console.log(`applied ${file}`);
} catch (err) {
  console.error("apply failed:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
