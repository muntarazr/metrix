'use client';

import { cn } from '@/lib/utils';
import type { WeekdayChipsProps } from './answer-types';
import {
    WEEK_DAYS,
    normalizeWeekDays,
    formatWeekdaysLabel,
} from './answer-helpers';

export function WeekdayChips({
    value,
    onChange,
    language = 'ar',
    size = 'md',
    showSummary = true,
    disabled,
}: WeekdayChipsProps) {
    const isAr = language === 'ar';
    const selected = normalizeWeekDays(value);

    const toggle = (idx: number) => {
        if (disabled) return;
        const all = WEEK_DAYS.map(d => d.idx);
        const current = selected ?? all;
        const next = current.includes(idx) ? current.filter(i => i !== idx) : [...current, idx];
        onChange(normalizeWeekDays(next));
    };

    const sizeClasses = size === 'sm'
        ? 'w-6 h-6 text-[10px]'
        : 'w-6 h-6 sm:w-8 sm:h-8 text-[10px] sm:text-xs';

    return (
        <div className="flex flex-wrap items-center gap-1.5">
            {WEEK_DAYS.map((d) => {
                const active = selected ? selected.includes(d.idx) : true;
                return (
                    <button
                        key={d.idx}
                        type="button"
                        onClick={() => toggle(d.idx)}
                        disabled={disabled}
                        title={isAr ? `ال${d.ar}` : d.en}
                        className={cn(
                            sizeClasses,
                            'rounded-md border font-bold flex items-center justify-center transition-all duration-150 select-none cursor-pointer motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50',
                            active
                                ? 'bg-primary/15 border-primary/45 text-primary'
                                : 'bg-muted/40 border-border/60 text-muted-foreground/50 hover:border-primary/30',
                        )}
                    >
                        {isAr ? d.letterAr : d.letterEn}
                    </button>
                );
            })}
            {showSummary && (
                <span className="text-[10px] text-muted-foreground/50 ms-0.5">
                    {formatWeekdaysLabel(selected, language)}
                </span>
            )}
        </div>
    );
}
