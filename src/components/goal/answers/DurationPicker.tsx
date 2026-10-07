'use client';

import type { DurationPickerProps } from './answer-types';
import {
    parseDurationMinutes,
    formatDurationMinutes,
    MAX_DURATION_HOURS,
    MINUTE_STEP,
} from './answer-helpers';

function TimeColumn({
    value,
    min,
    max,
    stepBy,
    onChange,
    label,
    ariaLabel,
    disabled,
}: {
    value: number;
    min: number;
    max: number;
    stepBy: (value: number, direction: 1 | -1) => number;
    onChange: (value: number) => void;
    label: string;
    ariaLabel: string;
    disabled?: boolean;
}) {
    const clamp = (n: number) => Math.min(max, Math.max(min, n));
    const smallButton = 'w-8 h-8 rounded-xl border border-border bg-muted/60 flex items-center justify-center text-base font-bold hover:bg-muted transition-colors duration-150 cursor-pointer select-none active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed motion-reduce:transition-none motion-reduce:active:scale-100';

    return (
        <div className="flex flex-col items-center gap-1.5">
            <button
                type="button"
                onClick={() => onChange(clamp(stepBy(value, 1)))}
                disabled={disabled || value >= max}
                className={smallButton}
                aria-label={`Increase ${ariaLabel}`}
            >
                +
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
                    if (!Number.isFinite(n)) return;
                    onChange(clamp(Math.round(n)));
                }}
                onKeyDown={(e) => {
                    if (e.key === 'ArrowUp') { e.preventDefault(); onChange(clamp(stepBy(value, 1))); }
                    if (e.key === 'ArrowDown') { e.preventDefault(); onChange(clamp(stepBy(value, -1))); }
                }}
                className="w-14 text-center py-1.5 rounded-xl border border-border bg-background text-lg font-bold tabular-nums outline-none focus:border-primary/45 disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
                type="button"
                onClick={() => onChange(clamp(stepBy(value, -1)))}
                disabled={disabled || value <= min}
                className={smallButton}
                aria-label={`Decrease ${ariaLabel}`}
            >
                −
            </button>
            <span className="text-[10px] font-bold text-muted-foreground select-none">{label}</span>
        </div>
    );
}

const minuteStepBy = (value: number, direction: 1 | -1): number => (
    direction === 1
        ? (((Math.floor(value / MINUTE_STEP) + 1) * MINUTE_STEP) % 60)
        : ((((Math.ceil(value / MINUTE_STEP) - 1) * MINUTE_STEP) + 60) % 60)
);

export function DurationPicker({ value, onChange, language = 'ar', disabled }: DurationPickerProps) {
    const isAr = language === 'ar';
    const total = parseDurationMinutes(value);
    const hours = Math.min(MAX_DURATION_HOURS, Math.floor(total / 60));
    const minutes = total % 60;

    return (
        <div className="space-y-2">
            <div className="flex items-start gap-2 sm:gap-3">
                <TimeColumn
                    value={hours}
                    min={0}
                    max={MAX_DURATION_HOURS}
                    stepBy={(v, d) => v + d}
                    onChange={(h) => onChange(h * 60 + minutes)}
                    label={isAr ? 'ساعة' : 'hours'}
                    ariaLabel="hours"
                    disabled={disabled}
                />
                <span className="mt-[38px] text-lg font-bold text-muted-foreground/50 select-none">:</span>
                <TimeColumn
                    value={minutes}
                    min={0}
                    max={59}
                    stepBy={minuteStepBy}
                    onChange={(m) => onChange(hours * 60 + m)}
                    label={isAr ? 'دقائق' : 'minutes'}
                    ariaLabel="minutes"
                    disabled={disabled}
                />
            </div>
            <p className="text-[11px] text-muted-foreground" dir={isAr ? 'rtl' : 'ltr'}>
                {formatDurationMinutes(total, language)}
            </p>
        </div>
    );
}
