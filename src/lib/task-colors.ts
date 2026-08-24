export type TaskColorKey =
  | 'sky'
  | 'emerald'
  | 'amber'
  | 'orange'
  | 'pink'
  | 'violet'
  | 'cyan'
  | 'blue'
  | 'indigo'
  | 'fuchsia'
  | 'rose'
  | 'lime'
  | 'teal'
  | 'zinc';

export interface TaskAccent {
  key: TaskColorKey;
  labelEn: string;
  labelAr: string;
  fill: string;
  swatchClass: string;
  softClass: string;
  textClass: string;
  borderClass: string;
}

/**
 * One monochrome ramp, not a rainbow. Tasks used to be auto-assigned one of
 * fourteen hues by seed hash, which is where most of the interface's colour
 * inconsistency came from. The ramp below distinguishes tasks by *tone*, and
 * teal — the single brand accent — is opt-in rather than dealt out at random.
 *
 * The keys are unchanged because they are already stored on `sub_layers.accent_color`;
 * retired hues are aliased onto a tone by LEGACY_TASK_COLOR_ALIASES.
 */
export const TASK_COLOR_OPTIONS: TaskAccent[] = [
  {
    key: 'zinc',
    labelEn: 'Ink',
    labelAr: 'حبري',
    fill: '#3f3f46',
    swatchClass: 'bg-foreground',
    softClass: 'bg-foreground/[0.08]',
    textClass: 'text-foreground',
    borderClass: 'border-foreground/25',
  },
  {
    key: 'violet',
    labelEn: 'Charcoal',
    labelAr: 'فحمي',
    fill: '#52525b',
    swatchClass: 'bg-foreground/75',
    softClass: 'bg-foreground/[0.06]',
    textClass: 'text-foreground/85',
    borderClass: 'border-foreground/20',
  },
  {
    key: 'sky',
    labelEn: 'Graphite',
    labelAr: 'رمادي',
    fill: '#71717a',
    swatchClass: 'bg-muted-foreground',
    softClass: 'bg-muted/60',
    textClass: 'text-muted-foreground',
    borderClass: 'border-border',
  },
  {
    key: 'amber',
    labelEn: 'Silver',
    labelAr: 'فضي',
    fill: '#a1a1aa',
    swatchClass: 'bg-muted-foreground/60',
    softClass: 'bg-muted/40',
    textClass: 'text-muted-foreground/90',
    borderClass: 'border-border/70',
  },
  {
    key: 'rose',
    labelEn: 'Mist',
    labelAr: 'ضبابي',
    fill: '#d4d4d8',
    swatchClass: 'bg-muted-foreground/35',
    softClass: 'bg-muted/25',
    textClass: 'text-muted-foreground/80',
    borderClass: 'border-border/50',
  },
  {
    key: 'teal',
    labelEn: 'Teal',
    labelAr: 'فيروزي',
    fill: '#0097b2',
    swatchClass: 'bg-primary',
    softClass: 'bg-primary/10',
    textClass: 'text-primary',
    borderClass: 'border-primary/25',
  },
];

/** Hues retired from the palette, mapped onto the tone that replaced them. */
const LEGACY_TASK_COLOR_ALIASES: Record<string, TaskColorKey> = {
  emerald: 'teal',
  cyan: 'teal',
  lime: 'sky',
  orange: 'amber',
  pink: 'rose',
  blue: 'violet',
  indigo: 'violet',
  fuchsia: 'zinc',
};

const taskAccentMap = new Map(TASK_COLOR_OPTIONS.map((accent) => [accent.key, accent]));

/** Auto-assignment stays on the neutral tones so teal is never dealt out at random. */
const AUTO_TASK_COLOR_OPTIONS = TASK_COLOR_OPTIONS.filter((accent) => accent.key !== 'teal');

function hashSeed(seed: string): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function normalizeTaskColorKey(value?: string | null): TaskColorKey | null {
  if (!value) return null;
  if (taskAccentMap.has(value as TaskColorKey)) return value as TaskColorKey;
  return LEGACY_TASK_COLOR_ALIASES[value] ?? null;
}

export function getTaskAccent(seed?: string | null, preferredColor?: string | null): TaskAccent {
  const explicitColor = normalizeTaskColorKey(preferredColor);
  if (explicitColor) {
    return taskAccentMap.get(explicitColor)!;
  }

  const normalized = (seed || 'task-accent').trim() || 'task-accent';
  return AUTO_TASK_COLOR_OPTIONS[hashSeed(normalized) % AUTO_TASK_COLOR_OPTIONS.length]!;
}
