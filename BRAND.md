# Brand

`DESIGN.md` owns colour, type and motion for the *interface*. This file owns the
**identity**: the name, the mark, the lockup, and the asset set. Where the two
overlap, `DESIGN.md` wins — the brand does not get its own palette.

## The name

**METRIX.** Latin, always all-caps. Never `Metrix`, never `metrix` in prose.

**The identity is English only.** There is no Arabic wordmark and no Arabic
lockup — the logo reads METRIX in every locale, the way Netflix and Spotify do
in Arabic markets. Don't add one back.

This is separate from the UI. The app is still Arabic-first: `layout.tsx` sets
`lang="ar" dir="rtl"`, the copy defaults to Arabic, and the product is referred
to as **ماتريكس** throughout that copy — the manifesto dialog, the top reward
tier (`اخترقت الماتريكس`), the auth emails, the onboarding tour. That is body
copy, not branding, and it stays.

So: the **logo** is METRIX. The **Arabic prose** says ماتريكس. Both are correct.

Lowercase `metrix` survives only as an identifier — `com.metrix.app`,
`metrix_onboarding_seen`, the Vercel host. Never in copy.

## The mark

A six-armed star. It is the source of the whole system's hue: the artwork is
`#0097b2` = `oklch(0.623 0.111 216)`, and hue 216 is what `--primary` is built
from in both themes.

`public/brand/mark.svg` is that exact geometry — lifted from the original
artwork's clip path, normalised to a tight `32 × 30.254` box, and re-emitted at
1.3 KB with `fill="currentColor"`. It was not redrawn, so it is the same shape
the logo has always been.

**Everything paints in `currentColor`.** That is the point. The old
`logo1.svg` / `logo2.svg` pair existed only so a `dark:hidden` /
`hidden dark:block` swap could show a black wordmark on light and a white one on
dark. One `currentColor` asset replaces both, inherits the theme for free, and
cannot drift out of sync with itself.

## Lockup

| Asset | Box | Ratio | Use |
|---|---|---|---|
| `mark.svg` | 32 × 30.25 | 1.06 | Where the name is already on screen. Avatars, favicons, card corners. |
| `lockup-en.svg` | 783.5 × 134 | 5.85 | Star + METRIX, horizontal. The primary lockup. |
| `wordmark-en.svg` | 473.3 × 78.7 | 6.02 | Name alone, no star. |

In the app, use the component rather than the file — it inlines the paths so
`currentColor` works and no network request is needed:

```tsx
import { BrandLockup, BrandMark } from "@/components/brand/Logo";

<BrandLockup className="h-auto w-48 text-foreground" />
<BrandMark className="size-6 text-primary" />
```

`Logo.tsx` is **generated**. Don't hand-edit the path data — change the source
artwork or the build script and re-run `./scripts/brand/build.sh`.

### Clear space and minimum size

- **Clear space**: one mark-width on every side. Nothing else inside it.
- **Minimum size**: the lockup holds at **16 px tall**; below that use
  `mark.svg` alone. The mark holds at **16 px square**.
- Never set the lockup on a busy photo. There is no "knockout" variant, because
  `currentColor` means you set the colour at the call site.

### Don't

- Don't add an Arabic wordmark or lockup.
- Don't recolour the mark to anything outside the tokens — no raw `#0097b2` in
  components. `text-primary` is theme-aware; the hex is not.
- Don't stretch, rotate, outline, or add effects to the lockup.
- Don't rebuild the horizontal lockup by hand — the letter-spacing (4.376 units)
  comes from the source artwork and the build script preserves it.
- Don't reintroduce a light/dark asset pair.

## Colour

One hue, and it belongs to `DESIGN.md`. The brand adds nothing.

| Role | Light | Dark |
|---|---|---|
| Logo artwork | `#0097b2` | — (source only, not a UI token) |
| `--primary` | `oklch(0.49 0.125 216)` → `#00708d` | `oklch(0.725 0.115 216)` → `#37b8d4` |
| `--canvas` (the ground `body` paints) | `oklch(1 0 0)` → `#ffffff` | `oklch(0.125 0 0)` → `#060606` |

App-icon and splash grounds use `--canvas`, and `theme-color` /
`background_color` / Capacitor's `backgroundColor` all carry the same values —
`#060606`, not a navy. A browser chrome or splash that disagrees with the page
reads as two different products.

## Asset set

Everything lives in `public/brand/`.

| File | What it is |
|---|---|
| `mark.svg`, `wordmark-en.svg`, `lockup-en.svg` | `currentColor` vectors |
| `favicon.svg` | Bare mark in `#0097b2` |
| `favicon.ico` | 16/32/48 PNGs in one container |
| `icon.svg`, `icon-{192,512}.png` | App icon — white mark on brand, rounded |
| `icon-maskable{.svg,-512.png}` | Maskable variant, glyph inside the safe zone |
| `apple-touch-icon.png` | 180 × 180 |
| `og.{svg,png}` | 1200 × 630 social card |
| `source/logo-mark.svg`, `source/logo-stacked.svg` | **Original artwork.** The build reads these; don't delete them. |

Wired up in:

- `src/components/brand/Logo.tsx` — generated component
- `src/app/layout.tsx` — icons, Open Graph, Twitter card, `themeColor`
- `src/app/manifest.ts` — the web manifest, generated so it always carries
  `application/manifest+json` (a static `public/*.webmanifest` gets `text/html`
  from the dev server)
- `src/proxy.ts` — `webmanifest` and `ico` are in the matcher's exclusion list.
  Without them the proxy bounces `/manifest.webmanifest` to `/login` for a
  signed-out visitor and the browser gets HTML where it expects JSON.
- `src/app/favicon.ico` — a copy of the brand one, for Next's file convention.
  `build.sh` keeps them in sync.
- `mobile/android/.../res/` — launcher icons and splashes
- `mobile/capacitor.config.ts` — `appName: "METRIX"`, `backgroundColor: "#060606"`

## Regenerating

```bash
./scripts/brand/build.sh
```

Byte-for-byte reproducible: a clean rebuild produces identical files.

It needs a Python venv at `scripts/brand/venv` with `fonttools`, `brotli` and
`uharfbuzz`, and it reads Plus Jakarta Sans out of next/font's cache under
`.next/static/media` to set the social-card tagline, so run `npm run build` at
least once first. The font is not vendored.

One detail that is easy to get wrong: **flip the mark offset with the Y axis.**
Font space is y-up, SVG is y-down, so a glyph's `y_offset` must be negated along
with the outline. Getting it wrong puts combining marks on the wrong side of the
letter — which is how the shadda bug in the old Arabic tagline showed up.
