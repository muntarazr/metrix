export type PeriodType = 'daily' | 'weekly';

function toLocalDate(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getLocalDateKey(date = new Date()): string {
  const local = toLocalDate(date);
  const yyyy = local.getFullYear();
  const mm = String(local.getMonth() + 1).padStart(2, '0');
  const dd = String(local.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function getLocalWeekStartMonday(date = new Date()): string {
  const local = toLocalDate(date);
  const jsDay = local.getDay(); // Sunday=0 ... Saturday=6
  const diffToMonday = (jsDay + 6) % 7; // Monday=0
  local.setDate(local.getDate() - diffToMonday);
  return getLocalDateKey(local);
}

export function getPeriodStart(frequency: string, date = new Date()): string {
  return frequency === 'weekly'
    ? getLocalWeekStartMonday(date)
    : getLocalDateKey(date);
}

export function getPeriodTypeFromFrequency(frequency: string): PeriodType {
  return frequency === 'weekly' ? 'weekly' : 'daily';
}

export function getLocalDayWindow(referenceDate = new Date()): { start: Date; end: Date } {
  const start = new Date(referenceDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
}

/**
 * Normalize any AI/user-provided weekday list → sorted unique 0..6, or null (= all days).
 */
export function normalizeScheduleDays(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;
  const days = Array.from(new Set(
    value.map(d => Math.round(Number(d))).filter(d => Number.isFinite(d) && d >= 0 && d <= 6),
  )).sort((a, b) => a - b);
  if (days.length === 0 || days.length === 7) return null;
  return days;
}

/**
 * Toggle a weekday (0..6) within a schedule_days list.
 * If currentDays is null/empty, all days [0..6] are considered active initially.
 */
export function toggleScheduleDay(
  currentDays: number[] | null | undefined,
  dayIdx: number,
  allDays: number[] = [0, 1, 2, 3, 4, 5, 6]
): number[] | null {
  const current = currentDays && currentDays.length > 0 ? currentDays : allDays;
  const next = current.includes(dayIdx)
    ? current.filter((i) => i !== dayIdx)
    : [...current, dayIdx];
  return normalizeScheduleDays(next);
}

