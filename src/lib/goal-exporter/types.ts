export interface FullGoalExportData {
    goal: {
        id: string;
        user_id: string;
        title: string;
        domain?: string | null;
        ai_summary?: string | null;
        icon?: string | null;
        status: string;
        current_points: number;
        target_points: number;
        total_days?: number | null;
        estimated_completion_date?: string | null;
        is_pinned: boolean;
        created_at: string;
        streak_freezes?: Array<{ date: string; used_at: string }> | null;
    };
    tasks: Array<{
        id: string;
        goal_id: string;
        parent_task_id?: string | null;
        task_description: string;
        task_type: 'main' | 'sub';
        frequency: 'daily' | 'weekly';
        schedule_days?: number[] | null;
        impact_weight?: number | null;
        completion_criteria?: string | null;
        time_required_minutes?: number | null;
        sort_order: number;
        icon?: string | null;
        accent_color?: string | null;
        is_pinned?: boolean;
        mini_version?: string | null;
        created_at: string;
    }>;
    checkins: Array<{
        id: string;
        goal_id: string;
        task_id: string;
        period_type: 'daily' | 'weekly';
        period_start: string;
        completed: boolean;
        completed_at?: string | null;
        skip_reason?: 'no_time' | 'too_hard' | 'unclear' | 'no_mood' | string | null;
        completed_mode?: 'full' | 'mini' | string | null;
        created_at: string;
    }>;
    dailyLogs: Array<{
        id: string;
        goal_id: string;
        user_input?: string | null;
        ai_score?: number | null;
        ai_feedback?: string | null;
        coaching_message?: string | null;
        breakdown?: any;
        created_at: string;
    }>;
    dailyFocusAnswers: Array<{
        id: string;
        goal_id: string;
        user_id: string;
        prompt_date: string;
        angle_label?: string | null;
        question: string;
        question_why?: string | null;
        answer?: string | null;
        answer_coaching?: string | null;
        suggestions?: any;
        answered_at?: string | null;
        created_at: string;
        updated_at?: string;
    }>;
    weeklyReviews: Array<{
        id: string;
        goal_id: string;
        user_id: string;
        week_start: string;
        summary: string;
        patterns?: any;
        suggestion: string;
        stats?: any;
        created_at: string;
    }>;
    reminders: Array<{
        id: string;
        user_id: string;
        goal_id: string;
        reminder_time: string;
        reminder_count: number;
        enabled: boolean;
        timezone?: string | null;
        created_at: string;
    }>;
    challenges: Array<{
        id: string;
        challenge_id: string;
        role: string;
        joined_at: string;
        room?: {
            invite_code?: string;
            created_at?: string;
            ended_at?: string | null;
        } | null;
    }>;
}

export interface GoalExportAnalytics {
    timeline: {
        startDate: string;
        targetDate: string | null;
        totalDays: number;
        daysElapsed: number;
        daysRemaining: number;
        timeProgressPercent: number;
        paceStatus: 'ahead' | 'on_track' | 'behind' | 'stalled' | 'completed';
        pointsVelocityActual: number;
        pointsVelocityRequired: number;
    };
    points: {
        current: number;
        target: number;
        progressPercent: number;
        isCompleted: boolean;
    };
    tasksSummary: {
        totalTasks: number;
        mainTasksCount: number;
        subtasksCount: number;
        dailyMinutesCommitment: number;
        weeklyMinutesCommitment: number;
    };
    checkinsSummary: {
        totalCheckins: number;
        completedTotal: number;
        completedFull: number;
        completedMini: number;
        skippedTotal: number;
        overallAdherenceRate: number;
        skipReasons: {
            no_time: number;
            too_hard: number;
            unclear: number;
            no_mood: number;
            other: number;
        };
        perTaskStats: Array<{
            taskId: string;
            description: string;
            frequency: string;
            total: number;
            completed: number;
            full: number;
            mini: number;
            skipped: number;
            adherenceRate: number;
        }>;
    };
    logsSummary: {
        totalLogs: number;
        averageScore: number;
        highestScore: number;
        lowestScore: number;
    };
    focusSummary: {
        totalQuestions: number;
        answeredCount: number;
        pendingCount: number;
    };
    reviewsSummary: {
        totalReviews: number;
        positivePatterns: string[];
        warningPatterns: string[];
    };
}
