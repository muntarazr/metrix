'use client';

import React from 'react';
import { CalendarDays, Clock, Zap, ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PANEL_SURFACE } from '@/lib/surfaces';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { DifficultyLevel } from '../goal-creator-types';
import { DURATION_PRESETS, SIMPLE_DIFFICULTIES } from './manual-goal-types';

export interface ManualDurationStepProps {
    totalDays: number;
    onTotalDaysChange: (days: number) => void;
    difficulty: DifficultyLevel;
    onDifficultyChange: (diff: DifficultyLevel) => void;
    isCustomPoints: boolean;
    onToggleCustomPoints: () => void;
    customPoints: number;
    onCustomPointsChange: (pts: number) => void;
    targetPoints: number;
    targetDateFormatted: string;
    onPrev: () => void;
    onNext: () => void;
    isArabic: boolean;
}

export default function ManualDurationStep({
    totalDays,
    onTotalDaysChange,
    difficulty,
    onDifficultyChange,
    isCustomPoints,
    onToggleCustomPoints,
    customPoints,
    onCustomPointsChange,
    targetPoints,
    targetDateFormatted,
    onPrev,
    onNext,
    isArabic,
}: ManualDurationStepProps) {
    return (
        <div className="space-y-4 animate-in fade-in duration-200">
            <div className="space-y-1">
                <h2 className="text-lg sm:text-xl font-black text-foreground">
                    {isArabic ? 'كم المدة ومستوى التحدي المطلوب؟' : 'Duration & Challenge Level'}
                </h2>
                <p className="text-xs text-muted-foreground">
                    {isArabic ? 'حدد إجمالي الأيام ونقاط الهدف التي تسعى لتحقيقها.' : 'Set the duration in days and the commitment points.'}
                </p>
            </div>

            <div className={cn(PANEL_SURFACE, "rounded-2xl border border-border/70 p-4 sm:p-5 space-y-4 shadow-xs")}>
                {/* Duration Presets & Input */}
                <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <CalendarDays className="w-3.5 h-3.5 text-primary" />
                            <span>{isArabic ? 'المدة الزمنية (بالأيام)' : 'Duration (Days)'}</span>
                        </label>
                        <div className="flex items-center gap-1 bg-muted/60 border border-border/80 px-2.5 py-0.5 rounded-lg">
                            <input
                                type="number"
                                min={7}
                                max={365}
                                value={totalDays}
                                onChange={(e) => onTotalDaysChange(Math.max(7, Math.min(365, Number(e.target.value) || 7)))}
                                className="w-12 text-center bg-transparent border-none outline-hidden font-bold text-base sm:text-sm text-foreground"
                            />
                            <span className="text-[11px] text-muted-foreground font-semibold">{isArabic ? 'يوم' : 'd'}</span>
                        </div>
                    </div>

                    {/* Preset Buttons */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {DURATION_PRESETS.map((p) => {
                            const isSelected = totalDays === p.days;
                            return (
                                <button
                                    key={p.days}
                                    type="button"
                                    onClick={() => onTotalDaysChange(p.days)}
                                    className={cn(
                                        "p-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer active:scale-95",
                                        isSelected
                                            ? "bg-primary text-primary-foreground border-primary shadow-2xs font-extrabold"
                                            : "bg-muted/40 hover:bg-muted border-border/70 text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {isArabic ? p.labelAr : p.labelEn}
                                </button>
                            );
                        })}
                    </div>

                    {/* Slider */}
                    <div className="pt-1">
                        <Slider
                            value={[totalDays]}
                            min={7}
                            max={365}
                            step={1}
                            onValueChange={(val) => onTotalDaysChange(val[0])}
                            className="py-1"
                        />
                    </div>

                    {/* Target Date Pill */}
                    <div className="p-2.5 rounded-xl bg-muted/30 border border-border/60 text-xs text-muted-foreground flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                        <div>
                            <span className="font-semibold text-foreground">{isArabic ? 'تاريخ الانتهاء: ' : 'Ends on: '}</span>
                            <span className="font-bold text-foreground">{targetDateFormatted}</span>
                        </div>
                    </div>
                </div>

                <hr className="border-border/50" />

                {/* Difficulty / Points Rate */}
                <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5 text-amber-500" />
                            <span>{isArabic ? 'مستوى الالتزام والصعوبة' : 'Commitment Level'}</span>
                        </label>

                        <button
                            type="button"
                            onClick={onToggleCustomPoints}
                            className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
                        >
                            {isCustomPoints
                                ? (isArabic ? 'العودة للخيارات التلقائية' : 'Auto Rates')
                                : (isArabic ? 'تحديد نقاط مخصصة؟' : 'Custom Points?')}
                        </button>
                    </div>

                    {!isCustomPoints ? (
                        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                            {SIMPLE_DIFFICULTIES.map((diff) => {
                                const isSelected = difficulty === diff.key;
                                return (
                                    <button
                                        key={diff.key}
                                        type="button"
                                        onClick={() => onDifficultyChange(diff.key)}
                                        className={cn(
                                            "p-2 sm:p-2.5 rounded-xl border text-center transition-all cursor-pointer active:scale-95 flex flex-col items-center justify-center gap-0.5",
                                            isSelected
                                                ? `${diff.activeBorder} shadow-2xs font-extrabold ring-1 ring-primary/30`
                                                : "bg-muted/30 border-border/70 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                                        )}
                                    >
                                        <span className={cn("text-xs font-bold", isSelected ? "text-foreground" : "")}>
                                            {isArabic ? diff.labelAr : diff.labelEn}
                                        </span>
                                        <span className="text-[10px] opacity-75">
                                            {diff.rate} {isArabic ? 'نقطة / يوم' : 'pts / day'}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 p-3 rounded-xl bg-muted/40 border border-border/70">
                            <span className="text-xs font-bold text-foreground">
                                {isArabic ? 'النقاط المستهدفة الإجمالية:' : 'Total Target Points:'}
                            </span>
                            <Input
                                type="number"
                                min={1}
                                step={10}
                                value={customPoints}
                                onChange={(e) => onCustomPointsChange(Math.max(1, Number(e.target.value) || 1))}
                                className="h-9 w-28 sm:w-32 rounded-lg font-bold text-center text-base sm:text-sm"
                            />
                        </div>
                    )}

                    {/* Total Points Display Card */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-primary/10 border border-primary/25">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
                                <Zap className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-xs font-bold text-foreground">
                                {isArabic ? 'إجمالي نقاط الهدف:' : 'Total Target Points:'}
                            </span>
                        </div>
                        <span className="text-base font-black text-primary tabular-nums">
                            {targetPoints.toLocaleString()} {isArabic ? 'نقطة' : 'pts'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Step 2 Actions */}
            <div className="pt-2 flex items-center justify-between gap-3">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onPrev}
                    className="h-11 px-5 rounded-xl font-bold"
                >
                    {isArabic ? 'السابق' : 'Back'}
                </Button>

                <Button
                    type="button"
                    onClick={onNext}
                    className="h-11 px-4 sm:px-6 rounded-xl font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                >
                    <span>
                        <span className="hidden sm:inline">{isArabic ? 'التالي: تحديد المهام وشروطها' : 'Next: Tasks & Criteria'}</span>
                        <span className="sm:hidden">{isArabic ? 'التالي: المهام' : 'Next: Tasks'}</span>
                    </span>
                    {isArabic ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </Button>
            </div>
        </div>
    );
}
