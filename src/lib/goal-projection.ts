/**
 * Live completion-date projection.
 *
 * `goals.estimated_completion_date` is written once when the plan is created and
 * never moves again, so two weeks in it is fiction. This derives the date the
 * user is *actually* heading for from the points they have earned so far, and
 * says how far that is from the promise. Pure computation — no database column,
 * no Gemini call.
 */

export type PaceTone = 'ahead' | 'on-track' | 'behind' | 'stalled';

/** Below this many elapsed days the rate is noise, not a signal. */
const MIN_DAYS_FOR_SIGNAL = 3;

/** A day either side of the plan is not worth reporting as drift. */
const ON_TRACK_TOLERANCE_DAYS = 3;

/** Refuse to project past this horizon; the number stops meaning anything. */
const MAX_PROJECTED_DAYS = 3650;

export interface GoalProjection {
  /** ISO yyyy-mm-dd the current pace lands on; null when the pace is zero. */
  projectedDate: string | null;
  /** Projected minus planned, in days. Positive = later than promised. */
  deltaDays: number | null;
  tone: PaceTone;
  /** Actual points/day earned so far. */
  pointsPerDay: number;
  /** Actual rate ÷ the rate the original plan needed. 1 = exactly on plan. */
  paceRatio: number | null;
  daysElapsed: number;
}

export interface GoalProjectionInput {
  currentPoints: number;
  targetPoints: number;
  /** goals.created_at */
  createdAt: string;
  /** goals.estimated_completion_date */
  plannedEndDate: string | null | undefined;
  today?: Date;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86400000);
}

function toIsoDateKey(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Returns null when there is nothing honest to say: goal finished, plan too
 * young to have a rate, or the dates are unusable.
 */
export function computeGoalProjection({
  currentPoints,
  targetPoints,
  createdAt,
  plannedEndDate,
  today = new Date(),
}: GoalProjectionInput): GoalProjection | null {
  const start = new Date(createdAt);
  if (Number.isNaN(start.getTime())) return null;
  if (!Number.isFinite(currentPoints) || !Number.isFinite(targetPoints)) return null;
  if (targetPoints <= 0) return null;
  if (currentPoints >= targetPoints) return null;

  const daysElapsed = Math.max(1, daysBetween(start, today));
  if (daysElapsed < MIN_DAYS_FOR_SIGNAL) return null;

  const pointsPerDay = currentPoints / daysElapsed;

  const planned = plannedEndDate ? new Date(plannedEndDate) : null;
  const plannedUsable = planned && !Number.isNaN(planned.getTime()) ? planned : null;
  const plannedTotalDays = plannedUsable ? Math.max(1, daysBetween(start, plannedUsable)) : null;
  const requiredRate = plannedTotalDays ? targetPoints / plannedTotalDays : null;
  const paceRatio = requiredRate && requiredRate > 0 ? pointsPerDay / requiredRate : null;

  if (pointsPerDay <= 0) {
    return {
      projectedDate: null,
      deltaDays: null,
      tone: 'stalled',
      pointsPerDay: 0,
      paceRatio: 0,
      daysElapsed,
    };
  }

  const daysNeeded = Math.min(
    MAX_PROJECTED_DAYS,
    Math.ceil((targetPoints - currentPoints) / pointsPerDay),
  );
  const projected = startOfDay(today);
  projected.setDate(projected.getDate() + daysNeeded);

  const deltaDays = plannedUsable ? daysBetween(plannedUsable, projected) : null;

  let tone: PaceTone = 'on-track';
  if (deltaDays !== null) {
    if (deltaDays <= -ON_TRACK_TOLERANCE_DAYS) tone = 'ahead';
    else if (deltaDays >= ON_TRACK_TOLERANCE_DAYS) tone = 'behind';
  }

  return {
    projectedDate: toIsoDateKey(projected),
    deltaDays,
    tone,
    pointsPerDay,
    paceRatio,
    daysElapsed,
  };
}

export interface ProjectionCopy {
  /** One short line, e.g. «بهذا المعدل تخلص 12 سبتمبر — أبطأ 40% من الخطة». */
  text: string;
  tone: PaceTone;
}

/** Bilingual one-liner for the projection. Arabic keeps English digits. */
export function formatProjectionCopy(
  projection: GoalProjection,
  isArabic: boolean,
): ProjectionCopy {
  if (projection.tone === 'stalled' || !projection.projectedDate) {
    return {
      tone: 'stalled',
      text: isArabic
        ? 'ما بعد صار تقدم — أول إنجاز يحسب المعدل'
        : 'No progress yet — the first check-in sets your pace',
    };
  }

  const locale = isArabic ? 'ar-SA-u-ca-gregory-nu-latn' : 'en-US';
  const dateLabel = new Date(projection.projectedDate).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
  });

  const head = isArabic
    ? `بهذا المعدل تخلص ${dateLabel}`
    : `At this pace you finish ${dateLabel}`;

  if (projection.deltaDays === null) {
    return { tone: projection.tone, text: head };
  }

  // A slower-by-X% reading is more useful than a raw day count, but only when
  // the original plan gave us a rate to compare against.
  const slowerPct =
    projection.paceRatio && projection.paceRatio > 0
      ? Math.round(Math.abs(1 - projection.paceRatio) * 100)
      : null;

  const days = Math.abs(projection.deltaDays);

  if (projection.tone === 'on-track') {
    return {
      tone: 'on-track',
      text: isArabic ? `${head} — على الخطة` : `${head} — on plan`,
    };
  }

  if (projection.tone === 'ahead') {
    const tail =
      slowerPct && slowerPct >= 5
        ? isArabic
          ? `أسرع ${slowerPct}% من الخطة`
          : `${slowerPct}% faster than planned`
        : isArabic
          ? `${days} يوم قبل الموعد`
          : `${days} day${days === 1 ? '' : 's'} early`;
    return { tone: 'ahead', text: `${head} — ${tail}` };
  }

  const tail =
    slowerPct && slowerPct >= 5
      ? isArabic
        ? `أبطأ ${slowerPct}% من الخطة`
        : `${slowerPct}% slower than planned`
      : isArabic
        ? `${days} يوم بعد الموعد`
        : `${days} day${days === 1 ? '' : 's'} late`;
  return { tone: 'behind', text: `${head} — ${tail}` };
}
