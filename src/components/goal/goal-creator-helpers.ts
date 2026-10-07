import type {
    FlatTask,
    PlanResult,
    ApiErrorResponse,
    InvestigationResult,
} from './goal-creator-types';

export const isArabicText = (text: string): boolean => /[\u0600-\u06FF]/.test(text);

export const isApiErrorResponse = (value: unknown): value is ApiErrorResponse =>
    typeof value === 'object' &&
    value !== null &&
    ('error' in value || 'message_ar' in value || 'message_en' in value);

export const isPlanResult = (value: unknown): value is PlanResult =>
    typeof value === 'object' &&
    value !== null &&
    ('plan' in value || 'ai_summary' in value || 'main_tasks' in value || 'tasks' in value);

export const isInvestigationResult = (value: unknown): value is InvestigationResult =>
    typeof value === 'object' &&
    value !== null &&
    ('status' in value || 'questions' in value || 'goal_understanding' in value || 'safe_redirection' in value);

/** Normalize any AI/user-provided weekday list → sorted unique 0..6, or null (= all days). */
export function normalizeScheduleDays(value: unknown): number[] | null {
    if (!Array.isArray(value)) return null;
    const days = Array.from(new Set(
        value.map(d => Math.round(Number(d))).filter(d => Number.isFinite(d) && d >= 0 && d <= 6),
    )).sort((a, b) => a - b);
    if (days.length === 0 || days.length === 7) return null;
    return days;
}

/**
 * Deterministic timeline extraction: pulls a duration in DAYS out of answers
 * like "2 أسبوع", "90 يوماً", "3 أشهر" — never minutes/hours.
 * Returns null when no period duration is stated.
 */
export function extractDurationDaysFromAnswers(context: Record<string, string>): number | null {
    for (const value of Object.values(context)) {
        const m = String(value).match(/(\d+(?:[.,]\d+)?)\s*(أشهر|شهرين|شهراً|شهر|أسابيع|أسبوعين|أسبوع|أيام|يومين|يوماً|يوم|months?|weeks?|days?)/i);
        if (!m) continue;
        const amount = parseFloat(m[1].replace(',', '.'));
        if (!Number.isFinite(amount) || amount <= 0) continue;
        const unit = m[2].toLowerCase();
        if (/أشهر|شهر|month/.test(unit)) return Math.round(amount * 30);
        if (/أسابيع|أسبوع|week/.test(unit)) return Math.round(amount * 7);
        return Math.round(amount);
    }
    return null;
}

/** "84 يوماً ≈ 12 أسبوعاً ≈ 3 أشهر" style label for the review screen. */
export function formatDurationLabel(days: number, isArabic: boolean): string {
    const weeks = Math.round(days / 7);
    const months = Math.round(days / 30);
    if (isArabic) {
        const arWeeks = weeks === 1 ? 'أسبوع واحد' : weeks === 2 ? 'أسبوعان' : `${weeks} أسابيع`;
        const arMonths = months === 1 ? 'شهر واحد' : months === 2 ? 'شهران' : `${months} أشهر`;
        if (days >= 60) return `${days} يوماً ≈ ${arWeeks} ≈ ${arMonths}`;
        if (days >= 14) return `${days} يوماً ≈ ${arWeeks}`;
        return `${days} يوماً`;
    }
    if (days >= 60) return `${days} days ≈ ${weeks} weeks ≈ ${months} months`;
    if (days >= 14) return `${days} days ≈ ${weeks} weeks`;
    return `${days} days`;
}

export function extractFlatTasks(planResult: PlanResult, fallbackGoal: string): FlatTask[] {
    if (Array.isArray(planResult.tasks) && planResult.tasks.length > 0) {
        return planResult.tasks.map((t, idx) => ({
            id: t.id || `task_${idx + 1}`,
            task: t.task || `Task ${idx + 1}`,
            frequency: t.frequency === 'weekly' ? 'weekly' : 'daily',
            schedule_days: normalizeScheduleDays(t.schedule_days),
            impact_weight: Math.max(1, Math.min(5, Number(t.impact_weight) || 1)),
            time_required_minutes: Math.max(5, Number(t.time_required_minutes) || 20),
            completion_criteria: t.completion_criteria || '',
            included: true,
        }));
    }

    if (Array.isArray(planResult.main_tasks) && planResult.main_tasks.length > 0) {
        const flat: FlatTask[] = [];
        let counter = 1;
        for (const main of planResult.main_tasks) {
            const subs = Array.isArray(main.subtasks) ? main.subtasks : [];
            if (subs.length > 0) {
                for (const sub of subs) {
                    flat.push({
                        id: sub.id || `task_${counter++}`,
                        task: sub.task || `Task ${counter}`,
                        frequency: sub.frequency === 'weekly' ? 'weekly' : 'daily',
                        schedule_days: normalizeScheduleDays(sub.schedule_days),
                        impact_weight: Math.max(1, Math.min(5, Number(sub.impact_weight) || 1)),
                        time_required_minutes: Math.max(5, Number(sub.time_required_minutes) || 20),
                        completion_criteria: sub.completion_criteria || main.completion_criteria || '',
                        included: true,
                    });
                }
            } else {
                flat.push({
                    id: main.id || `task_${counter++}`,
                    task: main.task || `Task ${counter}`,
                    frequency: main.frequency === 'weekly' ? 'weekly' : 'daily',
                    schedule_days: normalizeScheduleDays(main.schedule_days),
                    impact_weight: Math.max(1, Math.min(5, Number(main.impact_weight) || 3)),
                    time_required_minutes: 25,
                    completion_criteria: main.completion_criteria || '',
                    included: true,
                });
            }
        }
        return flat;
    }

    return [{
        id: 'task_1',
        task: planResult.plan?.goal_summary || fallbackGoal || 'Action task',
        frequency: 'daily',
        schedule_days: null,
        impact_weight: 3,
        time_required_minutes: 30,
        completion_criteria: 'إتمام النشاط اليومي المحدد وتوثيقه بدقة',
        included: true,
    }];
}
