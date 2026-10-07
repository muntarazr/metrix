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

        const { goal, answers, structured_input } = body;
        const targetDeadline = body.targetDeadline || body.target_deadline || undefined;
        const quotaResponse = await requireAiQuota(auth.supabase, 'gemini', 'plan');
        if (quotaResponse) return quotaResponse;

        const result = await PlanArchitectService.createSequentialPlan(goal, answers, targetDeadline, structured_input);
        return NextResponse.json(result);
    } catch (error: any) {
        console.error("API plan error:", error);
        if (error instanceof GeminiQuotaError) {
            return NextResponse.json({
                error: 'quota_exceeded',
                message_ar: `تم تجاوز حد الاستخدام اليومي. حاول مرة أخرى بعد ${Math.ceil(error.retryAfterSeconds / 60)} دقيقة.`,
                message_en: `Daily usage limit exceeded. Please try again in ${Math.ceil(error.retryAfterSeconds / 60)} minute(s).`,
                retryAfterSeconds: error.retryAfterSeconds
            }, { status: 429 });
        }
        return NextResponse.json({ error: error?.message || 'Failed to create plan' }, { status: 500 });
    }
}
