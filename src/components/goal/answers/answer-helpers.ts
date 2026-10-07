import type {
    AnswerLanguage,
    UnitOption,
    FrequencyValue,
    BooleanAnswerValue,
} from './answer-types';

/* ─── Unit constants & options ───────────────────────────────────────── */

const TIME_UNITS: UnitOption[] = [
    { value: 'minutes', labelAr: 'دقيقة', labelEn: 'minutes' },
    { value: 'hours', labelAr: 'ساعة', labelEn: 'hours' },
];

const WEIGHT_UNITS: UnitOption[] = [
    { value: 'kg', labelAr: 'كغ', labelEn: 'kg' },
    { value: 'lbs', labelAr: 'باوند', labelEn: 'lbs' },
];

const DISTANCE_UNITS: UnitOption[] = [
    { value: 'km', labelAr: 'كم', labelEn: 'km' },
    { value: 'm', labelAr: 'متر', labelEn: 'm' },
];

const PERIOD_UNITS: UnitOption[] = [
    { value: 'days', labelAr: 'يوم', labelEn: 'days' },
    { value: 'weeks', labelAr: 'أسبوع', labelEn: 'weeks' },
    { value: 'months', labelAr: 'شهر', labelEn: 'months' },
];

const REPS_UNITS: UnitOption[] = [
    { value: 'times', labelAr: 'مرة', labelEn: 'times' },
];

const CURRENCY_UNITS: UnitOption[] = [
    { value: 'usd', labelAr: 'دولار ($)', labelEn: 'USD ($)' },
    { value: 'iqd', labelAr: 'د.ع', labelEn: 'IQD' },
];

export const UNIT_GROUPS = {
    time: TIME_UNITS,
    weight: WEIGHT_UNITS,
    distance: DISTANCE_UNITS,
    period: PERIOD_UNITS,
    reps: REPS_UNITS,
    currency: CURRENCY_UNITS,
} as const;

export function getUnitDisplayLabel(unit: string, isArabic: boolean): string {
    const norm = (unit || '').toLowerCase().trim();
    switch (norm) {
        case 'minutes':
        case 'minute':
        case 'min':
        case 'دقيقة':
        case 'دقائق':
            return isArabic ? 'دقيقة' : 'minutes';
        case 'hours':
        case 'hour':
        case 'hr':
        case 'ساعة':
        case 'ساعات':
            return isArabic ? 'ساعة' : 'hours';
        case 'kg':
        case 'كغ':
        case 'كيلو':
            return isArabic ? 'كغ' : 'kg';
        case 'lbs':
        case 'باوند':
            return isArabic ? 'باوند' : 'lbs';
        case 'km':
        case 'كم':
            return isArabic ? 'كم' : 'km';
        case 'm':
        case 'متر':
            return isArabic ? 'متر' : 'm';
        case 'days':
        case 'day':
        case 'يوم':
        case 'يومين':
        case 'أيام':
            return isArabic ? 'يوم' : 'days';
        case 'weeks':
        case 'week':
        case 'أسبوع':
        case 'أسبوعين':
        case 'أسابيع':
            return isArabic ? 'أسبوع' : 'weeks';
        case 'months':
        case 'month':
        case 'شهر':
        case 'شهران':
        case 'شهور':
        case 'أشهر':
            return isArabic ? 'شهر' : 'months';
        case 'times':
        case 'time':
        case 'مرة':
        case 'مرات':
            return isArabic ? 'مرة' : 'times';
        case 'usd':
        case '$':
            return isArabic ? 'دولار ($)' : 'USD ($)';
        case 'iqd':
            return isArabic ? 'د.ع' : 'IQD';
        default:
            return unit || '';
    }
}

function periodUnitsForText(qText: string, preferred?: string): UnitOption[] {
    const KEYWORDS: Record<string, string[]> = {
        days: ['يوم', 'أيام', 'day'],
        weeks: ['أسبوع', 'أسابيع', 'week'],
        months: ['شهر', 'أشهر', 'month'],
    };
    const rank = (value: string) => {
        let first = Number.MAX_SAFE_INTEGER;
        for (const kw of KEYWORDS[value] || []) {
            const i = qText.indexOf(kw);
            if (i >= 0 && i < first) first = i;
        }
        return first;
    };
    const units = [...PERIOD_UNITS].sort((a, b) => rank(a.value) - rank(b.value));
    const textMentionsPeriod = units.some(u => rank(u.value) < Number.MAX_SAFE_INTEGER);

    if (!textMentionsPeriod && preferred) {
        const normalizedPreferred = preferred.toLowerCase().trim();
        const preferredUnit = units.find(u => u.value === normalizedPreferred) ||
            units.find(u => getUnitDisplayLabel(u.value, true) === getUnitDisplayLabel(normalizedPreferred, true));
        if (preferredUnit) {
            units.splice(units.indexOf(preferredUnit), 1);
            units.unshift(preferredUnit);
        }
    }
    return units;
}

