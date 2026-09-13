# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Node is installed via nvm but **is not on the default PATH** — the nvm installer never wrote to a shell profile. Prefix every command:

```bash
export PATH="$HOME/.nvm/versions/node/v24.19.0/bin:$PATH"
```

| Task | Command |
|---|---|
| Dev server | `npm run dev` (Next 16 + Turbopack, `-H localhost`, port 3000) |
| Production build | `npm run build` |
| Lint | `npm run lint` |
| Typecheck | `npx tsc --noEmit` |
| Android build | `./scripts/build-mobile.sh` |

There is no test suite. `tsc --noEmit` plus `npm run build` is the verification loop.
`./scripts/check-db.sh` probes the live Supabase project and reports any table, RPC or
storage bucket the app needs but the database lacks.

`npm run lint` reports ~41 errors and ~139 warnings that predate current work — mostly
`no-explicit-any` in `catch` blocks and React-compiler purity complaints in
`src/components/ui/`. Treat the count as a baseline, not a clean slate.

`.claude/launch.json` starts the dev server through `/usr/bin/env` with an explicit PATH. This is deliberate: Turbopack spawns a child `node` process to run PostCSS over `globals.css`, so invoking node by absolute path starts the server but then panics on the first request with `spawning node pooled process — No such file or directory`, surfaced only as a generic "unexpected Turbopack error".

## Environment

`.env.local` is required — without the Supabase vars every request 500s in `src/proxy.ts` before any page renders.

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `MISTRAL_API_KEY` (voice transcription), `IMAGEKIT_PRIVATE_KEY` (image uploads).

## Architecture

### One page, many views

`src/app/page.tsx` is effectively the whole application. It holds an `AppView` state (`home | dashboard | settings | goals | create-goal`) and swaps components rather than using routes. The only real routes are `/login`, `/auth/callback`, `/auth/update-password`, and the API handlers.

Consequences worth knowing before editing:

- Navigation is `setCurrentView(...)`, not `router.push(...)`.
- Nearly all app state (goals, selected goal, language, user) lives in `page.tsx` and is threaded down as props. Components rarely fetch their own top-level data.
- `page.tsx` guards navigation away from an in-progress AI goal draft via `pendingNavigation` / `isAiGoalCreationGuardActive`.

### Auth boundary

`src/proxy.ts` is the Next 16 proxy (the former `middleware.ts`). It runs on every non-API path and redirects unauthenticated users to `/login`, and authenticated users away from `/login`. Only `/login` and `/auth/callback` are public — a new public page must be added to that check or it will bounce.

**The proxy returns early for `/api/*` and never checks the session there**, so every API
route must guard itself. Use `requireUser(req)` from `src/lib/api-auth.ts`:

```ts
const auth = await requireUser(req);
if (auth.error) return auth.error;
```

Skipping it leaves the route callable by anyone on the internet — which for the Gemini and
Mistral routes means an open tap on the project's paid quota.

It also emits CORS headers for `/api/*` so the Capacitor app on `https://localhost` can call the deployed API directly.

There are four Supabase client factories in `src/utils/supabase/`, and picking the wrong one is the usual bug:

- `client.ts` — browser components
- `server.ts` — server components
- `server-request.ts` — **API routes**; accepts either a `Bearer` token (mobile) or cookies (web) via `createRequestClient(request)`
- `service-role.ts` — bypasses RLS, server only

### Web and mobile share one codebase

The Capacitor Android app is a static export of the same Next app. `scripts/build-mobile.sh` temporarily moves `src/app/api` and the auth callback route out of the tree (incompatible with `output: 'export'`), builds with `BUILD_MOBILE=1`, copies to `mobile/www/`, then restores them and runs `cap sync`.

So the native app has **no local API routes**. `src/lib/api.ts` rewrites `/api/*` calls to the hardcoded `SERVER_URL` and attaches the access token as a Bearer header when `isNativeApp()`. Any new API route must work under both auth modes — use `createRequestClient`.

Native OAuth is a separate flow: `useCapacitorAuth` opens the system browser, the callback deep-links back as `com.metrix.app://auth?code=...` without exchanging the code server-side, and the app exchanges it itself because it holds the PKCE verifier.

### Language

