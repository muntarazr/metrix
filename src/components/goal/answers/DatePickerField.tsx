'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { arSA, enUS } from 'react-day-picker/locale';
import { CalendarDays, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { DatePickerFieldProps } from './answer-types';
import { parseISODateString, toISODateString } from './answer-helpers';

export function DatePickerField({ value, onChange, language = 'ar', disabled }: DatePickerFieldProps) {
    const isAr = language === 'ar';
    const [open, setOpen] = useState(false);
    const parsed = parseISODateString(value);

    return (
        <div className="flex items-center gap-2">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        disabled={disabled}
                        className={cn(
                            'flex-1 font-normal gap-2 h-9',
                            isAr ? 'justify-end text-right flex-row-reverse' : 'justify-start text-left',
                            !value && 'text-muted-foreground',
                        )}
                    >
                        <CalendarDays className="size-4 text-primary/75 shrink-0" />
                        <span>
                            {parsed
                                ? format(parsed, 'PPP', { locale: isAr ? arSA : enUS })
                                : (isAr ? 'اختر تاريخاً' : 'Select date')}
                        </span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 shadow-lg border-border" align={isAr ? 'end' : 'start'} dir={isAr ? 'rtl' : 'ltr'}>
                    <Calendar
                        mode="single"
                        selected={parsed ?? undefined}
                        onSelect={(date: Date | undefined) => {
                            onChange(date ? toISODateString(date) : null);
                            setOpen(false);
                        }}
                        initialFocus
                        captionLayout="dropdown"
                        locale={isAr ? arSA : enUS}
                        dir={isAr ? 'rtl' : 'ltr'}
                        fromYear={2020}
                        toYear={2035}
                    />
                </PopoverContent>
            </Popover>
            {value && !disabled && (
                <button
                    type="button"
                    onClick={() => onChange(null)}
                    aria-label={isAr ? 'مسح التاريخ' : 'Clear date'}
                    title={isAr ? 'مسح التاريخ' : 'Clear date'}
                    className="w-9 h-9 rounded-xl border border-border bg-muted/60 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-150 cursor-pointer select-none motion-reduce:transition-none"
                >
                    <X className="w-4 h-4" />
                </button>
            )}
        </div>
    );
}
