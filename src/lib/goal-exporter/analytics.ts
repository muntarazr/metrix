import type { FullGoalExportData, GoalExportAnalytics } from './types.ts';

/**
 * Computes deep analytics across all goal data dimensions.
 */
export function computeGoalExportAnalytics(data: FullGoalExportData): GoalExportAnalytics {
    const { goal, tasks, checkins, dailyLogs, dailyFocusAnswers, weeklyReviews } = data;

    // Timeline calculation
    const startMs = new Date(goal.created_at).getTime();
    const nowMs = Date.now();
    const rawElapsedDays = Math.max(1, Math.ceil((nowMs - startMs) / (1000 * 60 * 60 * 24)));
    const totalDays = goal.total_days && goal.total_days > 0 ? goal.total_days : 30;
    const daysElapsed = Math.min(totalDays, rawElapsedDays);
    const daysRemaining = Math.max(0, totalDays - daysElapsed);
    const timeProgressPercent = Math.min(100, Math.round((daysElapsed / totalDays) * 100));

    // Points calculation
    const currentPoints = goal.current_points || 0;
    const targetPoints = goal.target_points || 1;
    const pointsProgressPercent = Math.min(100, Math.round((currentPoints / targetPoints) * 100));
    const isCompleted = pointsProgressPercent >= 100 || goal.status === 'completed';

    // Velocity / Pace
    const pointsVelocityActual = Math.round(currentPoints / daysElapsed);
    const pointsVelocityRequired = Math.round(targetPoints / totalDays);

    let paceStatus: GoalExportAnalytics['timeline']['paceStatus'] = 'on_track';
    if (isCompleted) {
        paceStatus = 'completed';
    } else if (currentPoints === 0 && daysElapsed > 3) {
        paceStatus = 'stalled';
    } else if (pointsVelocityActual >= pointsVelocityRequired * 1.1) {
        paceStatus = 'ahead';
    } else if (pointsVelocityActual < pointsVelocityRequired * 0.75) {
        paceStatus = 'behind';
    }

    // Tasks commitment
    const mainTasks = tasks.filter(t => t.task_type === 'main');
    const subTasks = tasks.filter(t => t.task_type === 'sub');
    let dailyMinutes = 0;
    let weeklyMinutes = 0;

    tasks.forEach(t => {
        const mins = t.time_required_minutes || 0;
        if (t.frequency === 'daily') {
            dailyMinutes += mins;
        } else if (t.frequency === 'weekly') {
            weeklyMinutes += mins;
        }
    });

    // Checkins Analytics
    let completedFull = 0;
    let completedMini = 0;
    let skippedTotal = 0;
    const skipReasons = {
        no_time: 0,
        too_hard: 0,
        unclear: 0,
        no_mood: 0,
        other: 0,
    };

    const taskStatsMap = new Map<string, { total: number; completed: number; full: number; mini: number; skipped: number }>();

    checkins.forEach(c => {
        const stat = taskStatsMap.get(c.task_id) || { total: 0, completed: 0, full: 0, mini: 0, skipped: 0 };
        stat.total += 1;

        if (c.completed) {
            if (c.completed_mode === 'mini') {
                completedMini += 1;
                stat.mini += 1;
            } else {
                completedFull += 1;
                stat.full += 1;
            }
            stat.completed += 1;
        } else {
            skippedTotal += 1;
            stat.skipped += 1;
            if (c.skip_reason === 'no_time') skipReasons.no_time += 1;
            else if (c.skip_reason === 'too_hard') skipReasons.too_hard += 1;
            else if (c.skip_reason === 'unclear') skipReasons.unclear += 1;
            else if (c.skip_reason === 'no_mood') skipReasons.no_mood += 1;
            else if (c.skip_reason) skipReasons.other += 1;
        }

        taskStatsMap.set(c.task_id, stat);
    });

    const completedTotal = completedFull + completedMini;
    const overallAdherenceRate = checkins.length > 0
        ? Math.round((completedTotal / checkins.length) * 100)
        : 0;

    const perTaskStats = tasks.map(t => {
        const stat = taskStatsMap.get(t.id) || { total: 0, completed: 0, full: 0, mini: 0, skipped: 0 };
        const rate = stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0;
        return {
            taskId: t.id,
            description: t.task_description,
            frequency: t.frequency,
            total: stat.total,
            completed: stat.completed,
            full: stat.full,
            mini: stat.mini,
            skipped: stat.skipped,
            adherenceRate: rate,
        };
    });

    // Daily Logs Analytics
    const scores = dailyLogs
        .map(l => l.ai_score)
        .filter((s): s is number => typeof s === 'number' && !isNaN(s));

    const totalLogs = dailyLogs.length;
    const averageScore = scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;
    const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;

    // Focus sessions
    const answeredCount = dailyFocusAnswers.filter(a => !!a.answer && a.answer.trim().length > 0).length;
    const pendingCount = dailyFocusAnswers.length - answeredCount;

    // Weekly Reviews
    const positivePatterns: string[] = [];
    const warningPatterns: string[] = [];

    weeklyReviews.forEach(r => {
        if (Array.isArray(r.patterns)) {
            r.patterns.forEach((p: any) => {
                const text = typeof p === 'string' ? p : p?.pattern;
                const type = p?.type || 'positive';
                if (text) {
                    if (type === 'warning') warningPatterns.push(text);
                    else positivePatterns.push(text);
                }
            });
        }
    });

    return {
        timeline: {
            startDate: new Date(goal.created_at).toISOString().split('T')[0],
            targetDate: goal.estimated_completion_date || null,
            totalDays,
            daysElapsed,
            daysRemaining,
            timeProgressPercent,
            paceStatus,
            pointsVelocityActual,
            pointsVelocityRequired,
        },
        points: {
            current: currentPoints,
            target: targetPoints,
            progressPercent: pointsProgressPercent,
            isCompleted,
        },
        tasksSummary: {
            totalTasks: tasks.length,
            mainTasksCount: mainTasks.length,
            subtasksCount: subTasks.length,
            dailyMinutesCommitment: dailyMinutes,
            weeklyMinutesCommitment: weeklyMinutes,
        },
        checkinsSummary: {
            totalCheckins: checkins.length,
            completedTotal,
            completedFull,
            completedMini,
            skippedTotal,
            overallAdherenceRate,
            skipReasons,
            perTaskStats,
        },
        logsSummary: {
            totalLogs,
            averageScore,
            highestScore,
            lowestScore,
        },
        focusSummary: {
            totalQuestions: dailyFocusAnswers.length,
            answeredCount,
            pendingCount,
        },
        reviewsSummary: {
            totalReviews: weeklyReviews.length,
            positivePatterns: Array.from(new Set(positivePatterns)),
            warningPatterns: Array.from(new Set(warningPatterns)),
        },
    };
}
