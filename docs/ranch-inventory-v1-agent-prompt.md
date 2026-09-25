# Cursor background agent — kickoff prompt

Copy everything below the line into the background agent task. Attach / include the other v1 files in the same repo.

---

Implement Ranch Inventory v1 as a one-shot.

## Source of truth (do not invent a parallel design)

- Product + screens + done list: `ranch-inventory-v1-cursor-spec.md`
- Database + RLS: `ranch-inventory-v1-schema.sql`
- Types: `ranch-inventory-v1-types.ts`
- Tag sort: `ranch-inventory-v1-sortTags.ts`
- Due engine: `ranch-inventory-v1-protocolEngine.ts`
- Env: `ranch-inventory-v1.env.example`

Copy the TS helpers into the app as `src/lib/sortTags.ts`, `src/lib/protocolEngine.ts`, and `src/types.ts`. Keep them isolated and add unit tests. Do not rewrite the due-date math unless you find a bug against the spec.

## Stack

- Vite + React + TypeScript
- Supabase Auth + Postgres + Storage
- Mobile-first web app first
- Do not add Capacitor, Expo, React Native, Flutter, or store packaging until the livestock definition of done works in a phone browser

## Build exactly this

1. Email/password auth
2. One ranch per user (created by the SQL trigger)
3. Locations manager (at least the seeded two + Unassigned; user can add more)
4. My Ranch: active-default, species filter, location filter, integer tag search, numeric tag sort
5. Add/edit animal (integer tag UI, store as text, unique per ranch)
6. Tag detail with due items + event log
7. Protocols: age, interval, and both
8. Maintenance journal
9. Home due board split animal care vs maintenance
10. Soft archive
11. Settings with in-app account deletion
12. Optional photo upload to `animal-photos/{ranch_id}/...`

## Do not build

Suffix UI, breeding, weights, maps, move history, group actions, RFID, voice, feed inventory, financials, teams, multi-ranch, push notifications, CSV, AI, a second UI framework, a design system beyond simple CSS/modules/Tailwind if already chosen.

## Process

1. Apply `ranch-inventory-v1-schema.sql` as the schema. Do not create extra tables.
2. Scaffold Vite React TS app.
3. Implement pages listed in the spec.
4. Wire Supabase with RLS. Use `current_ranch_id()` mentally: every query is ranch-scoped.
5. Unit test `compareTagNumbers` and `getDueItems` for:
   - 142 cow / 143 pig / 144 cow sort order
   - age protocol becomes due from DOB
   - interval protocol rolls forward after a linked event
   - home board only includes active animals
6. Stop when the livestock checkboxes in the spec are done in the browser.

Report what you built, how to run it, and any env vars still needed. Do not start App Store work in this pass.
