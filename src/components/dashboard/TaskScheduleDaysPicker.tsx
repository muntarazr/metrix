'use client';

import { useState } from 'react';
import { CalendarDays, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WEEK_DAYS } from '@/components/goal/goal-creator-types';

interface TaskScheduleDaysPickerProps {
    taskId: string;
    scheduleDays?: number[] | null;
    isArabic?: boolean;
    onUpdateScheduleDays: (taskId: string, days: number[] | null) => Promise<void> | void;
}

export default function TaskScheduleDaysPicker({
    taskId,
    scheduleDays,
    isArabic = true,
    onUpdateScheduleDays,
}: TaskScheduleDaysPickerProps) {
    const [savingDay, setSavingDay] = useState<number | null>(null);

    const allIndices = WEEK_DAYS.map(w => w.idx);
    const activeDays = (scheduleDays && scheduleDays.length > 0)
        ? scheduleDays
        : allIndices;

    const handleToggleDay = async (dayIdx: number) => {
        setSavingDay(dayIdx);
        let nextDays: number[];

        if (activeDays.includes(dayIdx)) {
            // If it's the last selected day, don't allow empty, or allow null
            nextDays = activeDays.filter(i => i !== dayIdx);
        } else {
            nextDays = [...activeDays, dayIdx];
        }

        const finalDays = nextDays.length === 7 ? null : nextDays.sort((a, b) => a - b);
        await onUpdateScheduleDays(taskId, finalDays);

        setTimeout(() => {
            setSavingDay(null);
        }, 400);
    };

    return (
        <div className="p-2 space-y-2" dir={isArabic ? 'rtl' : 'ltr'}>
            <div className="flex items-center justify-between gap-2 px-1">
                <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <CalendarDays className="w-3.5 h-3.5 text-primary" />
                    <span>{isArabic ? 'أيام التكرار' : 'Repeat Days'}</span>
                </span>
                <span className="text-[10px] text-muted-foreground font-medium">
                    {!scheduleDays || scheduleDays.length === 0 || scheduleDays.length === 7
                        ? (isArabic ? 'كل الأيام' : 'All days')
                        : (isArabic ? `${scheduleDays.length} أيام محددة` : `${scheduleDays.length} days selected`)}
                </span>
            </div>

            <div className="flex items-center gap-1.5 justify-between">
                {WEEK_DAYS.map((d) => {
                    const isSelected = activeDays.includes(d.idx);
                    const isSaving = savingDay === d.idx;

                    return (
                        <button
                            key={d.idx}
                            type="button"
                            onClick={() => handleToggleDay(d.idx)}
                            title={isArabic ? `ال${d.ar}` : d.en}
                            className={cn(
                                "w-7 h-7 rounded-lg border text-xs font-bold flex items-center justify-center transition-all duration-150 cursor-pointer select-none active:scale-95 relative",
                                isSelected
                                    ? "bg-primary text-primary-foreground border-primary shadow-xs ring-1 ring-primary/30 font-black"
                                    : "bg-muted/40 border-border/80 text-muted-foreground/60 hover:text-foreground hover:border-primary/40",
                                isSaving && "animate-pulse ring-2 ring-primary"
                            )}
                        >
                            <span>{isArabic ? d.letterAr : d.letterEn}</span>
                            {isSaving && (
                                <span className="absolute -top-1 -end-1 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-white dark:ring-black" />
                            )}
                        </button>
                    );
                })}
            </div>

            <p className="text-[10.5px] text-muted-foreground px-1 leading-tight">
                {isArabic
                    ? 'انقر على حرف اليوم لتفعيله أو إلغائه (يتم الحفظ تلقائياً فوراً).'
                    : 'Click a day letter to toggle it (saves automatically).'}
            </p>
        </div>
    );
}
