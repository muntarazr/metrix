'use client';

import { cn } from '@/lib/utils';
import type { AnswerControlProps } from './answer-types';
import {
    getUnitOptionsForQuestion,
    isFrequencyUnit,
    isTimeUnit,
    isPeriodUnit,
    parseFrequencyAnswer,
    serializeFrequencyAnswer,
    durationValueToMinutes,
    minutesToDurationValue,
    isWeekdayQuestion,
    normalizeWeekDays,
    parseWeekdaysFromString,
    serializeWeekdays,
} from './answer-helpers';
import { CHIP_CLASSES, CHIP_ACTIVE, CHIP_IDLE, FREE_TEXT_CLASSES } from './answer-styles';
import { NumberStepper } from './NumberStepper';
import { DurationPicker } from './DurationPicker';
import { WeekdayChips } from './WeekdayChips';
import { FrequencyPicker } from './FrequencyPicker';
import { BooleanAnswer } from './BooleanAnswer';
import { DatePickerField } from './DatePickerField';

export function AnswerControl({
    question,
    value,
    onChange,
    unit,
    selectedUnit,
    onUnitChange,
    language = 'ar',
    disabled,
}: AnswerControlProps) {
    const isAr = language === 'ar';
    const qType = (question.type || '').toLowerCase().trim();
    const qText = question.question || '';
    const options = question.options;
    const currentUnit = selectedUnit ?? unit ?? question.unit;

    /* boolean → نعم / لا مع حقل التوضيح المخصص */
    if (qType === 'boolean' || qType === 'yes_no' || qType === 'yesno' || qType === 'yn') {
        return (
            <BooleanAnswer
                value={value || ''}
                onChange={onChange}
                language={language}
                disabled={disabled}
            />
        );
    }

    /* date → calendar popover */
    if (qType === 'date') {
        return (
            <DatePickerField
                value={value || null}
                onChange={(v) => onChange(v ?? '')}
                language={language}
                disabled={disabled}
            />
        );
    }

    /* number → duration / frequency / stepper (+ unit selector) */
    if (qType === 'number') {
        const unitOptions = getUnitOptionsForQuestion(question.unit, qText);
        const activeUnit = currentUnit || unitOptions[0]?.value || '';

        if (isFrequencyUnit(activeUnit, qText)) {
            return (
                <FrequencyPicker
                    value={parseFrequencyAnswer(value)}
                    onChange={(f) => onChange(serializeFrequencyAnswer(f, language))}
                    language={language}
                    disabled={disabled}
                />
            );
        }

        if (!isPeriodUnit(activeUnit) && isTimeUnit(activeUnit, qText)) {
            return (
                <DurationPicker
                    value={durationValueToMinutes(value, activeUnit)}
                    onChange={(minutes) => onChange(minutesToDurationValue(minutes, activeUnit))}
                    language={language}
                    disabled={disabled}
                />
            );
        }

        return (
            <NumberStepper
                value={value}
                onChange={onChange}
                unit={activeUnit}
                unitOptions={unitOptions}
                onUnitChange={onUnitChange}
                language={language}
                disabled={disabled}
            />
        );
    }

    /* weekday options (السبت / Sunday …) → day chips */
    if (isWeekdayQuestion(options)) {
        return (
            <WeekdayChips
                value={normalizeWeekDays(parseWeekdaysFromString(value))}
                onChange={(days) => onChange(serializeWeekdays(days, options, language))}
                language={language}
                size="md"
                disabled={disabled}
            />
        );
    }

    /* single choice + free-text fallback */
    if (qType === 'single_choice' || qType === 'choice') {
        const raw = (value || '').trim();
        let matchedOption: string | null = null;
        let note = '';

        for (const opt of (options || [])) {
            if (raw === opt) {
                matchedOption = opt;
                note = '';
                break;
            }
            if (raw.startsWith(`${opt}:`) || raw.startsWith(`${opt} -`) || raw.startsWith(`${opt} (`)) {
                matchedOption = opt;
                const rest = raw.slice(opt.length).replace(/^[:\-–—(]\s*/, '').replace(/\)$/, '').trim();
                note = rest;
                break;
            }
        }

        if (!matchedOption && !options?.includes(raw)) {
            note = raw;
        }

        const handleOptionClick = (opt: string) => {
            const nextOpt = matchedOption === opt ? null : opt;
            if (nextOpt) {
                onChange(note.trim() ? `${nextOpt}: ${note.trim()}` : nextOpt);
            } else {
                onChange(note.trim());
            }
        };

        const handleNoteChange = (newNote: string) => {
            if (matchedOption) {
                onChange(newNote.trim() ? `${matchedOption}: ${newNote.trim()}` : matchedOption);
            } else {
                onChange(newNote);
            }
        };

        return (
            <div className="space-y-2.5">
                <div className="flex flex-wrap gap-2">
                    {(options || []).map((opt) => {
                        const active = matchedOption === opt || (!matchedOption && value === opt);
                        return (
                            <button
                                key={opt}
                                type="button"
                                disabled={disabled}
                                onClick={() => handleOptionClick(opt)}
                                className={cn(
                                    CHIP_CLASSES,
                                    active ? CHIP_ACTIVE : CHIP_IDLE,
                                    'cursor-pointer disabled:cursor-not-allowed disabled:opacity-50'
                                )}
                            >
                                {opt}
                            </button>
                        );
                    })}
                </div>
                <input
                    type="text"
                    value={note}
                    onChange={(e) => handleNoteChange(e.target.value)}
                    disabled={disabled}
                    placeholder={
                        isAr
                            ? (matchedOption
                                ? `أضف توضيحاً أو تفاصيل حول اختيارك "${matchedOption}" (اختياري)...`
                                : 'أو اكتب إجابتك وتفاصيلك هنا بدقة...')
                            : (matchedOption
                                ? `Add details about your choice "${matchedOption}" (optional)...`
                                : 'Or type your custom answer here...')
                    }
                    className={cn(FREE_TEXT_CLASSES, 'disabled:opacity-50 text-xs sm:text-sm')}
                    dir={isAr ? 'rtl' : 'ltr'}
                />
            </div>
        );
    }

    /* multi choice → comma-joined string (Arabic comma), + free text */
    if (qType === 'multi_choice') {
        const selectedList = (value || '').split(/[,،]/).map(s => s.trim()).filter(Boolean);
        const toggleOption = (opt: string) => {
            if (disabled) return;
            const next = selectedList.includes(opt)
                ? selectedList.filter(s => s !== opt)
                : [...selectedList, opt];
            onChange(next.join('، '));
        };
        return (
            <div className="space-y-2.5">
                <div className="flex flex-wrap gap-2">
                    {(options || []).map((opt) => (
                        <button
                            key={opt}
                            type="button"
                            disabled={disabled}
                            onClick={() => toggleOption(opt)}
                            className={cn(CHIP_CLASSES, selectedList.includes(opt) ? CHIP_ACTIVE : CHIP_IDLE, 'cursor-pointer disabled:cursor-not-allowed disabled:opacity-50')}
                        >
                            {opt}
                        </button>
                    ))}
                </div>
                <input
                    type="text"
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                    placeholder={isAr ? 'أو اكتب إجابتك هنا بدقة...' : 'Or type your custom answer here...'}
                    className={cn(FREE_TEXT_CLASSES, 'disabled:opacity-50')}
                    dir={isAr ? 'rtl' : 'ltr'}
                />
            </div>
        );
    }

    /* default → free text */
    return (
        <textarea
            rows={2}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="w-full p-3 rounded-xl border border-border bg-background text-base sm:text-sm outline-none focus:border-primary/45 resize-none disabled:opacity-50"
            placeholder={isAr ? 'اكتب إجابتك...' : 'Type your answer...'}
            dir={isAr ? 'rtl' : 'ltr'}
        />
    );
}
