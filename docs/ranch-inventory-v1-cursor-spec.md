# Ranch Inventory — Cursor One-Shot Spec (v1, frozen)

**Working title:** Ranch Inventory  
**Owner context:** Single-operator mixed-species ranch tool. One ranch per account.  
**Stack:** TypeScript + React + Vite. Web first. Capacitor wraps the same build for iOS + Android.  
**Backend:** Supabase (Auth + Postgres + Storage). Row Level Security on `ranch_id`.  
**Goal:** Livestock tracker keyed by animal tag number, with species-level care protocols, pen/pasture location, and a ranch maintenance calendar.  
**Constraint:** This is a one-shot v1. Implement only what is in this file. If it is not in this file, do not build it.

---

## Product intent

A small mixed-species ranch needs one place to answer:

- What animals do I have right now?
- Where is this tag?
- What is due for this tag?
- What ranch maintenance was done / is due?

The differentiator is **account-level protocols**. The ranch defines the rules. Tags inherit them. Due items appear automatically on the animal page.

---

## Hard product locks

1. **One user. One ranch.** No team accounts, no multi-ranch.
2. **Tag numbers are unique per ranch**, not per species.
3. **Tag storage is a string.** v1 UI accepts **integers only**. Schema must allow suffixes later (`142A`) without a migration crisis. Do not use an integer column.
4. **Tag lists always sort in numerical order**, never species order and never raw string order.
   - Unfiltered My Ranch: `142` cow, `143` pig, `144` cow.
   - Cows filter: `142` then `144`.
   - Sort key: parse leading integer, then leftover suffix. Non-numeric tags (none in v1 UI) sort after numbered tags, A–Z.
5. **Default list filter is Active.** Sold / dead / culled / missing do not appear unless the user chooses that status.
6. **Pen / pasture location is v1.** First-class `locations` table. Ranch must be able to create at least two and add more later.
7. **Protocols support both age-based and interval-based triggers in v1.**
8. **Age input: DOB preferred, approximate age allowed.** Protocol engine needs a usable date. If only approximate age is known, store it honestly and show due dates as approximate.
9. **Maintenance is ranch-level only.** No equipment entity.
10. **Photos are optional.**
11. **No AI chatbot. No RFID. No breeding. No weights. No group actions. No feed inventory. No voice. No financials. No team roles.**
12. **Ship web in the browser first.** Capacitor and store builds come after the livestock definition of done works on a phone browser.

---

## Delivery / store locks

v1 must be publishable to **Apple App Store and Google Play**.

- Same React app. **Capacitor** native shell. Do **not** rewrite in Expo / React Native / Flutter / Dart.
- **Cloud builds from the start.** No local Xcode requirement. Use GitHub Actions (`macos` runner) + Fastlane, Codemagic, or Ionic Appflow.
- Apple Developer Program and Google Play Console are required outside the code. Code must still be store-review ready.
- Required in-app / listing compliance:
  - In-app **account deletion** (not deactivate-only)
  - Public privacy policy URL and support URL
  - App privacy / data-safety declarations
  - Icons, splash, screenshots targets
- Apple may reject a thin website wrapper. Keep the app installable and useful in the yard (tag search, due board, optional camera photo). Do not submit a login that only opens an external site.

Build order:

1. Web app hits livestock definition of done in a phone browser.
2. Add Capacitor.
3. Cloud-build TestFlight + Play internal testing.
4. Compliance + store listing assets.
5. Submit.

---

## Core features (v1 contract)

### 1. Auth + one ranch per account

- Email/password sign-up and login.
- On first login, create exactly one ranch profile: name, optional location text.
- Settings: ranch name, account deletion.
- Sign out.

### 2. Home / due board

Not an animal roster.

Show:

- Ranch name
- Animal care: overdue, due today, next 14 days
- Ranch maintenance: overdue, due today, next 14 days
- Shortcuts: My Ranch, Protocols, Maintenance, Settings

Each due row links to the animal or maintenance item.

### 3. My Ranch (tag list)

- All **active** tags by default
- Status filter: Active / Sold / Dead / Culled / Missing / All
- Species filter chips (dynamic from data)
- Location filter chips (from `locations`)
- Search by tag number
- **Always numerical tag order** inside the current filters
- Add tag
- Archive / remove tag without breaking the list
- Tag card shows: tag number, species, location, most urgent due state if any

### 4. Add / Edit tag

- Tag number (integer input in v1; stored as string)
- Species (select + allow adding a species name if missing)
- Breed (optional)
- Sex (optional)
- DOB and/or approximate age
- Status
- Location (required for Active; default “Unassigned” is acceptable if that location exists)
- Photo (optional)
- Notes