The UI language is a **single state in `page.tsx`** (`useState<Language>("ar")`) threaded down as a `language` prop everywhere. It defaults to Arabic; a user's explicit choice persists to `localStorage.language` and overrides it.

This means a component's own `language = 'ar'` default is only a fallback — what users actually see is decided by that one line in `page.tsx`. All component defaults, and `normalizeLanguage` in `src/app/api/goal/milestone/route.ts`, fall back to Arabic. Keep new user-facing strings bilingual or Arabic; never hardcode English.

`src/lib/translations.ts` holds the `en`/`ar` dictionaries. `layout.tsx` is hardcoded
`lang="ar" dir="rtl"`, so any page that can render in English has to correct the document
itself.

`page.tsx` never runs on `/login` or `/auth/update-password`, so those routes read the
persisted choice through `src/lib/language.ts` (`readStoredLanguage` / `applyDocumentLanguage`)
and keep their own local `copy` dictionaries. `/login` also carries the only language toggle
that exists before the app shell — without it an English speaker who signs out is stranded
in Arabic.

One trap worth knowing: an input marked `dir="ltr"` inside an RTL page resolves its own
logical properties against LTR. A password field with `pe-10` reserves space on the **right**,
while a sibling button with `end-0` in the RTL wrapper lands on the **left** — icon on top of
the text, reserved space empty. Give the wrapper `dir="ltr"` too so both resolve the same way.

### Data model

`supabase/setup.sql` is the whole schema in one idempotent file and the only definition of
it — the project has no other source. Paste it into the SQL Editor; it is safe on a fresh
project and on one already partly migrated. `supabase/migrations/0001`–`0006` are the same
content split up, kept for review. `0002` needs
`0005`'s `SECURITY DEFINER` membership helpers: a policy that answers "is the caller in
this challenge?" by selecting from `challenge_participants` inside that table's own policy
recurses forever (error 42P17) and takes `goals`, `daily_logs` and `challenge_rooms` down
with it.

Nine tables: `goals`, `sub_layers` (tasks), `task_checkins`, `daily_logs`, `daily_focus_answers`, `goal_reminders`, `challenge_rooms`, `challenge_participants`, `weekly_reviews`. Two storage buckets: `avatars` (written by the user, path `<user_id>/avatar.<ext>`) and `milestones` (written server-side with the service role key).

`milestones` is a **storage bucket, not a table** — a milestone is a `daily_logs` row whose
`breakdown` JSON carries a `milestone` object. `record_goal_milestone` /
`delete_goal_milestone` write the log and move the points in one transaction; the routes
also carry a non-atomic fallback for when those functions are absent.

Tasks are two-level — `main` and `sub`, each `daily` or `weekly`. `src/lib/task-hierarchy.ts` is the authority on assembling flat rows into that tree, deriving which tasks are scorable, and computing the daily points cap; do not re-derive this logic inline. `src/lib/task-periods.ts` owns period keys (local date, Monday week start) — timezone handling lives there.

`0006_adaptive.sql` adds the follow-up columns: `goals.streak_freezes` (jsonb array of
local date keys spent as rest days — the one-per-week budget lives in `src/lib/streak.ts`,
not in SQL), `sub_layers.mini_version` (cached two-minute version of a task),
`task_checkins.skip_reason` + `completed_mode`, and the `weekly_reviews` table. Every write
path that touches them checks for Postgres `42703` / PostgREST `PGRST204` and tells the user
to run the migration rather than failing silently — the app stays usable before the paste.

Challenges mutate through Postgres RPCs (`create_goal_challenge`, `join_goal_challenge`, `end_goal_challenge`), not direct table writes; points move through `increment_goal_points`, milestones through `record_goal_milestone` / `delete_goal_milestone`. Six functions in all, and the app calls them by **parameter name** (`p_goal_id`, `goal_uuid`, `points_to_add`, …) — renaming an argument in SQL breaks the call silently.

The challenge functions signal failure by raising an exception whose message contains a code string that `src/app/api/challenges/shared.ts` maps to an HTTP status.

### AI

`src/lib/gemini.ts` wraps all Gemini calls (plan generation, progress evaluation, daily focus, milestone images) and defines typed failures — `GeminiQuotaError`, `GeminiImageUnavailableError` — that routes are expected to handle. Voice notes go to Mistral via `/api/transcribe`.

