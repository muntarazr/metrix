/**
 * The dashboard's surface scale.
 *
 * Panels had drifted to seven different values — `bg-card`, `bg-card/60`,
 * `bg-card/40`, `bg-card/35`, `bg-card/30`, `bg-muted/[0.03]` — stacked in one
 * column over the page canvas. The lightest sat 15 steps above the canvas, the
 * darkest sat exactly on it and disappeared. Borders and shadows drifted with
 * them. Import from here instead of re-spelling a panel's chrome.
 *
 * Three levels, and nothing in between:
 *   canvas  — the page, `bg-canvas`, painted by the app shell
 *   PANEL   — anything that sits on the page and holds content
 *   WELL    — a slot recessed *inside* a panel (empty calendar day, toolbar strip)
 *
 * A panel is opaque on purpose. Translucent panels composite against whatever
 * happens to be behind them, which is how the values drifted apart to begin
 * with; `bg-card` resolves the same everywhere and in both themes.
 */

/**
 * Surface and elevation without a border, for panels whose border carries state
 * (selected, active). Those need to own their `border-*` outright: two border
 * colours in one class list are decided by Tailwind's output order, not by
 * which one you wrote last.
 *
 * Reach for this only in that case — a selected panel keeps the white surface
 * and moves the accent to its border. Tinting the background instead (a bare
 * `bg-primary/[0.02]`, say) drops the white base, and the "highlighted" panel
 * composites *darker* than the page it sits on.
 */
/*
 * The elevation comes from `shadow-xs` (`--elev-xs`), not a hand-rolled value.
 * This used to be `shadow-[0_1px_3px_-1px_rgba(0,0,0,0.03)]` with a `dark:`
 * twin — 3% alpha, which paints nothing at all, so every one of the ten files
 * importing this constant rendered a panel with no elevation whatsoever. That
 * is the flatness DESIGN.md set out to fix, shipped from the very helper meant
 * to enforce the fix, and DESIGN.md forbids the pattern by name.
 * The token also carries its own dark-theme value, so the `dark:` override is
 * not merely unnecessary — it was overriding a theme-aware value with a
 * hardcoded black one.
 */
export const PANEL_BASE = "bg-card shadow-xs";

/**
 * Chrome for a panel: border, surface, elevation. Radius, layout and padding
 * belong to the call site — a radius here would collide with the `rounded-xl`
 * of smaller panels, and which one won would come down to Tailwind's output
 * order rather than anything intentional.
 */
export const PANEL_SURFACE = `border border-border/50 ${PANEL_BASE}`;

/**
 * A recessed slot inside a panel. Reuses the page-canvas token, so it is always
 * exactly one step below the panel it sits in — lighter in light mode, darker in
 * dark mode — instead of being white-on-white.
 */
export const WELL_SURFACE = "border border-border/50 bg-canvas";

/** Same recess without its own border, for slots that are separated by spacing alone. */
export const WELL_SURFACE_BARE = "bg-canvas";
