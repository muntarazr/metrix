import { BookOpen, Dumbbell, Briefcase, Sparkles, Target } from 'lucide-react';
import type { DifficultyLevel } from '../goal-creator-types';

export const DRAFT_STORAGE_KEY = 'metrix_manual_goal_draft_v2';
export const CUSTOM_CATEGORIES_STORAGE_KEY = 'metrix_custom_categories_v1';

export interface ManualTaskDraft {
    id: string;
    task_description: string;
    frequency: 'daily' | 'weekly';
    schedule_days: number[] | null;
    impact_weight: number;
    time_required_minutes: number;
    completion_criteria: string;
}

export interface SavedDraft {
    step: number;
    goalTitle: string;
    goalIcon: string;
    goalDomain: string;
    totalDays: number;
    difficulty: DifficultyLevel;
    isCustomPoints: boolean;
    customPoints: number;
    tasks: ManualTaskDraft[];
}

export const DOMAINS = [
    { key: 'skills', labelAr: 'تعلّم ومهارات', labelEn: 'Skills & Learning', icon: BookOpen },
    { key: 'health', labelAr: 'صحة ولياقة', labelEn: 'Health & Fitness', icon: Dumbbell },
    { key: 'career', labelAr: 'عمل ومشاريع', labelEn: 'Career & Projects', icon: Briefcase },
    { key: 'habits', labelAr: 'عادات ونمط حياة', labelEn: 'Habits & Routine', icon: Sparkles },
    { key: 'other', labelAr: 'عام / أخرى', labelEn: 'General', icon: Target },
] as const;

export const DURATION_PRESETS = [
    { days: 30, labelAr: '30 يوم (شهر)', labelEn: '30 Days' },
    { days: 60, labelAr: '60 يوم (شهران)', labelEn: '60 Days' },
    { days: 90, labelAr: '90 يوم (3 أشهر)', labelEn: '90 Days (Quarter)' },
    { days: 180, labelAr: '180 يوم (6 أشهر)', labelEn: '180 Days' },
] as const;

export const TIME_PRESETS = [15, 30, 45, 60] as const;

export const SIMPLE_DIFFICULTIES: {
    key: DifficultyLevel;
    labelAr: string;
    labelEn: string;
    rate: number;
    color: string;
    activeBorder: string;
}[] = [
    { key: 'easy', labelAr: 'سهل', labelEn: 'Easy', rate: 50, color: 'text-emerald-500', activeBorder: 'border-emerald-500 bg-emerald-500/10' },
    { key: 'medium', labelAr: 'متوسط (موصى به)', labelEn: 'Medium (Recommended)', rate: 100, color: 'text-sky-500', activeBorder: 'border-sky-500 bg-sky-500/10' },
    { key: 'hard', labelAr: 'مكثف / صعب', labelEn: 'Challenging', rate: 150, color: 'text-amber-500', activeBorder: 'border-amber-500 bg-amber-500/10' },
];
