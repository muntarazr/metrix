'use client';

import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BooleanAnswerProps, BooleanAnswerValue } from './answer-types';
import { parseBooleanDetailed } from './answer-helpers';
import { FREE_TEXT_CLASSES } from './answer-styles';

export function BooleanAnswer({ value, onChange, language = 'ar', disabled }: BooleanAnswerProps) {
    const isAr = language === 'ar';
    const { choice, note } = parseBooleanDetailed(value);

    const updateCombined = (newChoice: BooleanAnswerValue, newNote: string) => {
        const trimmedNote = newNote.trim();
        if (newChoice === 'yes') {
            const prefix = isAr ? 'نعم' : 'Yes';
            onChange(trimmedNote ? `${prefix}: ${trimmedNote}` : prefix);
        } else if (newChoice === 'no') {
            const prefix = isAr ? 'لا' : 'No';
            onChange(trimmedNote ? `${prefix}: ${trimmedNote}` : prefix);
        } else {
            onChange(trimmedNote);
        }
    };

    const handleChoiceClick = (key: 'yes' | 'no') => {
        const nextChoice = choice === key ? null : key;
        updateCombined(nextChoice, note);
    };

    const option = (key: 'yes' | 'no', label: string, Icon: typeof Check) => {
        const active = choice === key;
        return (
            <button
                key={key}
                type="button"
                disabled={disabled}
                onClick={() => handleChoiceClick(key)}
                className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border text-sm transition-all duration-150 motion-reduce:transition-none cursor-pointer select-none active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50',
                    active
                        ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs'
                        : 'bg-muted/60 border-border hover:border-primary/45 hover:bg-muted text-foreground/80',
                )}
            >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{label}</span>
            </button>
        );
    };

    return (
        <div className="space-y-2.5">
            <div className="flex items-stretch gap-3">
                {option('yes', isAr ? 'نعم' : 'Yes', Check)}
                {option('no', isAr ? 'لا' : 'No', X)}
            </div>

            <input
                type="text"
                value={note}
                onChange={(e) => updateCombined(choice, e.target.value)}
                disabled={disabled}
                placeholder={
                    isAr
                        ? (choice === 'yes'
                            ? 'اكتب توضيحاً أو تفاصيل إضافية إن أردت (مثال: أمارس المشي الخفيف يومياً)...'
                            : choice === 'no'
                            ? 'اكتب سبب اختيارك لا أو تفاصيلك (مثال: لدي إصابة بالركبة، أو ضيق وقت)...'
                            : 'اكتب توضيحاً أو سبباً إضافياً هنا (اختياري)...')
                        : (choice === 'yes'
                            ? 'Add details or context (e.g., light walking daily)...'
                            : choice === 'no'
                            ? 'Explain reason or context (e.g., knee injury, busy schedule)...'
                            : 'Add clarification or details here (optional)...')
                }
                className={cn(FREE_TEXT_CLASSES, 'disabled:opacity-50 text-xs sm:text-sm')}
                dir={isAr ? 'rtl' : 'ltr'}
            />
        </div>
    );
}