export function getUnitOptionsForQuestion(unit?: string, questionText?: string): UnitOption[] {
    const rawUnit = (unit || '').toLowerCase().trim();
    const qText = (questionText || '').toLowerCase();

    if (['kg', 'lbs', 'كغ', 'كيلو', 'باوند'].includes(rawUnit)) return WEIGHT_UNITS;
    if (['km', 'm', 'كم', 'متر', 'miles', 'ميل'].includes(rawUnit)) return DISTANCE_UNITS;
    if (['usd', 'iqd', 'sar', 'aed', '$'].includes(rawUnit)) return CURRENCY_UNITS;

    const mentionsTime = /دقيقة|دقائق|ساعة|ساعات|minute|hour/.test(qText);
    const mentionsDailyEffort = /اليوم|يوميا|لكل يوم|في اليوم|daily|per day|الوقت|وقت متاح|تخصيص/.test(qText);
    const mentionsPeriod = /أسبوع|أسابيع|week|شهر|أشهر|month|أيام|خلال|المدة الزمنية|مدة زمنية|جدول زمني|timeline|deadline|كم يوم/.test(qText);

    if (mentionsPeriod && !mentionsTime && !mentionsDailyEffort) {
        return periodUnitsForText(qText, rawUnit);
    }

    if (mentionsTime || mentionsDailyEffort) {
        return TIME_UNITS;
    }

    if (['days', 'day', 'weeks', 'week', 'months', 'month', 'يوم', 'أيام', 'أسبوع', 'أسابيع', 'شهر', 'أشهر'].includes(rawUnit)) {
        return periodUnitsForText(qText, rawUnit);
    }
    if (['minutes', 'minute', 'hours', 'hour', 'min', 'hr', 'دقيقة', 'دقائق', 'ساعة', 'ساعات'].includes(rawUnit)) {
        return TIME_UNITS;
    }

    if (qText.includes('وزن') || qText.includes('weight') || qText.includes('كغ') || qText.includes('kg')) {
        return WEIGHT_UNITS;
    }

    if (qText.includes('مسافة') || qText.includes('distance') || qText.includes('كم') || qText.includes('كيلومتر')) {
        return DISTANCE_UNITS;
    }

    if (qText.includes('دولار') || qText.includes('ميزانية')) {
        return CURRENCY_UNITS;
    }

    if (unit) {
        return [
            {
                value: unit,
                labelAr: getUnitDisplayLabel(unit, true),
                labelEn: getUnitDisplayLabel(unit, false),
            },
        ];
    }

    if (mentionsPeriod) return periodUnitsForText(qText);
    return TIME_UNITS;
}

export function convertUnitValue(currentVal: number, oldUnit?: string, newUnit?: string): number | null {
    if (!Number.isFinite(currentVal) || currentVal <= 0 || !newUnit) return null;

    const isOldMin = oldUnit === 'minutes' || (!oldUnit && newUnit === 'hours');
    const isOldHr = oldUnit === 'hours' || (!oldUnit && newUnit === 'minutes');

    if (isOldMin && newUnit === 'hours') {
        return currentVal >= 60 ? Math.round(currentVal / 60) : 1;
    }
    if (isOldHr && newUnit === 'minutes') {
        return currentVal < 24 ? currentVal * 60 : null;
    }

    const PERIOD_TO_DAYS: Record<string, number> = { days: 1, weeks: 7, months: 30 };
    const oldFactor = oldUnit ? PERIOD_TO_DAYS[oldUnit] : undefined;
    const newFactor = PERIOD_TO_DAYS[newUnit];
    if (oldFactor && newFactor && oldUnit !== newUnit) {
        const inDays = currentVal * oldFactor;
        return Math.max(1, Math.round(inDays / newFactor));
    }
    return null;
}

