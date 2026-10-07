export type AnswerLanguage = 'ar' | 'en';

export interface UnitOption {
    value: string;
    labelAr: string;
    labelEn: string;
}

export interface FrequencyValue {
    frequency: 'daily' | 'weekly';
    /** How many times per day / per week (1-6 daily, 1-7 weekly). */
    timesPerPeriod?: number;
    /** Weekly only: which weekdays (0=Sunday … 6=Saturday). undefined/null = every day. */
    days?: number[];
}

export type BooleanAnswerValue = 'yes' | 'no' | null;

/** Shape of an AI question as produced by the investigation step. */
export interface AnswerQuestion {
    id: string;
    question: string;
    type?: string;
    options?: string[];
    unit?: string;
}

export interface NumberStepperProps {
    value: string | number;
    onChange: (value: string) => void;
    /** Currently selected unit (used for the label / dropdown). */
    unit?: string;
    /** Choices for the unit dropdown. Length ≤ 1 renders a plain label. */
    unitOptions?: UnitOption[];
    /** Called with (newUnit, previousUnit) when the user picks another unit. */
    onUnitChange?: (unit: string, previousUnit?: string) => void;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
    language?: AnswerLanguage;
    placeholder?: string;
}

export interface DurationPickerProps {
    /** "1:30", "90" or 90 — always interpreted as minutes unless it has a colon. */
    value: string | number;
    /** Emits total minutes. */
    onChange: (minutes: number) => void;
    language?: AnswerLanguage;
    disabled?: boolean;
}

export interface WeekdayChipsProps {
    /** 0=Sunday … 6=Saturday. null (or all 7) = every day → "كل يوم". */
    value: number[] | null;
    onChange: (value: number[] | null) => void;
    language?: AnswerLanguage;
    size?: 'sm' | 'md';
    showSummary?: boolean;
    disabled?: boolean;
}

export interface FrequencyPickerProps {
    value: FrequencyValue;
    onChange: (value: FrequencyValue) => void;
    language?: AnswerLanguage;
    disabled?: boolean;
}

export interface BooleanAnswerProps {
    value: string;
    onChange: (value: string) => void;
    language?: AnswerLanguage;
    disabled?: boolean;
}

export interface DatePickerFieldProps {
    /** YYYY-MM-DD or null. */
    value: string | null;
    onChange: (value: string | null) => void;
    language?: AnswerLanguage;
    disabled?: boolean;
}

export interface AnswerControlProps {
    question: AnswerQuestion;
    /** The stored answer — always a string (`answers: Record<string, string>`). */
    value: string;
    onChange: (value: string) => void;
    /** Question-declared unit (fallback). */
    unit?: string;
    /** User-selected unit for this question (takes precedence over `unit`). */
    selectedUnit?: string;
    /** Called with (newUnit, previousUnit) when the unit dropdown changes. */
    onUnitChange?: (unit: string, previousUnit?: string) => void;
    language?: AnswerLanguage;
    disabled?: boolean;
}
