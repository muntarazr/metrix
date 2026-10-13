import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/api-auth';
import { GeminiService } from '@/lib/gemini';
import { requireAiQuota, handleAiRouteError } from '@/lib/ai-quota';
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

        const {
            goalTitle,
            aiSummary,
            targetDurationDays,
            previousDurationDays,
            initialPlanDays,
            difficulty,
            targetPoints,
            dailyRate,
            tasks,
            language = 'ar',
        } = body;

        if (!goalTitle || !targetDurationDays || !difficulty || !targetPoints) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        const quotaResponse = await requireAiQuota(auth.supabase, 'gemini', 'ai_edit');
        if (quotaResponse) {
            // If quota limit reached, fallback to local algorithmic rebalancer rather than failing
            const fallbackResult = GeminiService.rebalancePlanLocally({
                goalTitle,
                aiSummary,
                targetDurationDays: Number(targetDurationDays),
                previousDurationDays: Number(previousDurationDays) || Number(targetDurationDays),
                initialPlanDays: Number(initialPlanDays) || undefined,
                difficulty,
                targetPoints: Number(targetPoints),
                tasks: Array.isArray(tasks) ? tasks : [],
                language,
            });
            return NextResponse.json(fallbackResult);
        }

        const result = await GeminiService.rebalancePlan({
            goalTitle,
            aiSummary,
            targetDurationDays: Number(targetDurationDays),
            previousDurationDays: Number(previousDurationDays) || Number(targetDurationDays),
            initialPlanDays: Number(initialPlanDays) || undefined,
            difficulty,
            targetPoints: Number(targetPoints),
            dailyRate: Number(dailyRate) || 100,
            tasks: Array.isArray(tasks) ? tasks : [],
            language,
        });

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("API rebalance error:", error);
        return handleAiRouteError(error, 'Failed to rebalance plan');
    }
}