## Brand

`BRAND.md` owns the identity: the name, the mark, the lockups and the generated
asset set in `public/brand/`. Three things bite:

- The **identity is English only**: the logo reads `METRIX` (always all-caps) in
  every locale, and there is deliberately no Arabic wordmark. The Arabic *copy*
  still calls the product `ماتريكس` (manifesto dialog, top reward tier, auth
  emails) — that is body copy, not branding, and it stays.
- **Never add a light/dark logo pair.** `src/components/brand/Logo.tsx` inlines
  the paths and paints in `currentColor`; that is what replaced the old
  `logo1.svg` / `logo2.svg` + `dark:hidden` swap.
- Assets are **generated**, not hand-drawn: `./scripts/brand/build.sh` rebuilds
  every one byte-identically from `public/brand/source/`. Edit the script, not
  the output.

## Product and design constraints

`PRODUCT.md` and `DESIGN.md` are the source of truth and are specific enough to follow literally: blue `oklch(0.49 0.125 216)` primary (light) / `oklch(0.725 0.115 216)` (dark) — hue 216 is the logo's `#0097b2`, IBM Plex Sans Arabic / Plus Jakarta Sans, motion only as state-change feedback with named duration bands and easing curves, `prefers-reduced-motion` respected everywhere, tabular numerics, RTL treated as first-class rather than a mirror of the LTR layout.

Both fonts load through `next/font/google` in `src/app/layout.tsx`. A `@import url(...)` of
Google Fonts does **not** work here: Tailwind v4 strips the remote import from the compiled
stylesheet, which is why neither family reached the browser at all until 2026-08-24.

`globals.css` names `"Plus Jakarta Sans"` and `"IBM Plex Sans Arabic"` **literally** in its
font stacks and does not use `--font-latin` / `--font-ibm-arabic`. Those variables are
unusable in a stack: next/font folds an auto-generated companion face into each one, so
`--font-latin` expands to `"Plus Jakarta Sans", "Plus Jakarta Sans Fallback"` where the
second is `local("Arial")` with **no `unicode-range`** — i.e. U+0-10FFFF. Any face without a
`unicode-range` matches every codepoint and ends per-glyph matching for every script, so
composing `var(--font-latin), var(--font-ibm-arabic)` put that Arial between the two real
families and rendered **all Arabic in Arial** while IBM Plex Sans Arabic loaded zero faces.
`adjustFontFallback: false` is the documented off switch and is silently stripped on Next
16.3.2 (absent from next/font's types, dropped by its validator). Rules:

- Nothing universal may precede `"IBM Plex Sans Arabic"` in any stack.
- Keep the `.variable` classes on `<html>` — they carry the `@font-face` rules.
- Verify by measurement, not by reading `getComputedStyle().fontFamily`: that returns the
  stack, not the family that actually painted. Compare canvas `measureText` widths of an
  Arabic word under the body stack vs. `"IBM Plex Sans Arabic"` vs. `Arial`, or check
  `document.fonts` for Arabic-subset faces stuck at `status: "unloaded"`.

Arabic tops out at weight 700 (Google ships no 800/900 for the family), so
`font-extrabold` / `font-black` on Arabic render at 700 rather than a synthesised faux-bold.

Contrast is measured against `--canvas` (pure white, `oklch(1 0 0)`), not a grey — `body` is
`bg-canvas`. Measuring against white is how the previous primary shipped at 4.00:1 while
its own comment claimed 5.24:1.

Onboarding (`src/components/shared/WelcomeDialog.tsx`) is a plain skippable feature tour that closes onto the home page. It replaced a flow that requested geolocation, faked an analysis, and signed users out if they declined — keep it informational.

## Auth email templates

`supabase/email-templates/` holds custom Arabic templates. **No code deploys them** — they must be pasted into Supabase Dashboard → Authentication → Emails → Templates, or users get Supabase's English default. The logo is text rather than an image because Gmail does not render SVG and most clients block images; tables and inline styles only.

## Conventions

- Path alias `@/*` → `src/*`.
- shadcn/ui (new-york style) in `src/components/ui/`, lucide icons, Tailwind v4 with CSS variables in `globals.css`.
- `src/components/AppSidebar.tsx` is dead code — not imported anywhere.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
