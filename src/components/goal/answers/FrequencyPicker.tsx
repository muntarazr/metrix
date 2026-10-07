'use client';

import { cn } from '@/lib/utils';
import type { FrequencyPickerProps } from './answer-types';
import { WeekdayChips } from './WeekdayChips';

function CompactStepper({
    value,
    min,
    max,
    onChange,
    ariaLabel,
    disabled,
}: {
    value: number;
    min: number;
    max: number;
    onChange: (value: number) => void;
    ariaLabel: string;
    disabled?: boolean;
}) {
    const clamp = (n: number) => Math.min(max, Math.max(min, n));
    const smallButton = 'w-8 h-8 rounded-xl border border-border bg-muted/60 flex items-center justify-center text-base font-bold hover:bg-muted transition-colors duration-150 cursor-pointer select-none active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed motion-reduce:transition-none motion-reduce:active:scale-100';
    return (
        <div className="flex items-center gap-2">
            <button
                type="button"
                onClick={() => onChange(clamp(value - 1))}
                disabled={disabled || value <= min}
                className={smallButton}
                aria-label={`Decrease ${ariaLabel}`}
            >
                −
            </button>
            <input
                type="number"
                inputMode="numeric"
                value={value}
                min={min}
                max={max}
                disabled={disabled}
                onChange={(e) => {
                    if (e.target.value === '') return;
                    const n = Number(e.target.value);
                    if (Number.isFinite(n)) onChange(clamp(Math.round(n)));
                }}
                onKeyDown={(e) => {
                    if (e.key === 'ArrowUp') { e.preventDefault(); onChange(clamp(value + 1)); }
                    if (e.key === 'ArrowDown') { e.preventDefault(); onChange(clamp(value - 1)); }
                }}
                className="w-12 text-center py-1.5 rounded-xl border border-border bg-background text-base font-bold tabular-nums outline-none focus:border-primary/45 disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
                type="button"
                onClick={() => onChange(clamp(value + 1))}
                disabled={disabled || value >= max}
                className={smallButton}
                aria-label={`Increase ${ariaLabel}`}
            >
                +
            </button>
        </div>
    );
}

export function FrequencyPicker({ value, onChange, language = 'ar', disabled }: FrequencyPickerProps) {
    const isAr = language === 'ar';
    const isWeekly = value.frequency === 'weekly';
    const fallback = isWeekly ? 2 : 1;
    const times = Math.max(1, Math.min(isWeekly ? 7 : 6, Math.round(value.timesPerPeriod || fallback)));

    const setFrequency = (frequency: 'daily' | 'weekly') => {
        if (disabled) return;
        onChange({
            frequency,
            timesPerPeriod: Math.min(frequency === 'weekly' ? 7 : 6, times),
            days: frequency === 'weekly' ? value.days : undefined,
        });
    };

    const caption = isAr
        ? (isWeekly
            ? (times === 1 ? 'مرة واحدة بالأسبوع' : times === 2 ? 'مرتين بالأسبوع' : 'مرات بالأسبوع')
            : (times === 1 ? 'مرة واحدة باليوم' : times === 2 ? 'مرتين باليوم' : 'مرات باليوم'))
        : (isWeekly
            ? `time${times > 1 ? 's' : ''} per week`
            : `time${times > 1 ? 's' : ''} per day`);

    const segmentClass = (active: boolean) => cn(
        'px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-150 motion-reduce:transition-none cursor-pointer select-none',
        active
            ? 'bg-primary text-primary-foreground shadow-xs'
            : 'text-muted-foreground hover:text-foreground',
    );

    return (
        <div className="space-y-3">
            <div className="inline-flex rounded-xl border border-border bg-muted/50 p-1 gap-1">
                <button type="button" onClick={() => setFrequency('daily')} disabled={disabled} className={segmentClass(!isWeekly)}>
                    {isAr ? 'يومي' : 'Daily'}
                </button>
                <button type="button" onClick={() => setFrequency('weekly')} disabled={disabled} className={segmentClass(isWeekly)}>
                    {isAr ? 'أسبوعي' : 'Weekly'}
                </button>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
                <CompactStepper
                    value={times}
                    min={1}
                    max={isWeekly ? 7 : 6}
                    onChange={(n) => !disabled && onChange({ ...value, frequency: value.frequency || 'daily', timesPerPeriod: n })}
                    ariaLabel={isWeekly ? 'times per week' : 'times per day'}
                    disabled={disabled}
                />
                <span className="text-sm font-medium text-muted-foreground select-none">{caption}</span>
            </div>

            {isWeekly && (
                <WeekdayChips
                    value={value.days ?? null}
                    onChange={(days) => onChange({ ...value, frequency: 'weekly', timesPerPeriod: times, days: days ?? undefined })}
                    language={language}
                    size="sm"
                    disabled={disabled}
                />
            )}
        </div>
    );
}
