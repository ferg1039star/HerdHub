# Ranch Inventory v1 — Cursor background agent packet

This folder is the complete first-pass brief. Put these files in the repo the agent can see, then paste `ranch-inventory-v1-agent-prompt.md` into the background agent.

## Files

| File | Role |
|---|---|
| `ranch-inventory-v1-cursor-spec.md` | Product contract. Screens, locks, done list. |
| `ranch-inventory-v1-schema.sql` | Supabase tables, indexes, signup trigger, RLS, photo bucket. |
| `ranch-inventory-v1-types.ts` | Shared types. Must match the SQL. |
| `ranch-inventory-v1-sortTags.ts` | Numeric tag sort + integer validation. |
| `ranch-inventory-v1-protocolEngine.ts` | Derived due items. No stored due rows. |
| `ranch-inventory-v1.env.example` | Vite env vars. |
| `ranch-inventory-v1-agent-prompt.md` | Exact text to give the background agent. |

## Human setup before the agent runs

1. Create a Supabase project.
2. Run `ranch-inventory-v1-schema.sql` in the SQL editor.
3. Enable Email auth.
4. Copy `ranch-inventory-v1.env.example` to `.env.local` and fill URL + anon key.
5. Put all packet files in the repo (root or `/docs`).
6. Start the background agent with the prompt file. Point it at the files by name.

The agent should not need a second briefing mid-run.

## What the agent is *not* doing in pass 1

Capacitor, cloud iOS/Android builds, App Store / Play listing assets. That is pass 2 after the phone-browser definition of done is green.

## Pass 2 (later, not this packet)

Wrap the working web app with Capacitor and hook a cloud builder (Codemagic, Ionic Appflow, or GitHub Actions macos + Fastlane). Keep this same UI. Do not rewrite in Expo.