Reject duplicate tag numbers on the same ranch.

### 5. Tag detail

- Identity block (tag, species, breed, sex, age/DOB, status, location, photo, notes)
- **Due items for this animal** with a visible reason (“Protocol: Cow deworm · last event 2026-03-01 · interval 90 days”)
- Event history, newest first
- Add event
- Edit tag / archive

### 6. Care protocols (ranch settings)

User-defined species rules. Tags inherit them. Per-animal override is an exception note only; do not build a separate protocol engine per animal.

Minimum fields:

- Species
- Task name (vaccine, deworm, hoof trim, etc.)
- Trigger: `age` | `interval` | `both`
- `ageDays` if age or both
- `intervalDays` if interval or both
- Notes

Creating a protocol immediately affects matching active animals on next render. No background job.

### 7. Treatment / event log

On each animal:

- Date
- Event type: `vaccine` | `treatment` | `check` | `other`
- Optional link to a protocol
- Product / description
- Notes
- Optional withdrawal-until date

Completing an event tied to a protocol clears or rolls the related due item forward.

### 8. Ranch maintenance journal

Ranch-level, not animal-level.

- Title
- Date done (`completedOn`)
- Next due (`dueOn`)
- Notes

Views: upcoming / overdue list and a simple month list or calendar. Good enough. No recurring template engine in v1 unless it falls out of `dueOn` naturally.

### 9. Account deletion

In Settings, user can delete the account and all ranch data (animals, events, protocols, locations, maintenance, photos). Confirm with a typed ranch name or equivalent. This is a store requirement.

---

## Screens (v1)

1. Login / Signup
2. Home / Due board
3. My Ranch
4. Add / Edit Tag
5. Tag Detail
6. Protocols (list + add/edit/delete)
7. Maintenance (list/calendar + add/edit)
8. Settings (ranch name, locations manager, delete account, sign out)

Mobile-first. Large tap targets. Sticky search on My Ranch. Usable with dirty hands. Pretty UI is second to fast tag lookup.

---

## Data model (v1)

Use UUID primary keys. Every ranch-owned table has `ranch_id`. Enforce RLS: a user only sees rows for their ranch.

### profiles / users

Handled by Supabase Auth. App profile optional:

- `id` (auth user id)
- `ranch_id`
- `created_at`

### ranches

- `id`
- `owner_user_id` (unique)
- `name`
- `location_text` (optional, mailing / map text — not a pen)
- `created_at`

### locations

- `id`
- `ranch_id`
- `name` (unique per ranch)
- `sort_order` (optional)
- `created_at`

Seed or require at least two locations during ranch setup (example: `Front Trap`, `Back Pasture`). Allow more. Include an `Unassigned` location if useful.

### animals

- `id`
- `ranch_id`
- `tag_number` text, unique per `ranch_id`
- `species` text
- `breed` text null
- `sex` text null (`female` | `male` | `unknown` or similar)
- `date_of_birth` date null
- `approx_age_days` int null
- `dob_precision` `exact` | `approximate` | `unknown`
- `status` `active` | `sold` | `dead` | `culled` | `missing`
- `location_id` uuid null (FK locations)
- `photo_url` text null
- `notes` text null
- `created_at`
- `archived_at` timestamptz null

Soft-archive via `archived_at` or status. Do not orphan events.

### protocols

- `id`
- `ranch_id`
- `species` text
- `name` text
- `trigger_type` `age` | `interval` | `both`
- `age_days` int null
- `interval_days` int null
- `notes` text null
- `created_at`

### animal_events

- `id`
- `ranch_id`
- `animal_id`
- `protocol_id` uuid null
- `type` `vaccine` | `treatment` | `check` | `other`
- `event_date` date
- `product` text null
- `withdrawal_until` date null
- `notes` text null
- `created_at`

### maintenance_items

- `id`
- `ranch_id`
- `title` text
- `completed_on` date null
- `due_on` date null
- `notes` text null
- `created_at`

### Derived, not stored

- Animal due items = protocols for that species + animal age/events
- Ranch due board = animal due items + maintenance due items

Do not persist due rows. They go stale when a protocol or event changes.

---

## Protocol engine

Pure function. No cron. No hidden workers.

```ts
getDueItems(animal, protocols, events, today): DueItem[]
```

Rules:

- Consider only protocols whose `species` matches the animal (case-insensitive trim).
- **Age trigger** (and the age half of `both`) if the animal has a usable birth date:
  - `effectiveDob = date_of_birth` OR `today - approx_age_days` when DOB is missing
  - `dueDate = effectiveDob + age_days`
  - If an event linked to that protocol exists with `event_date >= dueDate`, the age task is satisfied unless `trigger_type` is `both` (then interval logic also applies)
