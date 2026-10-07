import { Feather, Gauge, Flame, Rocket, Crown } from 'lucide-react';
import type { Language } from '@/lib/translations';

export interface FlatTask {
    id: string;
    task: string;
    frequency: 'daily' | 'weekly';
    /** Weekdays the task runs (0=Sunday … 6=Saturday). null/[] = every day the frequency implies. */
    schedule_days?: number[] | null;
    impact_weight: number;
    time_required_minutes: number;
    completion_criteria: string;
    included: boolean;
}

export interface GoalCreatorPageProps {
    initialGoalText: string;
    onComplete: () => void;
    onCancel: () => void;
    onGuardStateChange?: (active: boolean) => void;
    language?: Language;
}

export interface StructuredSubtask {
    id: string;
    task: string;
    frequency: 'daily' | 'weekly';
    schedule_days?: number[] | null;
    impact_weight: number;
    time_required_minutes: number;
    completion_criteria: string;
}

export interface StructuredMainTask {
    id: string;
    task: string;
    frequency: 'daily' | 'weekly';
    schedule_days?: number[] | null;
    impact_weight: number;
    completion_criteria: string;
    subtasks: StructuredSubtask[];
}

export type GoalCreatorStep = 'INVESTIGATING' | 'QUESTIONS' | 'GENERATING_PLAN' | 'REVIEW';

/**
 * Hard cap on AI question rounds. When the model never reports
 * `ready_for_plan`, the final confirmation screen is forced after this many
 * rounds so the user is never stuck in an infinite question loop.
 */
export const MAX_QUESTION_ROUNDS = 5;

/** Key under which a free-text addition from the confirmation screen is stored. */
export const additionKeyFor = (isArabic: boolean) => isArabic ? 'إضافة المستخدم' : 'User addition';

export interface InvestigationQuestion {
    id: string;
    question: string;
    type?: 'single_choice' | 'choice' | 'number' | 'text' | string;
    options?: string[];
    unit?: string;
    /** When true the round cannot be submitted until this question has an answer. */
    required?: boolean;
}

export interface GoalUnderstanding {
    readiness?: string;
    goal_summary?: string;
    domain?: string;
}

export interface InvestigationResult {
    status?: string;
    questions?: InvestigationQuestion[];
    goal_understanding?: GoalUnderstanding;
    safe_redirection?: {
        message?: string;
    };
}

export interface LegacyTask {
    id?: string;
    task?: string;
    frequency?: 'daily' | 'weekly' | string;
    schedule_days?: number[] | null;
    impact_weight?: number | string;
    time_required_minutes?: number | string;
    completion_criteria?: string;
}

export interface PlanSummary {
    goal_summary?: string;
    estimated_total_days?: number;
}

export interface PlanResult {
    plan?: PlanSummary;
    ai_summary?: string;
    main_tasks?: StructuredMainTask[];
    tasks?: LegacyTask[];
}

export interface ApiErrorResponse {
    error?: string;
    message_ar?: string;
    message_en?: string;
}

/** Points earned per day at each commitment level. Drives both the total and the tier labels. */
export const DIFFICULTY_RATES = {
    easy: 50,
    medium: 100,
    hard: 150,
    expert: 200,
    legendary: 250,
} as const;

export type DifficultyLevel = keyof typeof DIFFICULTY_RATES;

export const DIFFICULTY_TIERS = [
    {
        key: 'easy' as const,
        ar: 'سهل',
        en: 'Easy',
        icon: Feather,
        colorClass: 'text-emerald-500',
        activeClass: 'bg-emerald-500/15 border-emerald-500/50 text-emerald-600 dark:text-emerald-400 font-bold shadow-sm shadow-emerald-500/10 ring-1 ring-emerald-500/30',
        idleClass: 'bg-card border-border hover:border-emerald-500/40 hover:bg-emerald-500/5 text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400',
    },
    {
        key: 'medium' as const,
        ar: 'متوسط',
        en: 'Med',
        icon: Gauge,
        colorClass: 'text-sky-500',
        activeClass: 'bg-sky-500/15 border-sky-500/50 text-sky-600 dark:text-sky-400 font-bold shadow-sm shadow-sky-500/10 ring-1 ring-sky-500/30',
        idleClass: 'bg-card border-border hover:border-sky-500/40 hover:bg-sky-500/5 text-muted-foreground hover:text-sky-600 dark:hover:text-sky-400',
    },
    {
        key: 'hard' as const,
        ar: 'صعب',
        en: 'Hard',
        icon: Flame,
        colorClass: 'text-amber-500',
        activeClass: 'bg-amber-500/15 border-amber-500/50 text-amber-600 dark:text-amber-400 font-bold shadow-sm shadow-amber-500/10 ring-1 ring-amber-500/30',
        idleClass: 'bg-card border-border hover:border-amber-500/40 hover:bg-amber-500/5 text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400',
    },
    {
        key: 'expert' as const,
        ar: 'خبير',
        en: 'Expert',
        icon: Rocket,
        colorClass: 'text-rose-500',
        activeClass: 'bg-rose-500/15 border-rose-500/50 text-rose-600 dark:text-rose-400 font-bold shadow-sm shadow-rose-500/10 ring-1 ring-rose-500/30',
        idleClass: 'bg-card border-border hover:border-rose-500/40 hover:bg-rose-500/5 text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400',
    },
    {
        key: 'legendary' as const,
        ar: 'أسطوري',
        en: 'Legend',
        icon: Crown,
        colorClass: 'text-purple-500',
        activeClass: 'bg-purple-500/20 border-purple-500/60 text-purple-700 dark:text-purple-300 font-extrabold shadow-sm shadow-purple-500/20 ring-1 ring-purple-500/40',
        idleClass: 'bg-card border-border hover:border-purple-500/40 hover:bg-purple-500/5 text-muted-foreground hover:text-purple-600 dark:hover:text-purple-400',
    },
] as const;

/** Weekdays for schedule_days (0 = Sunday … 6 = Saturday, JS Date#getDay convention). */
export const WEEK_DAYS = [
    { idx: 0, ar: 'أحد', en: 'Sun', letterAr: 'ح', letterEn: 'S' },
    { idx: 1, ar: 'اثنين', en: 'Mon', letterAr: 'ن', letterEn: 'M' },
    { idx: 2, ar: 'ثلاثاء', en: 'Tue', letterAr: 'ث', letterEn: 'T' },
    { idx: 3, ar: 'أربعاء', en: 'Wed', letterAr: 'ر', letterEn: 'W' },
    { idx: 4, ar: 'خميس', en: 'Thu', letterAr: 'خ', letterEn: 'T' },
    { idx: 5, ar: 'جمعة', en: 'Fri', letterAr: 'ج', letterEn: 'F' },
    { idx: 6, ar: 'سبت', en: 'Sat', letterAr: 'س', letterEn: 'S' },
] as const;
