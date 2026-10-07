'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Sparkles, Target, Layers, ListChecks } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PANEL_SURFACE } from "@/lib/surfaces";
import { MatrixOrb } from '@/components/ui/matrix-orb';

interface GoalGeneratingStepProps {
    initialGoalText: string;
    isArabic: boolean;
    goalSummaryText?: string | null;
}

export default function GoalGeneratingStep({
    initialGoalText,
    isArabic,
    goalSummaryText,
}: GoalGeneratingStepProps) {
    const [activeStage, setActiveStage] = useState(1);

    useEffect(() => {
        const timer1 = setTimeout(() => setActiveStage(2), 2200);
        const timer2 = setTimeout(() => setActiveStage(3), 4800);
        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
        };
    }, []);

    const stages = [
        {
            num: 1,
            icon: Target,
            titleAr: 'تحليل استراتيجية الهدف والجدول الزمني',
            titleEn: 'Analyzing Goal Strategy & Timeline',
            descAr: 'تحديد المدة الواقعية ومؤشر النجاح الأساسي',
            descEn: 'Setting realistic timeline & primary metric',
        },
        {
            num: 2,
            icon: Layers,
            titleAr: 'هندسة معالم ومراحل الطريق',
            titleEn: 'Engineering Roadmap Milestones',
            descAr: 'تقسيم الرحلة إلى 3 محطات تصاعدية واضحة',
            descEn: 'Structuring 3 progressive milestones',
        },
        {
            num: 3,
            icon: ListChecks,
            titleAr: 'صياغة المهام اليومية ومعايير الإنجاز',
            titleEn: 'Formulating Actionable Tasks & Criteria',
            descAr: 'ضبط معايير التحقق اليومية وأيام الأسبوع',
            descEn: 'Setting completion criteria & weekly schedule',
        },
    ];

    return (
        <div
            className="w-full max-w-2xl mx-auto my-auto animate-in fade-in duration-300 space-y-6"
            dir={isArabic ? 'rtl' : 'ltr'}
        >
            {/* Goal Echo */}
            <div className={cn(PANEL_SURFACE, "rounded-2xl px-5 py-4 border border-border/80 shadow-xs")}>
                <p className="text-xs font-semibold text-muted-foreground mb-1">
                    {isArabic ? 'هدفك المعتمد' : 'Your Goal'}
                </p>
                <p className="text-base font-bold text-foreground leading-snug">
                    {goalSummaryText || initialGoalText}
                </p>
            </div>

            {/* Matrix Orb Center */}
            <div
                className="flex flex-col items-center justify-center py-6"
                role="status"
                aria-label={isArabic ? 'جارٍ توليد الخطة المتسلسلة' : 'Generating plan sequentially'}
            >
                <MatrixOrb
                    state="listening"
                    size={150}
                    color="#0097b2"
                    labels={{
                        thinking: isArabic ? 'جارٍ التوليد المتسلسل للمراحل...' : 'Generating sequential stages...',
                        listening: isArabic ? 'جارٍ صياغة خطتك الذكية وحساب النقاط...' : 'Crafting smart plan & calculating points...',
                        idle: isArabic ? 'جارٍ التجهيز...' : 'Preparing...',
                    }}
                />
            </div>

            {/* Sequential Stepper Progress Card */}
            <div className={cn(PANEL_SURFACE, "rounded-2xl border border-border/80 p-5 space-y-3 shadow-xs")}>
                <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-primary shrink-0" />
                    <p className="text-xs font-bold text-foreground uppercase tracking-wide">
                        {isArabic ? 'مسار الإنتاج المتسلسل للخطة' : 'Sequential Plan Generation Progress'}
                    </p>
                </div>

                <div className="space-y-2.5">
                    {stages.map((stage) => {
                        const isDone = activeStage > stage.num;
                        const isCurrent = activeStage === stage.num;
                        const StageIcon = stage.icon;

                        return (
                            <div
                                key={stage.num}
                                className={cn(
                                    "flex items-center gap-3 p-3 rounded-xl border transition-all duration-300",
                                    isDone
                                        ? "bg-primary/5 border-primary/25 text-foreground"
                                        : isCurrent
                                        ? "bg-primary/10 border-primary/45 shadow-xs text-foreground ring-1 ring-primary/20"
                                        : "bg-muted/20 border-border/40 text-muted-foreground/60"
                                )}
                            >
                                <div
                                    className={cn(
                                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold transition-colors",
                                        isDone
                                            ? "bg-primary text-primary-foreground"
                                            : isCurrent
                                            ? "bg-primary/20 text-primary border border-primary/40"
                                            : "bg-muted border border-border/60 text-muted-foreground"
                                    )}
                                >
                                    {isDone ? (
                                        <CheckCircle2 className="w-4 h-4" />
                                    ) : isCurrent ? (
                                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                    ) : (
                                        <StageIcon className="w-4 h-4" />
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className={cn("text-xs sm:text-sm font-bold truncate", isCurrent ? "text-primary" : "")}>
                                        {isArabic ? stage.titleAr : stage.titleEn}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground truncate">
                                        {isArabic ? stage.descAr : stage.descEn}
                                    </p>
                                </div>

                                {isDone && (
                                    <span className="text-[10.5px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                                        {isArabic ? 'اكتمل ✓' : 'Done ✓'}
                                    </span>
                                )}
                                {isCurrent && (
                                    <span className="text-[10.5px] font-bold text-primary animate-pulse bg-primary/15 px-2 py-0.5 rounded-md">
                                        {isArabic ? 'جارٍ المعالجة...' : 'In Progress...'}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