- **Interval trigger** (and the interval half of `both`):
  - If a linked event exists: `dueDate = lastMatchingEventDate + interval_days`
  - If no event exists: `dueDate = effectiveDob + interval_days` when a birth date exists, else `today` (due now / start the clock)
- Status:
  - `upcoming` if due within the next 14 days and not today
  - `due` if due today
  - `overdue` if `dueDate < today`
- Completing an event tied to a protocol rolls the next interval due date forward from that event date.
- Each `DueItem` must include: protocol id/name, dueDate, status, reason string, whether the date is approximate.

Keep it deterministic and visible. The user must understand why something is due.

---

## Tag sort helper

```ts
compareTagNumbers(a: string, b: string): number
```

- Extract leading integer from each tag.
- Compare integers first.
- If integers equal, compare remaining suffix lexicographically.
- Tags with no leading integer sort after numbered tags.

v1 input validation: tag field accepts digits only. Persist as text (`"142"` not `142`).

---

## UX rules

- Phone-first. Minimum 44px tap targets.
- My Ranch search is sticky and must return a tag in under 5 seconds on a normal dataset.
- Home is the due board. My Ranch is the roster. Do not merge them.
- Empty states with one clear action (“Add first tag”, “Add a protocol”).
- Confirm archive / delete.
- Withdrawal-until, if set, should be visible on the animal and event.

---

## Out of scope (do not implement)

- Suffix entry UI
- Breeding, dam/offspring, expected calving
- Weight log
- Pasture maps, move history, capacity
- Group actions (“vaccinate these 12”)
- Feed / medicine inventory
- EID / RFID / scanner
- Voice input
- Financials
- Weather tasks
- Multi-ranch / team permissions
- Perfect offline sync / conflict UI
- Recurring maintenance template engine
- Push or email reminders
- CSV export (optional only after core is done)
- AI features

---

## Suggested seed (optional, not required)

If you seed a demo ranch for development only:

- Locations: Front Trap, Back Pasture
- Species: cow, pig, chicken, goat
- A few integer tags across species and both locations
- One age protocol and one interval protocol
- One overdue animal due and one overdue maintenance item

Do not block production on seed data. First real dataset should be the operator’s actual tags.

---

## Definition of done

Ship only when all of this works on phone and desktop web, then in a Capacitor build:

Livestock

- [ ] Create account and one ranch
- [ ] Create at least two locations and add more
- [ ] Add animals in at least 3 species with integer tags
- [ ] Unfiltered My Ranch lists tags in numerical order across species
- [ ] Species and location filters keep numerical order inside the filter
- [ ] Search and open a tag in under 5 seconds
- [ ] Default list is Active only
- [ ] Create an age protocol and an interval protocol; matching tags show due items with a reason
- [ ] Log an event linked to a protocol; due item clears or moves
- [ ] Add a maintenance item with a next-due date
- [ ] Home shows overdue animal care and overdue maintenance
- [ ] Archive / remove a tag without wrecking the ranch list
- [ ] Data persists across refresh
- [ ] Usable in a phone browser in the yard

Store / account

- [ ] In-app account deletion removes auth user and ranch data
- [ ] Privacy policy and support URLs can be linked from Settings and store listing
- [ ] Capacitor project builds iOS and Android via cloud CI
- [ ] Internal testing build installs on a phone

If those boxes are not checked, it is not done.

---

## Implementation notes for Cursor

- Start with Vite + React + TypeScript + a simple component structure (`pages`, `components`, `lib/protocolEngine.ts`, `lib/sortTags.ts`, `types.ts`).
- Use Supabase client with RLS policies on every table.
- Put protocol math in `lib/protocolEngine.ts` with unit tests. Do not bury it in components.
- Do not introduce extra frameworks, state libraries, or design systems unless required to ship.
- Do not generate Phase 2 files “for later.”
- Prefer working screens over pixel-perfect styling.
- When adding Capacitor, keep a single web source of truth. No second UI codebase.

---

## v1 cut line

**Must:** auth, one ranch, integer tags stored as text, numeric sort, species filter, locations, animal page, age + interval protocols, due engine, event log, maintenance journal, overdue board, archive, in-app account deletion, Capacitor + cloud build path.

**Nice if free after must is solid:** optional photo upload, slightly better calendar chrome.

**Later:** suffixes in the UI, breeding, weights, group actions, RFID, reminders, inventory, multi-user.
