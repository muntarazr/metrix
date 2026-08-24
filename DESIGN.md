# Design

## Palette

Monochrome first. The interface is black, white and grey; the teal is a single
accent that should cover roughly a tenth of any given screen, never more. If a
new element needs to stand out, reach for a *tone* of the neutral scale before
reaching for the accent.

- **Theme Mode**: System default with a neutral deep dark mode.
- **Neutrals** (zero chroma in both themes — a grey with a hue tint reads as a
  second colour and is what made the old interface feel inconsistent).
- **Primary / Accent** — the only hue in the system, taken from the logo:
  - Light mode: `oklch(0.49 0.125 216)` — renders `#00708d`.
  - Dark mode: `oklch(0.725 0.115 216)` — renders `#36b8d4`.

  Hue 216 is the logo itself: `#0097b2` is `oklch(0.623 0.111 216)`. The hue had
  drifted to 218 with no reason recorded.

  **Measure contrast against `--canvas`, never against white.** `body` is
  `bg-canvas` (`oklch(0.927 0 0)`), so that is the surface text actually sits on.
  The previous light primary was justified in this file as "5.24:1" — true on
  white, but it measured **4.00:1 on canvas and failed AA** across ~163
  `text-primary` call sites. The current value measures 4.587:1 on canvas and
  5.672:1 on card; dark measures 8.649:1 and 7.036:1.

### Elevation

Hue was never the whole problem. The interface read as flat because every
surface was within a couple of percent of every other one: cards were 1.08:1
against the page and borders 1.27:1 against the cards, so nothing had an edge.
The ramp below is the fix, and **both themes must stay symmetric** — a recessed
surface is darker than its card in light mode and darker in dark mode too.

| Role | Light | Dark | vs `--card` |
|---|---|---|---|
| `--canvas` (page ground) | `0.927` | `0.125` | 1.24 / 1.23 |
| `--muted`, `--secondary` (recessed track) | `0.958` | `0.185` | 1.13 / 1.13 |
| `--surface` (inset panel) | `0.968` | `0.205` | — |
| `--card`, `--popover` (raised) | `1.0` | `0.238` | — |
| `--accent` (hover lift) | `0.948` | `0.302` | — |
| `--border` | `0.842` | `0.352` | 1.62 / 1.47 |
| `--input` (controls read louder) | `0.795` | `0.415` | 1.90 / 1.92 |

Shadows come from `--elev-xs/sm/md/lg` (exposed as `shadow-xs…shadow-lg`). Never
hand-roll `shadow-[0_1px_2px_rgba(0,0,0,0.03)]`: at that alpha it paints nothing,
and a hardcoded black shadow does not adapt to the dark theme.
- **Destructive** — desaturated, and reserved for genuine failure and deletion,
  never for emphasis or for "intense" states like a long streak:
  - Light mode: `oklch(0.505 0.155 27.5)`.
  - Dark mode: `oklch(0.63 0.16 25)`.

### Rules

- **Never write a Tailwind palette class** (`text-amber-600`, `bg-emerald-500/10`,
  `border-slate-200`) in application code. Use the semantic tokens: `primary`,
  `foreground`, `muted-foreground`, `border`, `card`, `destructive`, and the
  `success` / `warning` / `info` roles with their `-soft` surfaces.
- **A `dark:` variant on a hardcoded hue is a bug.** The tokens are already
  theme-aware; a `dark:` override means the element is bypassing them.
- **Scales are tones, not hues.** Difficulty tiers, streak intensity, task
  accents and rating levels are all expressed as steps of `foreground` opacity,
  with the teal reserved for the top step where it means something.
- `src/lib/task-colors.ts` is the task accent ramp and `accentConfig` in
  `ActivityCard.tsx` is the challenge one. Both keep their original keys for
  data compatibility while rendering tones; retired hues are aliased, not deleted.
- **Opacity comes from a fixed scale, not from taste.** `--primary` alone was
  being used at 23 different alphas, which is why the UI looked unsystematic
  even once the hues agreed. Pick from:
  - fills (`bg-`, `from-`, `to-`, `shadow-`): `/8` `/12` `/20` `/60` `/90`
  - strokes (`border-`, `ring-`): `/15` `/25` `/45` `/70`
  - text: `/50` `/75` `/90`
- **`bg-background` is the page base, `bg-card` is a raised surface.** Anything
  with a shadow or a selected state wants `bg-card`. Using `bg-background` for a
  selected pill made it the darkest thing on screen in dark mode — the active
  tab looked pressed in rather than lifted out.
- **Below `border-border/60` a border stops painting an edge.** Don't dilute
  structural borders past that; use a lighter *token*, not a lower alpha.

## Typography

- **Arabic Font**: IBM Plex Sans Arabic.
- **Latin Font**: Plus Jakarta Sans / Inter.
- **Loading**: both come from `next/font/google` in `src/app/layout.tsx`, which
  owns `--font-ibm-arabic` and `--font-latin`. Do not redefine those in
  `globals.css`, and do not reach for `@import url(...)` — Tailwind v4 drops the
  remote import from the compiled CSS, so neither family loaded at all until
  2026-08-24 and the app rendered entirely in the OS default sans-serif.
- **Order**: Latin family first, Arabic second. Font matching is per-glyph, not
  first-family-wins, so Arabic still resolves to IBM Plex Sans Arabic. Never end
  a composed stack with `sans-serif` before the last family — a generic matches
  every glyph and makes everything after it unreachable.
- **Hierarchy Scale**: Major Second (1.125) or Minor Third (1.2).

## Motion

- **Durations**:
  - `100-150ms`: Toggles, button press, checkbox tick.
  - `200-300ms`: Tab selection active indicator slide, hover effects.
  - `300-400ms`: Accordion expand/collapse (subtask lists).
  - `400-600ms`: Dialog overlays, toast slide-in.
- **Easing Curves**:
  - Decelerate (ease-out): `cubic-bezier(0.25, 1, 0.5, 1)` (ease-out-quart)
  - Decelerate Snappy: `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out-quint)
  - Decelerate Decisive: `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-expo)
- **Rules**:
  - Disable all transitions when `prefers-reduced-motion` is enabled.
  - Avoid layout thrashing animations (never transition layout properties directly like `height` if grid transitions or `transform: scaleY` can be used).
