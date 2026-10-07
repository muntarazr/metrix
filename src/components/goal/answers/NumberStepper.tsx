'use client';

import { ChevronDown, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { NumberStepperProps } from './answer-types';
import { getUnitDisplayLabel } from './answer-helpers';
import { STEP_BUTTON_CLASSES, NUMBER_INPUT_CLASSES } from './answer-styles';

export function NumberStepper({
    value,
    onChange,
    unit,
    unitOptions,
    onUnitChange,
    min = 0,
    max,
    step = 1,
    disabled,
    language = 'ar',
    placeholder = '0',
}: NumberStepperProps) {
    const isAr = language === 'ar';
    const numeric = Number(value);
    const current = Number.isFinite(numeric) ? numeric : 0;
    const lower = min;
    const upper = max ?? Number.POSITIVE_INFINITY;

    const decrease = () => {
        if (disabled) return;
        const next = Math.max(lower, current - step);
        onChange(String(Math.min(upper, next)));
    };
    const increase = () => {
        if (disabled) return;
        const next = Math.min(upper, current + step);
        onChange(String(Math.max(lower, next)));
    };
    const commit = () => {
        const raw = String(value ?? '').trim();
        if (raw === '') return;
        const n = Number(raw);
        if (!Number.isFinite(n)) return;
        const clamped = Math.min(upper, Math.max(lower, n));
        if (clamped !== n) onChange(String(clamped));
    };

    const currentUnit = unit || unitOptions?.[0]?.value || '';
    const currentLabel = getUnitDisplayLabel(currentUnit, isAr);

    return (
        <div className="flex items-center gap-3 flex-wrap">
            <button
                type="button"
                onClick={decrease}
                disabled={disabled || current <= lower}
                className={STEP_BUTTON_CLASSES}
                aria-label="Decrease value"
            >
                −
            </button>
            <input
                type="number"
                value={String(value ?? '')}
                onChange={(e) => !disabled && onChange(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => {
                    if (e.key === 'ArrowUp') { e.preventDefault(); increase(); }
                    if (e.key === 'ArrowDown') { e.preventDefault(); decrease(); }
                }}
                disabled={disabled}
                min={lower}
                max={max}
                step={step}
                className={NUMBER_INPUT_CLASSES}
                placeholder={placeholder}
            />
            <button
                type="button"
                onClick={increase}
                disabled={disabled || current >= upper}
                className={STEP_BUTTON_CLASSES}
                aria-label="Increase value"
            >
                +
            </button>

            {!unitOptions || unitOptions.length <= 1 || !onUnitChange ? (
                <span className="text-sm font-medium text-muted-foreground select-none px-1">
                    {currentLabel}
                </span>
            ) : (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            type="button"
                            disabled={disabled}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/70 bg-muted/50 hover:bg-muted hover:border-primary/50 text-sm font-semibold text-foreground transition-all duration-150 motion-reduce:transition-none cursor-pointer select-none focus:outline-hidden active:scale-95 shadow-2xs disabled:opacity-50"
                            title={isAr ? `اضغط لتغيير الوحدة (${currentLabel})` : `Click to change unit (${currentLabel})`}
                        >
                            <span>{currentLabel}</span>
                            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align={isAr ? 'start' : 'end'} className="min-w-[120px] p-1">
                        {unitOptions.map((opt) => (
                            <DropdownMenuItem
                                key={opt.value}
                                onClick={() => onUnitChange?.(opt.value, currentUnit)}
                                className={cn(
                                    'flex items-center justify-between gap-3 text-sm cursor-pointer py-2 px-3 rounded-lg',
                                    currentUnit === opt.value && 'font-bold text-primary bg-primary/10',
                                )}
                            >
                                <span>{isAr ? opt.labelAr : opt.labelEn}</span>
                                {currentUnit === opt.value && (
                                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                                )}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </div>
    );
}