/* ─── Weekday helpers ───────────────────────────────────────────────── */

export const WEEK_DAYS = [
    { idx: 0, ar: 'أحد', en: 'Sun', letterAr: 'ح', letterEn: 'S' },
    { idx: 1, ar: 'اثنين', en: 'Mon', letterAr: 'ن', letterEn: 'M' },
    { idx: 2, ar: 'ثلاثاء', en: 'Tue', letterAr: 'ث', letterEn: 'T' },
    { idx: 3, ar: 'أربعاء', en: 'Wed', letterAr: 'ر', letterEn: 'W' },
    { idx: 4, ar: 'خميس', en: 'Thu', letterAr: 'خ', letterEn: 'T' },
    { idx: 5, ar: 'جمعة', en: 'Fri', letterAr: 'ج', letterEn: 'F' },
    { idx: 6, ar: 'سبت', en: 'Sat', letterAr: 'س', letterEn: 'S' },
] as const;

const WEEKDAY_ALIASES: { idx: number; ar: string[]; en: string[] }[] = [
    { idx: 0, ar: ['أحد', 'الاحد', 'الأحد', 'حد'], en: ['sunday', 'sun'] },
    { idx: 1, ar: ['اثنين', 'إثنين', 'اتنين', 'الاثنين', 'الإثنين', 'الاتنين'], en: ['monday', 'mon'] },
    { idx: 2, ar: ['ثلاثاء', 'ثلاثه', 'الثلاثاء', 'ثلاث'], en: ['tuesday', 'tue'] },
    { idx: 3, ar: ['اربعاء', 'أربعاء', 'الاربعاء', 'الأربعاء', 'اربع', 'أربع'], en: ['wednesday', 'wed'] },
    { idx: 4, ar: ['خميس', 'الخميس'], en: ['thursday', 'thu'] },
    { idx: 5, ar: ['جمعه', 'جمعة', 'الجمعه', 'الجمعة'], en: ['friday', 'fri'] },
    { idx: 6, ar: ['سبت', 'السبت'], en: ['saturday', 'sat'] },
];

function normalizeArabicToken(token: string): string {
    return token
        .replace(/[\u064B-\u0652\u0670\u0640]/g, '')
        .replace(/[أإآ]/g, 'ا')
        .replace(/ى/g, 'ي')
        .replace(/ة/g, 'ه')
        .replace(/^ال/, '')
        .trim()
        .toLowerCase();
}

export function matchWeekday(token: string): number | null {
    const raw = String(token ?? '').trim();
    if (!raw) return null;

    const hasArabic = /[\u0600-\u06FF]/.test(raw);
    if (hasArabic) {
        const normalized = normalizeArabicToken(raw);
        for (const w of WEEKDAY_ALIASES) {
            for (const alias of w.ar) {
                const a = normalizeArabicToken(alias);
                if (normalized === a || (a.length >= 3 && normalized.includes(a))) return w.idx;
            }
        }
        return null;
    }

    const latin = raw.toLowerCase().replace(/[^a-z]/g, '');
    if (!latin) return null;
    for (const w of WEEKDAY_ALIASES) {
        for (const alias of w.en) {
            if (latin === alias || latin.startsWith(alias)) return w.idx;
        }
    }
    return null;
}

export function normalizeWeekDays(value: unknown): number[] | null {
    if (!Array.isArray(value)) return null;
    const days = Array.from(new Set(
        value.map(d => Math.round(Number(d))).filter(d => Number.isFinite(d) && d >= 0 && d <= 6),
    )).sort((a, b) => a - b);
    if (days.length === 0 || days.length === 7) return null;
    return days;
}

export function parseWeekdaysFromString(value: string): number[] {
    const tokens = String(value ?? '').split(/[^0-9\u0600-\u06FFa-zA-Z]+/).filter(Boolean);
    const days = new Set<number>();
    for (const token of tokens) {
        const idx = matchWeekday(token);
        if (idx !== null) days.add(idx);
    }
    return [...days].sort((a, b) => a - b);
}

export function isWeekdayQuestion(options?: string[]): boolean {
    if (!options || options.length < 3) return false;
    const matched = options.map(o => matchWeekday(o)).filter((o): o is number => o !== null);
    return matched.length >= 3 && new Set(matched).size >= 3;
}

