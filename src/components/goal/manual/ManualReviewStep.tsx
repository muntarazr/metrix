'use client';

import React from 'react';
import { Loader2, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDurationLabel } from '../goal-creator-helpers';

export interface ManualReviewStepProps {
    goalTitle: string;
    targetPoints: number;
    totalDays: number;
    tasksCount: number;
    saving: boolean;
    onPrev: () => void;
    onLaunch: () => void;
    isArabic: boolean;
}

export default function ManualReviewStep({
    goalTitle,
    targetPoints,
    totalDays,
    tasksCount,
    saving,
    onPrev,
    onLaunch,
    isArabic,
}: ManualReviewStepProps) {
    return (
        <div className="space-y-4 pt-1">
            {/* Step 3 Summary Box */}
            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/70 space-y-1 text-xs">
                <div className="font-bold text-foreground flex items-center justify-between gap-2">
                    <span className="min-w-0 flex-1 truncate">{goalTitle || (isArabic ? 'هدف جديد' : 'New Goal')}</span>
                    <span className="text-primary font-black shrink-0 tabular-nums">{targetPoints.toLocaleString()} {isArabic ? 'نقطة' : 'pts'}</span>
                </div>
                <div className="text-muted-foreground text-[11px] flex items-center gap-2">
                    <span>{formatDurationLabel(totalDays, isArabic)}</span>
                    <span>·</span>
                    <span>{tasksCount} {isArabic ? 'مهام محددة' : 'tasks'}</span>
                </div>
            </div>

            {/* Step 3 Actions */}
            <div className="pt-2 flex items-center justify-between gap-3">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onPrev}
                    disabled={saving}
                    className="h-11 px-5 rounded-xl font-bold"
                >
                    {isArabic ? 'السابق' : 'Back'}
                </Button>

                <Button
                    type="button"
                    onClick={onLaunch}
                    disabled={saving}
                    className="h-11 px-4 sm:px-7 flex-1 sm:flex-initial rounded-xl font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 active:scale-95 transition-all"
                >
                    {saving ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>{isArabic ? 'جارٍ الحفظ والإطلاق...' : 'Launching...'}</span>
                        </>
                    ) : (
                        <>
                            <Rocket className="w-4 h-4" />
                            <span>{isArabic ? 'إطلاق الهدف والبدء' : 'Launch Goal & Start'}</span>
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
