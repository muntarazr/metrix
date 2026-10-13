import type { Language } from "@/lib/translations";

export interface CalendarCell {
  date: string;
  dayNum: number;
  isBeforeStart: boolean;
  isAfterToday: boolean;
  isToday: boolean;
  hasLogs: boolean;
  logCount: number;
  totalPoints: number;
  badge: "none" | "strong" | "exceptional";
  isFrozen?: boolean;
}

export type HeatTier = 0 | 1 | 2 | 3 | 4 | 5;

export const HEAT_TIERS: HeatTier[] = [0, 1, 2, 3, 4, 5];

export const HEAT_SURFACE: Record<HeatTier, string> = {
  0: "border-border/50 bg-muted/25 hover:bg-muted/45",
  1: "border-primary/20 bg-primary/10 hover:bg-primary/15",
  2: "border-primary/30 bg-primary/20 hover:bg-primary/25",
  3: "border-primary/45 bg-primary/40 hover:bg-primary/45",
  4: "border-primary/60 bg-primary/65 hover:bg-primary/70",
  5: "border-primary/75 bg-primary/90 hover:bg-primary/95",
};

export const HEAT_TEXT: Record<HeatTier, string> = {
  0: "text-muted-foreground",
  1: "text-foreground",
  2: "text-foreground",
  3: "text-foreground dark:text-primary-foreground",
  4: "text-primary-foreground font-semibold",
  5: "text-primary-foreground font-bold",
};

export const HEAT_TODAY_RING: Record<HeatTier, string> = {
  0: "ring-2 ring-primary ring-offset-1 ring-offset-card",
  1: "ring-2 ring-primary ring-offset-1 ring-offset-card",
  2: "ring-2 ring-primary ring-offset-1 ring-offset-card",
  3: "ring-2 ring-foreground/60 ring-offset-1 ring-offset-card",
  4: "ring-2 ring-foreground/75 ring-offset-1 ring-offset-card",
  5: "ring-2 ring-foreground/90 ring-offset-1 ring-offset-card",
};

export function parseLocalDay(value: string) {
  const [year, month, day] = value.split("T")[0].split("-").map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function heatTier(
  points: number,
  dailyCap: number,
  hasLogs: boolean,
): HeatTier {
  if (!hasLogs) return 0;
  // Logged, but nothing scored — its own state, not the strongest day of the month.
  if (points <= 0) return 1;

  const ratio = dailyCap > 0 ? points / dailyCap : 0;
  if (ratio >= 0.85) return 5;
  if (ratio >= 0.6) return 4;
  if (ratio >= 0.35) return 3;
  return 2;
}

export function getDayBadgeLabel(
  badge: CalendarCell["badge"],
  language: Language = "ar",
) {
  if (badge === "none") return null;
  if (language === "ar") {
    return badge === "exceptional" ? "يوم استثنائي" : "يوم قوي";
  }
  return badge === "exceptional" ? "Exceptional Day" : "Strong Day";
}

export interface DayCalendarTooltipData {
  date: string;
  count: number;
  pts: number;
  x: number;
  y: number;
  state: "active" | "before-start" | "future";
  badgeLabel: string | null;
}
