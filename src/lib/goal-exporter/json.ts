import type { FullGoalExportData } from './types.ts';
import { computeGoalExportAnalytics } from './analytics.ts';

/**
 * Generates structured JSON export payload with all relations and analytics.
 */
export function generateGoalJsonExport(data: FullGoalExportData): string {
    const analytics = computeGoalExportAnalytics(data);

    const payload = {
        meta: {
            app: 'METRIX',
            export_version: '2.0.0',
            exported_at: new Date().toISOString(),
        },
        goal: data.goal,
        analytics,
        tasks_hierarchy: data.tasks,
        checkins_log: data.checkins,
        daily_logs: data.dailyLogs,
        daily_focus_sessions: data.dailyFocusAnswers,
        weekly_reviews: data.weeklyReviews,
        reminders: data.reminders,
        challenges: data.challenges,
    };

    return JSON.stringify(payload, null, 2);
}
