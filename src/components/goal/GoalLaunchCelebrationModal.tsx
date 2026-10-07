'use client';

import { Sparkles, Trophy, ArrowLeft, ArrowRight, Zap, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDurationLabel } from './goal-creator-helpers';

interface GoalLaunchCelebrationModalProps {
    open: boolean;
    goalTitle: string;
    totalDays: number;
    targetPoints: number;
    isArabic?: boolean;
    onStartDayOne: () => void;
}

export default function GoalLaunchCelebrationModal({
    open,
    goalTitle,
    totalDays,
    targetPoints,
    isArabic = true,
    onStartDayOne,
}: GoalLaunchCelebrationModalProps) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/85 backdrop-blur-md animate-in fade-in duration-200">
            <div
                className="w-full max-w-md rounded-3xl border border-primary/30 bg-card p-6 sm:p-8 shadow-2xl space-y-6 text-center relative overflow-hidden"
                dir={isArabic ? 'rtl' : 'ltr'}
            >
                {/* Decorative background glow */}
                <div className="absolute -top-12 -start-12 w-36 h-36 rounded-full bg-primary/15 blur-2xl pointer-events-none" />
                <div className="absolute -bottom-12 -end-12 w-36 h-36 rounded-full bg-emerald-500/15 blur-2xl pointer-events-none" />

                {/* Trophy Badge */}
                <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary/20 via-primary/10 to-amber-500/20 border border-primary/30 shadow-lg">
                    <Trophy className="h-10 w-10 text-primary animate-bounce duration-1000" />
                    <div className="absolute -top-1 -end-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-amber-950 font-black text-xs shadow-xs">
                        <Sparkles className="h-3.5 w-3.5" />
                    </div>
                </div>

                {/* Title & Congratulations */}
                <div className="space-y-2">
                    <h3 className="font-extrabold text-xl sm:text-2xl text-foreground tracking-tight leading-snug">
                        {isArabic ? 'تهانينا! بدأت رحلتك نحو إنجاز الهدف' : 'Congratulations! Your Journey Has Begun'}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-medium">
                        {isArabic
                            ? 'تم إعداد خطتك وتجهيز مهام اليوم الأول بدقة. الخطوة الأولى تصنع الفارق دائماً!'
                            : 'Your plan is set and Day 1 tasks are ready. The first step always makes the difference!'}
                    </p>
                </div>

                {/* Goal Info Card */}
                <div className="rounded-2xl border border-border/80 bg-muted/30 p-4 space-y-2.5 text-start">
                    <p className="text-xs text-muted-foreground font-semibold">
                        {isArabic ? 'الهدف المعتمد:' : 'Active Goal:'}
                    </p>
                    <p className="text-sm font-bold text-foreground line-clamp-2">
                        {goalTitle}
                    </p>
                    <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                            <Calendar className="w-3.5 h-3.5 text-primary" />
                            <span className="font-semibold text-foreground">
                                {formatDurationLabel(totalDays, isArabic)}
                            </span>
                        </span>
                        <span className="flex items-center gap-1.5 text-primary font-bold">
                            <Zap className="w-3.5 h-3.5" />
                            <span>+{targetPoints.toLocaleString()} {isArabic ? 'نقطة مستهدفة' : 'target pts'}</span>
                        </span>
                    </div>
                </div>

                {/* Day 1 CTA Button */}
                <button
                    type="button"
                    onClick={onStartDayOne}
                    className="w-full py-3.5 px-6 rounded-2xl bg-foreground text-background font-black text-sm sm:text-base hover:opacity-90 active:scale-[0.98] transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer"
                >
                    <span>{isArabic ? 'هيا نبدأ مهام اليوم' : 'Let’s Start Today’s Tasks'}</span>
                    {isArabic ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </button>
            </div>
        </div>
    );
}
