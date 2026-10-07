import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/api-auth';
import { GeminiQuotaError } from '@/lib/gemini';
import { PlanArchitectService } from '@/lib/plan-architect.service';
import { requireAiQuota } from '@/lib/ai-quota';
import { rejectIfContentLengthTooLarge, rejectIfJsonBodyTooLarge } from '@/lib/request-limits';

export async function POST(req: NextRequest) {
    try {
        const auth = await requireUser(req);
        if (auth.error) return auth.error;

        const sizeGuard = rejectIfContentLengthTooLarge(req);
        if (sizeGuard) return sizeGuard;

        const body = await req.json();
        const bodyGuard = rejectIfJsonBodyTooLarge(body);
        if (bodyGuard) return bodyGuard;

        const { goalTitle, currentTask, reason, userNote, allTasks } = body;
        if (!currentTask || !currentTask.task) {
            return NextResponse.json({ error: 'Missing currentTask' }, { status: 400 });
        }

        const quotaResponse = await requireAiQuota(auth.supabase, 'gemini', 'ai_edit');
        if (quotaResponse) return quotaResponse;

        const rawAllTasks = Array.isArray(allTasks) && allTasks.length > 0
            ? allTasks
            : [currentTask];

        const rebalanceResult = await PlanArchitectService.rebalanceAllTasksWithGoal({
            goalTitle: String(goalTitle || ''),
            allCurrentTasks: rawAllTasks,
            modifiedTaskId: currentTask.id,
            userInstruction: `${reason || ''} ${userNote || ''}`.trim(),
        });

        const modifiedSingleTask = rebalanceResult.tasks.find(t => t.id === currentTask.id) || rebalanceResult.tasks[0];

        return NextResponse.json({
            task: modifiedSingleTask?.task || currentTask.task,
            completion_criteria: modifiedSingleTask?.completion_criteria || currentTask.completion_criteria,
            time_required_minutes: modifiedSingleTask?.time_required_minutes || currentTask.time_required_minutes,
            frequency: modifiedSingleTask?.frequency || currentTask.frequency,
            impact_weight: modifiedSingleTask?.impact_weight || currentTask.impact_weight,
            tasks: rebalanceResult.tasks,
            explanation: rebalanceResult.explanation,
            feasibility_verified: rebalanceResult.feasibility_verified,
        });
    } catch (error: any) {
        console.error("API replace-task error:", error);
        if (error instanceof GeminiQuotaError) {
            return NextResponse.json({
                error: 'quota_exceeded',
                message_ar: `تم تجاوز حد الاستخدام اليومي. حاول مرة أخرى بعد ${Math.ceil(error.retryAfterSeconds / 60)} دقيقة.`,
                message_en: `Daily usage limit exceeded. Please try again in ${Math.ceil(error.retryAfterSeconds / 60)} minute(s).`,
                retryAfterSeconds: error.retryAfterSeconds,
            }, { status: 429 });
        }
        return NextResponse.json({
            error: 'Failed to replace task with AI',
            ...(process.env.NODE_ENV !== 'production'
                ? { detail: error instanceof Error ? error.message : String(error) }
                : {}),
        }, { status: 500 });
    }
}