export function serializeWeekdays(days: number[] | null, options?: string[], language: AnswerLanguage = 'ar'): string {
    const normalized = normalizeWeekDays(days);
    if (!normalized) return language === 'ar' ? 'كل يوم' : 'Every day';
    const labelFor = (idx: number) =>
        options?.find(o => matchWeekday(o) === idx)
        ?? (language === 'ar' ? WEEK_DAYS[idx]?.ar : WEEK_DAYS[idx]?.en);
    return normalized.map(labelFor).filter(Boolean).join('، ');
}

export function formatWeekdaysLabel(days: number[] | null, language: AnswerLanguage = 'ar'): string {
    const normalized = normalizeWeekDays(days);
    if (!normalized) return language === 'ar' ? 'كل يوم' : 'Every day';
    return normalized
        .map(idx => (language === 'ar' ? WEEK_DAYS[idx]?.ar : WEEK_DAYS[idx]?.en))
        .filter(Boolean)
        .join(language === 'ar' ? '، ' : ', ');
}

/* ─── Duration helpers ──────────────────────────────────────────────── */

export const MAX_DURATION_HOURS = 23;
export const MINUTE_STEP = 5;

export function parseDurationMinutes(value: string | number): number {
    if (typeof value === 'number') {
        return Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
    }
    const raw = String(value ?? '').trim();
    if (!raw) return 0;
    const colon = raw.match(/^(\d{1,4})\s*[:：]\s*(\d{1,2})$/);
    if (colon) {
        const total = parseInt(colon[1], 10) * 60 + parseInt(colon[2], 10);
        return Number.isFinite(total) ? Math.max(0, total) : 0;
    }
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.round(n);
}

export function formatDurationMinutes(minutes: number, language: AnswerLanguage = 'ar'): string {
    const total = Math.max(0, Math.round(minutes));
    const h = Math.min(MAX_DURATION_HOURS, Math.floor(total / 60));
    const m = total % 60;
    if (language === 'ar') {
        const hourWord = h === 0 ? null : h === 1 ? 'ساعة واحدة' : h === 2 ? 'ساعتان' : `${h} ساعات`;
        const minuteWord = m === 0 ? null : m === 1 ? 'دقيقة واحدة' : m === 2 ? 'دقيقتان' : `${m} دقيقة`;
        if (hourWord && minuteWord) return `${hourWord} و${minuteWord}`;
        return hourWord ?? minuteWord ?? '0 دقيقة';
    }
    const hourPart = h > 0 ? `${h}h` : '';
    const minutePart = m > 0 ? `${m}m` : '';
    if (hourPart && minutePart) return `${hourPart} ${minutePart}`;
    return hourPart || minutePart || '0m';
}

export function isHoursUnit(unit?: string): boolean {
    return ['hours', 'hour', 'hr', 'hrs', 'ساعة', 'ساعات'].includes((unit || '').toLowerCase().trim());
}

export function isPeriodUnit(unit?: string): boolean {
    return ['days', 'day', 'weeks', 'week', 'months', 'month', 'يوم', 'أيام', 'أسبوع', 'أسابيع', 'شهر', 'أشهر']
        .includes((unit || '').toLowerCase().trim());
}

export function isTimeUnit(unit?: string, questionText?: string): boolean {
    const u = (unit || '').toLowerCase().trim();
    if (['minutes', 'minute', 'min', 'hours', 'hour', 'hr', 'hrs', 'دقيقة', 'دقائق', 'ساعة', 'ساعات'].includes(u)) return true;
    if (u) return false;
    return /وقت|ساعة|ساعات|دقيقة|دقائق|\btime\b|\bhour|\bminute/i.test(questionText || '');
}

export function isFrequencyUnit(unit?: string, questionText?: string): boolean {
    const u = (unit || '').toLowerCase().trim();
    if (['times', 'time', 'count', 'times_per_week', 'times_per_day', 'per_week', 'per_day', 'مرة', 'مرات', 'تكرار'].includes(u)) return true;
    if (u) return false;
    return /كم\s*مرة|مرات|تكرار|frequency|times?\s+per/i.test(questionText || '');
}

export function durationValueToMinutes(value: string, unit?: string): number {
    const raw = String(value ?? '').trim();
    if (raw.includes(':')) return parseDurationMinutes(raw);
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return isHoursUnit(unit) ? Math.round(n * 60) : Math.round(n);
}

