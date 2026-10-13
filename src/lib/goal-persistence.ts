import { createClient } from '@/utils/supabase/client';

export interface PersistGoalTaskInput {
    id?: string;
    task_description?: string;
    task?: string;
    frequency?: 'daily' | 'weekly' | string;
    schedule_days?: number[] | null;
    impact_weight?: number;
    completion_criteria?: string;
    time_required_minutes?: number;
    task_type?: string;
    parent_task_id?: string | null;
    sort_order?: number;
    included?: boolean;
}

export interface PersistGoalInput {
    supabaseClient?: any;
    userId: string;
    title: string;
    domain?: string;
    targetPoints: number;
    totalDays: number;
    estimatedCompletionDate?: string;
    aiSummary?: string;
    icon?: string;
    status?: string;
    tasks: PersistGoalTaskInput[];
}

export interface PersistGoalResult {
    goal: any;
    tasksCount: number;
}

/**
 * Persists a goal and its child task tree (sub_layers) with rollback on failure.
 *
 * 1. Inserts the goal into `goals` table.
 * 2. Maps task rows into `sub_layers` table schema.
 * 3. Attempts insert; retries without `schedule_days` column if DB column is missing.
 * 4. Rolls back (deletes) the inserted goal if task insertion fails, preventing orphaned goals.
 */
export async function persistGoalWithTaskTree(input: PersistGoalInput): Promise<PersistGoalResult> {
    const {
        supabaseClient,
        userId,
        title,
        domain = 'other',
        targetPoints,
        totalDays,
        estimatedCompletionDate,
        aiSummary = '',
        icon,
        status = 'active',
        tasks,
    } = input;

    const client = supabaseClient || createClient();

    const adjustedCompletionDate =
        estimatedCompletionDate ||
        new Date(Date.now() + totalDays * 24 * 60 * 60 * 1000).toISOString();

    const goalPayload: Record<string, any> = {
        user_id: userId,
        title,
        domain: domain || 'other',
        target_points: targetPoints,
        current_points: 0,
        estimated_completion_date: adjustedCompletionDate,
        total_days: totalDays,
        ai_summary: aiSummary,
        status,
    };

    if (icon !== undefined) {
        goalPayload.icon = icon;
    }

    // 1. Insert Goal
    const { data: goalData, error: goalError } = await client
        .from('goals')
        .insert(goalPayload)
        .select()
        .single();

    if (goalError || !goalData) {
        console.error('Goal insert failed:', JSON.stringify(goalError), goalError);
        throw new Error(goalError?.message || goalError?.details || 'فشل إدراج الهدف في قاعدة البيانات');
    }

    // 2. Insert Tasks
    const subRows = tasks.map((task, index) => {
        const desc = (task.task_description ?? task.task ?? '').trim() || `Task ${index + 1}`;
        return {
            goal_id: goalData.id,
            task_description: desc,
            frequency: task.frequency === 'weekly' ? 'weekly' : 'daily',
            schedule_days: task.schedule_days && task.schedule_days.length > 0 ? task.schedule_days : null,
            impact_weight: Math.max(1, Math.min(5, Number(task.impact_weight) || 1)),
            completion_criteria: (task.completion_criteria || '').trim(),
            time_required_minutes: Math.max(5, Number(task.time_required_minutes) || 20),
            task_type: task.task_type || 'main',
            parent_task_id: task.parent_task_id ?? null,
            sort_order: task.sort_order ?? index,
        };
    });

    if (subRows.length > 0) {
        try {
            let { error: subError } = await client.from('sub_layers').insert(subRows);

            if (subError && (subError.message || '').includes('schedule_days')) {
                const fallbackRows = subRows.map((row: any) => {
                    const { schedule_days, ...rest } = row;
                    return rest;
                });
                ({ error: subError } = await client.from('sub_layers').insert(fallbackRows));
            }

            if (subError) {
                console.error('Sub_layers insert failed:', JSON.stringify(subError), subError);
                throw new Error(subError.message || subError.details || 'فشل إدراج المهام في قاعدة البيانات');
            }
        } catch (err: unknown) {
            // Rollback inserted goal to avoid leaving an orphaned empty goal
            try {
                await client.from('goals').delete().eq('id', goalData.id);
            } catch (rollbackErr) {
                console.error('Failed to rollback goal after error:', rollbackErr);
            }
            throw err;
        }
    }

    return {
        goal: goalData,
        tasksCount: subRows.length,
    };
}
