/**
 * Streak counting with rest days.
 *
 * A streak that snaps on the first bad day punishes the exact user who is still
 * trying, so one frozen day per week keeps the chain alive. Frozen days are
 * stored on `goals.streak_freezes` as an array of local date keys.
 */

import { getLocalDateKey, getLocalWeekStartMonday } from '@/lib/task-periods';

/** How many rest days a user gets inside one Monday-start week. */
export const FREEZES_PER_WEEK = 1;

/** How far back the streak walk goes. */
const MAX_STREAK_LOOKBACK_DAYS = 365;

/** Tolerates the jsonb column being absent, null, or holding junk. */
export function parseStreakFreezes(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (value): value is string =>
      typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value),
  );
}

function dateKeyDaysAgo(days: number, today = new Date()): string {
  const date = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - days,
  );
  return getLocalDateKey(date);
}

/**
 * Counts back from today. A day survives if it was logged or frozen; today
 * being empty is not yet a break.
 */
export function computeStreak(
  loggedDateKeys: Set<string>,
  freezes: string[] = [],
  today = new Date(),
): number {
  const frozen = new Set(freezes);
  let count = 0;

  for (let i = 0; i < MAX_STREAK_LOOKBACK_DAYS; i++) {
    const key = dateKeyDaysAgo(i, today);
    if (loggedDateKeys.has(key)) {
      count++;
    } else if (frozen.has(key)) {
      // A rest day holds the chain without adding to it.
      continue;
    } else if (i > 0) {
      break;
    }
  }

  return count;
}

/** Freezes already spent in the Monday-start week containing `today`. */
export function freezesUsedThisWeek(freezes: string[], today = new Date()): number {
  const weekStart = getLocalWeekStartMonday(today);
  return freezes.filter((key) => getLocalWeekStartMonday(new Date(key)) === weekStart)
    .length;
}

export function hasFreezeBudget(freezes: string[], today = new Date()): boolean {
  return freezesUsedThisWeek(freezes, today) < FREEZES_PER_WEEK;
}

/**
 * The day a rest day would actually rescue — yesterday, when it is empty and
 * the budget is unspent. Returns null when freezing would change nothing.
 */
export function getFreezableDate(
  loggedDateKeys: Set<string>,
  freezes: string[],
  today = new Date(),
): string | null {
  if (!hasFreezeBudget(freezes, today)) return null;

  const yesterday = dateKeyDaysAgo(1, today);
  if (loggedDateKeys.has(yesterday)) return null;
  if (freezes.includes(yesterday)) return null;

  // Only worth offering if something is standing behind the gap.
  const dayBefore = dateKeyDaysAgo(2, today);
  const streakBehindGap =
    loggedDateKeys.has(dayBefore) || freezes.includes(dayBefore);
  if (!streakBehindGap) return null;

  return yesterday;
}