export function minutesToDurationValue(minutes: number, unit?: string): string {
    const total = Math.max(0, Math.round(minutes));
    if (isHoursUnit(unit)) return String(Math.round((total / 60) * 100) / 100);
    return String(total);
}

/* ─── Frequency helpers ─────────────────────────────────────────────── */

function timesPhraseAr(n: number): string {
    if (n === 1) return 'مرة واحدة';
    if (n === 2) return 'مرتين';
    return `${n} مرات`;
}

export function serializeFrequencyAnswer(value: FrequencyValue, language: AnswerLanguage = 'ar'): string {
    const fallback = value.frequency === 'weekly' ? 2 : 1;
    const n = Math.max(1, Math.min(7, Math.round(value.timesPerPeriod || fallback)));
    if (value.frequency === 'daily') {
        return String(Math.min(6, n));
    }
    const base = language === 'ar'
        ? `${timesPhraseAr(n)} بالأسبوع`
        : `${n} time${n > 1 ? 's' : ''} per week`;
    const days = normalizeWeekDays(value.days);
    if (!days) return base;
    const names = days
        .map(idx => (language === 'ar' ? WEEK_DAYS[idx]?.ar : WEEK_DAYS[idx]?.en))
        .filter(Boolean)
        .join(language === 'ar' ? '، ' : ', ');
    return `${base} (${names})`;
}

export function parseFrequencyAnswer(value: string): FrequencyValue {
    const raw = String(value ?? '').trim();
    if (!raw) return { frequency: 'daily', timesPerPeriod: 1 };

    const numMatch = raw.match(/\d+/);
    const parsed = numMatch ? parseInt(numMatch[0], 10) : 1;
    const days = parseWeekdaysFromString(raw);
    const weekly = /أسبوع|week/i.test(raw) || days.length > 0;

    if (!weekly) {
        return { frequency: 'daily', timesPerPeriod: Math.max(1, Math.min(6, Number.isFinite(parsed) ? parsed : 1)) };
    }
    return {
        frequency: 'weekly',
        timesPerPeriod: Math.max(1, Math.min(7, Number.isFinite(parsed) ? parsed : 1)),
        days: days.length ? days : undefined,
    };
}

/* ─── Boolean + date helpers ────────────────────────────────────────── */

export function parseBooleanAnswer(value: string): BooleanAnswerValue {
    const raw = String(value ?? '').trim().toLowerCase();
    if (!raw) return null;
    if (['yes', 'y', 'true', 'نعم', 'أجل', 'اجل'].includes(raw)) return 'yes';
    if (['no', 'n', 'false', 'لا', 'كلا'].includes(raw)) return 'no';
    if (raw.startsWith('نعم') || raw.startsWith('yes') || raw.startsWith('أجل') || raw.startsWith('true')) return 'yes';
    if (raw.startsWith('لا') || raw.startsWith('no') || raw.startsWith('كلا') || raw.startsWith('false')) return 'no';
    return null;
}

export function parseBooleanDetailed(value: string): { choice: BooleanAnswerValue; note: string } {
    const raw = String(value ?? '').trim();
    if (!raw) return { choice: null, note: '' };

    const match = raw.match(/^(نعم|أجل|اجل|yes|true|لا|كلا|no|false)(?:\s*[:\-–—(]\s*|\s+)(.*)$/i);
    if (match) {
        const lead = match[1].toLowerCase();
        const isYes = ['نعم', 'أجل', 'اجل', 'yes', 'true'].includes(lead);
        let note = match[2].trim();
        if (note.endsWith(')')) {
            note = note.slice(0, -1).trim();
        }
        return {
            choice: isYes ? 'yes' : 'no',
            note,
        };
    }

    const lower = raw.toLowerCase();
    if (['yes', 'y', 'true', 'نعم', 'أجل', 'اجل'].includes(lower)) {
        return { choice: 'yes', note: '' };
    }
    if (['no', 'n', 'false', 'لا', 'كلا'].includes(lower)) {
        return { choice: 'no', note: '' };
    }

    return { choice: null, note: raw };
}

export function parseISODateString(value?: string | null): Date | null {
    if (!value) return null;
    const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
        const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
        return Number.isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(String(value));
    return Number.isNaN(d.getTime()) ? null : d;
}

export function toISODateString(value: Date | string | null | undefined): string | null {
    if (!value) return null;
    const date = typeof value === 'string' ? parseISODateString(value) : value;
    if (!date) return null;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}
