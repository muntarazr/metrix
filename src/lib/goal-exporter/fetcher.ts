import type { SupabaseClient } from '@supabase/supabase-js';
import type { FullGoalExportData } from './types.ts';

/**
 * Fetches all data related to a goal from Supabase tables without any limits.
 */
export async function fetchFullGoalExportData(
    supabase: SupabaseClient,
    goalId: string
): Promise<FullGoalExportData> {
    // 1. Fetch Goal
    const { data: goal, error: goalError } = await supabase
        .from('goals')
        .select('*')
        .eq('id', goalId)
        .single();

    if (goalError || !goal) {
        throw new Error(goalError?.message || 'Goal not found');
    }

    // 2. Fetch Tasks (sub_layers)
    const { data: tasks, error: tasksError } = await supabase
        .from('sub_layers')
        .select('*')
        .eq('goal_id', goalId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

    if (tasksError) {
        console.warn('Warning fetching sub_layers for export:', tasksError);
    }

    // 3. Fetch Task Checkins
    const { data: checkins, error: checkinsError } = await supabase
        .from('task_checkins')
        .select('*')
        .eq('goal_id', goalId)
        .order('period_start', { ascending: false })
        .order('created_at', { ascending: false });

    if (checkinsError) {
        console.warn('Warning fetching task_checkins for export:', checkinsError);
    }

    // 4. Fetch All Daily Logs (No limit, all historical entries)
    const { data: dailyLogs, error: logsError } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('goal_id', goalId)
        .order('created_at', { ascending: false });

    if (logsError) {
        console.warn('Warning fetching daily_logs for export:', logsError);
    }

    // 5. Fetch Daily Focus Answers
    const { data: dailyFocusAnswers, error: focusError } = await supabase
        .from('daily_focus_answers')
        .select('*')
        .eq('goal_id', goalId)
        .order('prompt_date', { ascending: false });

    if (focusError) {
        console.warn('Warning fetching daily_focus_answers for export:', focusError);
    }

    // 6. Fetch Weekly Reviews
    const { data: weeklyReviews, error: reviewsError } = await supabase
        .from('weekly_reviews')
        .select('*')
        .eq('goal_id', goalId)
        .order('week_start', { ascending: false });

    if (reviewsError) {
        console.warn('Warning fetching weekly_reviews for export:', reviewsError);
    }

    // 7. Fetch Goal Reminders
    const { data: reminders, error: remindersError } = await supabase
        .from('goal_reminders')
        .select('*')
        .eq('goal_id', goalId)
        .order('created_at', { ascending: true });

    if (remindersError) {
        console.warn('Warning fetching goal_reminders for export:', remindersError);
    }

    // 8. Fetch Challenge Participants
    let challenges: FullGoalExportData['challenges'] = [];
    try {
        const { data: rawParticipants } = await supabase
            .from('challenge_participants')
            .select('id, challenge_id, role, joined_at, challenge_rooms(invite_code, created_at, ended_at)')
            .eq('goal_id', goalId);

        if (rawParticipants && Array.isArray(rawParticipants)) {
            challenges = rawParticipants.map((cp: any) => ({
                id: cp.id,
                challenge_id: cp.challenge_id,
                role: cp.role,
                joined_at: cp.joined_at,
                room: cp.challenge_rooms ? {
                    invite_code: cp.challenge_rooms.invite_code,
                    created_at: cp.challenge_rooms.created_at,
                    ended_at: cp.challenge_rooms.ended_at,
                } : null,
            }));
        }
    } catch {
        // Non-fatal if challenge tables not populated
    }

    return {
        goal,
        tasks: tasks || [],
        checkins: checkins || [],
        dailyLogs: dailyLogs || [],
        dailyFocusAnswers: dailyFocusAnswers || [],
        weeklyReviews: weeklyReviews || [],
        reminders: reminders || [],
        challenges,
    };
}
