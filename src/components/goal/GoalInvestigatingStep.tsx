'use client';

import { AlertTriangle, ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PANEL_SURFACE } from "@/lib/surfaces";
import { MatrixOrb } from '@/components/ui/matrix-orb';

interface GoalInvestigatingStepProps {
    initialGoalText: string;
    isArabic: boolean;
    refusedMessage?: string | null;
    onCancel: () => void;
}

export default function GoalInvestigatingStep({
    initialGoalText,
    isArabic,
    refusedMessage,
    onCancel,
}: GoalInvestigatingStepProps) {
    if (refusedMessage) {
        return (
            <div
                className="w-full max-w-2xl mx-auto my-auto animate-in fade-in duration-300"
                dir={isArabic ? 'rtl' : 'ltr'}
            >
                <div className={cn(PANEL_SURFACE, "rounded-2xl px-5 py-4 mb-6")}>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                        {isArabic ? 'هدفك' : 'Your goal'}
                    </p>
                    <p className="text-base font-semibold text-foreground leading-snug">
                        {initialGoalText}
                    </p>
                </div>

                <div className="rounded-2xl border border-destructive/25 bg-destructive/12 px-6 py-8 flex flex-col items-center gap-4 text-center">
                    <div className="w-14 h-14 rounded-full bg-destructive/12 flex items-center justify-center">
                        <AlertTriangle className="w-7 h-7 text-destructive" />
                    </div>
                    <div className="space-y-2">
                        <p className="font-semibold text-foreground text-lg">
                            {isArabic ? 'تعذّر إنشاء الهدف' : 'Goal could not be created'}
                        </p>
                        <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
                            {refusedMessage}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border/80 bg-card hover:bg-muted text-sm font-semibold text-foreground transition-all cursor-pointer shadow-xs active:scale-95"
                    >
                        {isArabic ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                        <span>{isArabic ? 'الرجوع وتعديل الهدف' : 'Back & edit goal'}</span>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            className="w-full max-w-2xl mx-auto my-auto animate-in fade-in duration-300"
            dir={isArabic ? 'rtl' : 'ltr'}
        >
            <div className={cn(PANEL_SURFACE, "rounded-2xl px-5 py-4 mb-6")}>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                    {isArabic ? 'هدفك' : 'Your goal'}
                </p>
                <p className="text-base font-semibold text-foreground leading-snug">
                    {initialGoalText}
                </p>
            </div>

            <div
                className="flex flex-col items-center justify-center py-16"
                role="status"
                aria-label={isArabic ? 'جارٍ التحليل' : 'Analyzing'}
            >
                <MatrixOrb
                    state="thinking"
                    size={160}
                    color="#0097b2"
                    labels={{
                        thinking: isArabic ? 'جارٍ دراسة أركان هدفك وتجهيز الأسئلة الذكية...' : 'Analyzing goal pillars & preparing smart questions...',
                        listening: isArabic ? 'جارٍ تحليل إمكانياتك وأدواتك...' : 'Analyzing your tools & abilities...',
                        idle: isArabic ? 'جارٍ التحليل...' : 'Analyzing...',
                    }}
                />

                <p className="text-xs text-muted-foreground/80 mt-6 animate-pulse">
                    {isArabic ? 'يتم فحص طبيعة الهدف لمعرفة نوعية المهام الأنسب لك...' : 'Checking goal nature to identify optimal tasks...'}
                </p>

                <button
                    type="button"
                    onClick={onCancel}
                    className="mt-6 px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                    {isArabic ? 'إلغاء والعودة' : 'Cancel & return'}
                </button>
            </div>
        </div>
    );
}
