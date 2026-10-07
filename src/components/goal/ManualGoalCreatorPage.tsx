'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import {
    ArrowLeft,
    ArrowRight,
    Target,
    CalendarDays,
    Clock,
    Zap,
    Plus,
    Trash2,
    Check,
    AlertCircle,
    Loader2,
    Rocket,
    X,
    BookOpen,
    Dumbbell,
    Briefcase,
    Sparkles,
    RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { translations, type Language } from '@/lib/translations';
import { createClient } from '@/utils/supabase/client';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PANEL_SURFACE, WELL_SURFACE } from '@/lib/surfaces';
import { IconPicker } from './IconPicker';
import {
    type DifficultyLevel,
    WEEK_DAYS,
} from './goal-creator-types';
import { formatDurationLabel, normalizeScheduleDays } from './goal-creator-helpers';
import GoalLaunchCelebrationModal from './GoalLaunchCelebrationModal';

const DRAFT_STORAGE_KEY = 'metrix_manual_goal_draft_v2';

export interface ManualGoalCreatorPageProps {
    initialGoalText?: string;
    onComplete: () => void;
    onCancel: () => void;
    onGuardStateChange?: (active: boolean) => void;
    language?: Language;
}

export interface ManualTaskDraft {
    id: string;
    task_description: string;
    frequency: 'daily' | 'weekly';
    schedule_days: number[] | null;
    impact_weight: number;
    time_required_minutes: number;
    completion_criteria: string;
}

interface SavedDraft {
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

const DOMAINS = [
    { key: 'skills', labelAr: 'تعلّم ومهارات', labelEn: 'Skills & Learning', icon: BookOpen },
    { key: 'health', labelAr: 'صحة ولياقة', labelEn: 'Health & Fitness', icon: Dumbbell },
    { key: 'career', labelAr: 'عمل ومشاريع', labelEn: 'Career & Projects', icon: Briefcase },
    { key: 'habits', labelAr: 'عادات ونمط حياة', labelEn: 'Habits & Routine', icon: Sparkles },
    { key: 'other', labelAr: 'عام / أخرى', labelEn: 'General', icon: Target },
] as const;

const DURATION_PRESETS = [
    { days: 30, labelAr: '30 يوم (شهر)', labelEn: '30 Days' },
    { days: 60, labelAr: '60 يوم (شهران)', labelEn: '60 Days' },
    { days: 90, labelAr: '90 يوم (3 أشهر)', labelEn: '90 Days (Quarter)' },
    { days: 180, labelAr: '180 يوم (6 أشهر)', labelEn: '180 Days' },
] as const;

const TIME_PRESETS = [15, 30, 45, 60] as const;

const SIMPLE_DIFFICULTIES: {
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

export default function ManualGoalCreatorPage({
    initialGoalText = '',
    onComplete,
    onCancel,
    onGuardStateChange,
    language = 'ar',
}: ManualGoalCreatorPageProps) {
    const isArabic = language === 'ar';
    const t = translations[language];
    const supabase = createClient();

    // Step state: 1: Goal, 2: Timeline & Points, 3: Tasks & Launch
    const [step, setStep] = useState<number>(1);
    const [draftRestored, setDraftRestored] = useState<boolean>(false);

    // Goal Identity
    const [goalTitle, setGoalTitle] = useState(initialGoalText);
    const [goalIcon, setGoalIcon] = useState('Target');
    const [goalDomain, setGoalDomain] = useState<string>('skills');

    // Timeline & Points
    const [totalDays, setTotalDays] = useState<number>(90);
    const [difficulty, setDifficulty] = useState<DifficultyLevel>('medium');
    const [isCustomPoints, setIsCustomPoints] = useState<boolean>(false);
    const [customPoints, setCustomPoints] = useState<number>(9000);

    // Tasks list
    const [tasks, setTasks] = useState<ManualTaskDraft[]>([
        {
            id: 'task_1',
            task_description: '',
            frequency: 'daily',
            schedule_days: null,
            impact_weight: 3,
            time_required_minutes: 30,
            completion_criteria: '',
        },
    ]);

    // Status
    const [saving, setSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [showCelebration, setShowCelebration] = useState(false);

    // --- 1. LOCAL STORAGE RESTORE ON MOUNT ---
    useEffect(() => {
        try {
            const rawDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
            if (rawDraft) {
                const parsed: SavedDraft = JSON.parse(rawDraft);
                if (parsed && typeof parsed === 'object') {
                    if (parsed.goalTitle || (parsed.tasks && parsed.tasks.length > 0)) {
                        setGoalTitle(parsed.goalTitle || initialGoalText || '');
                        setGoalIcon(parsed.goalIcon || 'Target');
                        setGoalDomain(parsed.goalDomain || 'skills');
                        setTotalDays(parsed.totalDays || 90);
                        setDifficulty(parsed.difficulty || 'medium');
                        setIsCustomPoints(Boolean(parsed.isCustomPoints));
                        setCustomPoints(parsed.customPoints || 9000);
                        if (Array.isArray(parsed.tasks) && parsed.tasks.length > 0) {
                            setTasks(parsed.tasks);
                        }
                        if (parsed.step && parsed.step >= 1 && parsed.step <= 3) {
                            setStep(parsed.step);
                        }
                        setDraftRestored(true);
                    }
                }
            }
        } catch (err) {
            console.error('Failed to parse goal draft from localStorage', err);
        }
    }, [initialGoalText]);

    // --- 2. LOCAL STORAGE AUTO-SAVE ON CHANGE ---
    useEffect(() => {
        try {
            const draft: SavedDraft = {
                step,
                goalTitle,
                goalIcon,
                goalDomain,
                totalDays,
                difficulty,
                isCustomPoints,
                customPoints,
                tasks,
            };
            localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
        } catch (err) {
            console.error('Failed to save goal draft to localStorage', err);
        }
    }, [step, goalTitle, goalIcon, goalDomain, totalDays, difficulty, isCustomPoints, customPoints, tasks]);

    // Reset draft
    const handleResetDraft = useCallback(() => {
        try {
            localStorage.removeItem(DRAFT_STORAGE_KEY);
        } catch {
            // ignore
        }
        setStep(1);
        setGoalTitle('');
        setGoalIcon('Target');
        setGoalDomain('skills');
        setTotalDays(90);
        setDifficulty('medium');
        setIsCustomPoints(false);
        setCustomPoints(9000);
        setTasks([
            {
                id: `task_${Date.now()}`,
                task_description: '',
                frequency: 'daily',
                schedule_days: null,
                impact_weight: 3,
                time_required_minutes: 30,
                completion_criteria: '',
            },
        ]);
        setDraftRestored(false);
        setErrorMessage(null);
    }, []);

    // Calculate Target Points
    const targetPoints = useMemo(() => {
        if (isCustomPoints) {
            return Math.max(100, customPoints);
        }
        const diffConfig = SIMPLE_DIFFICULTIES.find(d => d.key === difficulty) || SIMPLE_DIFFICULTIES[1];
        return Math.max(500, totalDays * diffConfig.rate);
    }, [isCustomPoints, customPoints, difficulty, totalDays]);

    // Calculate Completion Date
    const targetDateFormatted = useMemo(() => {
        const targetDate = new Date(Date.now() + totalDays * 24 * 60 * 60 * 1000);
        return targetDate.toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long',
        });
    }, [totalDays, isArabic]);

    // Navigation guard
    const isDirty = useMemo(() => {
        return (
            goalTitle.trim().length > 0 ||
            tasks.some((t) => t.task_description.trim().length > 0)
        );
    }, [goalTitle, tasks]);

    useEffect(() => {
        if (!showCelebration) {
            onGuardStateChange?.(isDirty);
        } else {
            onGuardStateChange?.(false);
        }
    }, [isDirty, showCelebration, onGuardStateChange]);

    // Step Validation
    const handleNextStep = () => {
        setErrorMessage(null);
        if (step === 1) {
            if (!goalTitle.trim()) {
                setErrorMessage(isArabic ? 'يرجى كتابة عنوان للهدف للمتابعة.' : 'Please enter a goal title to proceed.');
                return;
            }
            setStep(2);
        } else if (step === 2) {
            setStep(3);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handlePrevStep = () => {
        setErrorMessage(null);
        if (step > 1) {
            setStep(step - 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    // Task handlers
    const handleAddTask = () => {
        const newTask: ManualTaskDraft = {
            id: `task_${Date.now()}`,
            task_description: '',
            frequency: 'daily',
            schedule_days: null,
            impact_weight: 3,
            time_required_minutes: 30,
            completion_criteria: '',
        };
        setTasks((prev) => [...prev, newTask]);
    };

    const handleUpdateTask = (id: string, patch: Partial<ManualTaskDraft>) => {
        setTasks((prev) =>
            prev.map((t) => (t.id === id ? { ...t, ...patch } : t))
        );
    };

    const handleDeleteTask = (id: string) => {
        if (tasks.length <= 1) {
            setTasks([
                {
                    id: `task_${Date.now()}`,
                    task_description: '',
                    frequency: 'daily',
                    schedule_days: null,
                    impact_weight: 3,
                    time_required_minutes: 30,
                    completion_criteria: '',
                },
            ]);
            return;
        }
        setTasks((prev) => prev.filter((t) => t.id !== id));
    };

    // Save Goal & Sub-layers to Supabase
    const handleLaunchGoal = async () => {
        setErrorMessage(null);

        // Validation
        const trimmedTitle = goalTitle.trim();
        if (!trimmedTitle) {
            setErrorMessage(isArabic ? 'يرجى إدخال عنوان للهدف.' : 'Please enter a goal title.');
            setStep(1);
            return;
        }

        const validTasks = tasks.filter((t) => t.task_description.trim().length > 0);
        if (validTasks.length === 0) {
            setErrorMessage(isArabic ? 'يرجى كتابة مهمة واحدة على الأقل لتحقيق هذا الهدف.' : 'Please add at least one task for this goal.');
            return;
        }

        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error(isArabic ? 'لم يتم العثور على جلسة مستخدم مسجلة.' : 'Not authenticated');

            const adjustedCompletionDate = new Date(Date.now() + totalDays * 24 * 60 * 60 * 1000).toISOString();

            // 1. Insert Goal
            const { data: goalData, error: goalError } = await supabase
                .from('goals')
                .insert({
                    user_id: user.id,
                    title: trimmedTitle,
                    domain: goalDomain || 'other',
                    target_points: targetPoints,
                    current_points: 0,
                    estimated_completion_date: adjustedCompletionDate,
                    total_days: totalDays,
                    ai_summary: '',
                    icon: goalIcon || 'Target',
                    status: 'active',
                })
                .select()
                .single();

            if (goalError) {
                console.error('Goal insert failed:', goalError);
                throw new Error(goalError.message || (isArabic ? 'فشل حفظ الهدف في قاعدة البيانات' : 'Failed to save goal'));
            }

            // 2. Insert Tasks (sub_layers)
            const subRows = validTasks.map((task, index) => ({
                goal_id: goalData.id,
                task_description: task.task_description.trim(),
                frequency: task.frequency === 'weekly' ? 'weekly' : 'daily',
                schedule_days: task.schedule_days && task.schedule_days.length > 0 ? task.schedule_days : null,
                impact_weight: Math.max(1, Math.min(5, Number(task.impact_weight) || 1)),
                completion_criteria: task.completion_criteria.trim() || '',
                time_required_minutes: Math.max(5, Number(task.time_required_minutes) || 20),
                task_type: 'main',
                parent_task_id: null,
                sort_order: index,
            }));

            let { error: subError } = await supabase.from('sub_layers').insert(subRows);

            if (subError && (subError.message || '').includes('schedule_days')) {
                const fallbackRows = subRows.map((row) => {
                    const { schedule_days, ...rest } = row;
                    return rest;
                });
                ({ error: subError } = await supabase.from('sub_layers').insert(fallbackRows));
            }

            if (subError) {
                console.error('Sub_layers insert failed:', subError);
                await supabase.from('goals').delete().eq('id', goalData.id);
                throw new Error(subError.message || (isArabic ? 'فشل حفظ مهام الهدف' : 'Failed to save tasks'));
            }

            // Clean up localStorage draft upon success
            try {
                localStorage.removeItem(DRAFT_STORAGE_KEY);
            } catch {
                // ignore
            }

            onGuardStateChange?.(false);
            setShowCelebration(true);
        } catch (err: unknown) {
            console.error('Error launching manual goal:', err);
            const message = err instanceof Error ? err.message : JSON.stringify(err);
            setErrorMessage(message);
        } finally {
            setSaving(false);
        }
    };

    const stepTitles = [
        { num: 1, titleAr: 'الهدف وهويته', titleEn: 'Goal Identity' },
        { num: 2, titleAr: 'المدة والنقاط', titleEn: 'Timeline & Points' },
        { num: 3, titleAr: 'المهام والشروط', titleEn: 'Tasks & Criteria' },
    ];

    return (
        <div
            className="w-full max-w-2xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5 pb-28 sm:pb-24 animate-in fade-in duration-200"
            dir={isArabic ? 'rtl' : 'ltr'}
        >
            {/* Top Navigation & Draft Restore Banner */}
            <div className="flex items-center justify-between gap-3 pb-2 border-b border-border/60">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={saving}
                    className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-muted/40 cursor-pointer"
                >
                    {isArabic ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                    <span>{isArabic ? 'إلغاء والعودة' : 'Cancel & Back'}</span>
                </button>

                {draftRestored && (
                    <button
                        type="button"
                        onClick={handleResetDraft}
                        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground hover:text-destructive p-1 rounded-md transition-colors cursor-pointer"
                        title={isArabic ? 'مسح المسودة المحفوظة والبدء من جديد' : 'Clear draft & start over'}
                    >
                        <RotateCcw className="w-3 h-3" />
                        <span>{isArabic ? 'مسح المسودة' : 'Clear Draft'}</span>
                    </button>
                )}
            </div>

            {/* Step Wizard Progress Header */}
            <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between gap-2">
                    {stepTitles.map((s, idx) => {
                        const isActive = step === s.num;
                        const isPassed = step > s.num;
                        return (
                            <button
                                key={s.num}
                                type="button"
                                onClick={() => {
                                    if (s.num < step || (s.num === 2 && goalTitle.trim())) {
                                        setStep(s.num);
                                    }
                                }}
                                className={cn(
                                    "flex-1 flex items-center gap-2 p-2 rounded-xl transition-all text-start cursor-pointer",
                                    isActive
                                        ? "bg-primary/10 border border-primary/30"
                                        : isPassed
                                            ? "hover:bg-muted/40 opacity-90"
                                            : "opacity-45 pointer-events-none"
                                )}
                            >
                                <div
                                    className={cn(
                                        "w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 transition-all",
                                        isActive
                                            ? "bg-primary text-primary-foreground shadow-2xs"
                                            : isPassed
                                                ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold"
                                                : "bg-muted text-muted-foreground"
                                    )}
                                >
                                    {isPassed ? <Check className="w-3.5 h-3.5" /> : s.num}
                                </div>
                                <div className="min-w-0 hidden min-[400px]:block">
                                    <div className="text-[11px] font-bold leading-tight truncate text-foreground">
                                        {isArabic ? s.titleAr : s.titleEn}
                                    </div>
                                    <div className="text-[9px] text-muted-foreground">
                                        {isArabic ? `الخطوة ${s.num} من 3` : `Step ${s.num} of 3`}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Animated Step Progress Bar */}
                <div className="h-1.5 w-full bg-muted/60 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-primary transition-all duration-300 rounded-full"
                        style={{ width: `${(step / 3) * 100}%` }}
                    />
                </div>
            </div>

            {/* Error Message Alert */}
            {errorMessage && (
                <div className="flex items-start gap-3 p-3.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs sm:text-sm animate-in fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
                    <button
                        type="button"
                        onClick={() => setErrorMessage(null)}
                        className="text-destructive/70 hover:text-destructive p-1 rounded-md cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* ================= STEP 1: GOAL IDENTITY ================= */}
            {step === 1 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="space-y-1">
                        <h2 className="text-lg sm:text-xl font-black text-foreground">
                            {isArabic ? 'ما هو الهدف الذي تريد تحقيقه؟' : 'What goal do you want to achieve?'}
                        </h2>
                        <p className="text-xs text-muted-foreground">
                            {isArabic ? 'اكتب اسم هدفك واختر له أيقونة مناسبة تمثلك.' : 'Name your goal and pick an icon that represents it.'}
                        </p>
                    </div>

                    <div className={cn(PANEL_SURFACE, "rounded-2xl border border-border/70 p-4 sm:p-5 space-y-4 shadow-xs")}>
                        {/* Title and Icon */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-foreground flex items-center justify-between">
                                <span>{isArabic ? 'عنوان الهدف' : 'Goal Title'}</span>
                                <span className="text-[10px] text-muted-foreground">
                                    {isArabic ? 'مطلوب' : 'Required'}
                                </span>
                            </label>

                            <div className="flex items-center gap-2.5">
                                <IconPicker
                                    selectedIcon={goalIcon}
                                    onSelectIcon={setGoalIcon}
                                    className="w-12 h-12 shrink-0 border-primary/20 hover:border-primary/40 rounded-xl bg-muted/20"
                                />
                                <Input
                                    value={goalTitle}
                                    onChange={(e) => setGoalTitle(e.target.value)}
                                    placeholder={isArabic ? 'مثلاً: إتقان لغة بايثون، قراءة 12 كتاباً، ركض 10 كم...' : 'e.g. Master Python, Read 12 Books...'}
                                    className="h-12 rounded-xl text-base font-bold px-3.5 bg-background/80 border-border/80 focus:border-primary"
                                    dir={isArabic ? 'rtl' : 'ltr'}
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleNextStep();
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        {/* Domain / Category pills */}
                        <div className="space-y-2 pt-1 border-t border-border/50">
                            <label className="text-xs font-bold text-muted-foreground">
                                {isArabic ? 'تصنيف الهدف' : 'Category'}
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {DOMAINS.map((dom) => {
                                    const DomIcon = dom.icon;
                                    const isSelected = goalDomain === dom.key;
                                    return (
                                        <button
                                            key={dom.key}
                                            type="button"
                                            onClick={() => setGoalDomain(dom.key)}
                                            className={cn(
                                                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer active:scale-95",
                                                isSelected
                                                    ? "bg-primary text-primary-foreground border-primary shadow-2xs font-bold"
                                                    : "bg-muted/40 hover:bg-muted border-border/70 text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            <DomIcon className="w-3.5 h-3.5 shrink-0" />
                                            <span>{isArabic ? dom.labelAr : dom.labelEn}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Step 1 Actions */}
                    <div className="pt-2 flex justify-end">
                        <Button
                            type="button"
                            onClick={handleNextStep}
                            disabled={!goalTitle.trim()}
                            className="h-11 px-6 rounded-xl font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                        >
                            <span>{isArabic ? 'التالي: تحديد المدة والنقاط' : 'Next: Timeline & Points'}</span>
                            {isArabic ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                        </Button>
                    </div>
                </div>
            )}

            {/* ================= STEP 2: TIMELINE & POINTS ================= */}
            {step === 2 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="space-y-1">
                        <h2 className="text-lg sm:text-xl font-black text-foreground">
                            {isArabic ? 'كم المدة ومستوى التحدي المطلوب؟' : 'Duration & Challenge Level'}
                        </h2>
                        <p className="text-xs text-muted-foreground">
                            {isArabic ? 'حدد إجمالي الأيام ونقاط الهدف التي تسعى لتحقيقها.' : 'Set the duration in days and the commitment points.'}
                        </p>
                    </div>

                    <div className={cn(PANEL_SURFACE, "rounded-2xl border border-border/70 p-4 sm:p-5 space-y-4 shadow-xs")}>
                        {/* Duration Presets & Input */}
                        <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                    <CalendarDays className="w-3.5 h-3.5 text-primary" />
                                    <span>{isArabic ? 'المدة الزمنية (بالأيام)' : 'Duration (Days)'}</span>
                                </label>
                                <div className="flex items-center gap-1 bg-muted/60 border border-border/80 px-2.5 py-0.5 rounded-lg">
                                    <input
                                        type="number"
                                        min={7}
                                        max={365}
                                        value={totalDays}
                                        onChange={(e) => setTotalDays(Math.max(7, Math.min(365, Number(e.target.value) || 7)))}
                                        className="w-12 text-center bg-transparent border-none outline-hidden font-bold text-sm text-foreground"
                                    />
                                    <span className="text-[11px] text-muted-foreground font-semibold">{isArabic ? 'يوم' : 'd'}</span>
                                </div>
                            </div>

                            {/* Preset Buttons */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {DURATION_PRESETS.map((p) => {
                                    const isSelected = totalDays === p.days;
                                    return (
                                        <button
                                            key={p.days}
                                            type="button"
                                            onClick={() => setTotalDays(p.days)}
                                            className={cn(
                                                "p-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer active:scale-95",
                                                isSelected
                                                    ? "bg-primary text-primary-foreground border-primary shadow-2xs font-extrabold"
                                                    : "bg-muted/40 hover:bg-muted border-border/70 text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            {isArabic ? p.labelAr : p.labelEn}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Slider */}
                            <div className="pt-1">
                                <Slider
                                    value={[totalDays]}
                                    min={7}
                                    max={365}
                                    step={1}
                                    onValueChange={(val) => setTotalDays(val[0])}
                                    className="py-1"
                                />
                            </div>

                            {/* Target Date Pill */}
                            <div className="p-2.5 rounded-xl bg-muted/30 border border-border/60 text-xs text-muted-foreground flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                                <div>
                                    <span className="font-semibold text-foreground">{isArabic ? 'تاريخ الانتهاء: ' : 'Ends on: '}</span>
                                    <span className="font-bold text-foreground">{targetDateFormatted}</span>
                                </div>
                            </div>
                        </div>

                        <hr className="border-border/50" />

                        {/* Difficulty / Points Rate */}
                        <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                                    <span>{isArabic ? 'مستوى الالتزام والصعوبة' : 'Commitment Level'}</span>
                                </label>

                                <button
                                    type="button"
                                    onClick={() => setIsCustomPoints(!isCustomPoints)}
                                    className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
                                >
                                    {isCustomPoints
                                        ? (isArabic ? 'العودة للخيارات التلقائية' : 'Auto Rates')
                                        : (isArabic ? 'تحديد نقاط مخصصة؟' : 'Custom Points?')}
                                </button>
                            </div>

                            {!isCustomPoints ? (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    {SIMPLE_DIFFICULTIES.map((diff) => {
                                        const isSelected = difficulty === diff.key;
                                        return (
                                            <button
                                                key={diff.key}
                                                type="button"
                                                onClick={() => setDifficulty(diff.key)}
                                                className={cn(
                                                    "p-2.5 rounded-xl border text-center transition-all cursor-pointer active:scale-95 flex flex-col items-center justify-center gap-0.5",
                                                    isSelected
                                                        ? `${diff.activeBorder} shadow-2xs font-extrabold ring-1 ring-primary/30`
                                                        : "bg-muted/30 border-border/70 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                                                )}
                                            >
                                                <span className={cn("text-xs font-bold", isSelected ? "text-foreground" : "")}>
                                                    {isArabic ? diff.labelAr : diff.labelEn}
                                                </span>
                                                <span className="text-[10px] opacity-75">
                                                    {diff.rate} {isArabic ? 'نقطة / يوم' : 'pts / day'}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/70">
                                    <span className="text-xs font-bold text-foreground shrink-0">
                                        {isArabic ? 'النقاط المستهدفة الإجمالية:' : 'Total Target Points:'}
                                    </span>
                                    <Input
                                        type="number"
                                        min={500}
                                        step={500}
                                        value={customPoints}
                                        onChange={(e) => setCustomPoints(Math.max(100, Number(e.target.value) || 100))}
                                        className="h-9 w-32 rounded-lg font-bold text-center"
                                    />
                                </div>
                            )}

                            {/* Total Points Display Card */}
                            <div className="flex items-center justify-between p-3 rounded-xl bg-primary/10 border border-primary/25">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
                                        <Zap className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="text-xs font-bold text-foreground">
                                        {isArabic ? 'إجمالي نقاط الهدف:' : 'Total Target Points:'}
                                    </span>
                                </div>
                                <span className="text-base font-black text-primary tabular-nums">
                                    {targetPoints.toLocaleString()} {isArabic ? 'نقطة' : 'pts'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Step 2 Actions */}
                    <div className="pt-2 flex items-center justify-between gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handlePrevStep}
                            className="h-11 px-5 rounded-xl font-bold"
                        >
                            {isArabic ? 'السابق' : 'Back'}
                        </Button>

                        <Button
                            type="button"
                            onClick={handleNextStep}
                            className="h-11 px-6 rounded-xl font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                        >
                            <span>{isArabic ? 'التالي: تحديد المهام وشروطها' : 'Next: Tasks & Criteria'}</span>
                            {isArabic ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                        </Button>
                    </div>
                </div>
            )}

            {/* ================= STEP 3: TASKS & LAUNCH ================= */}
            {step === 3 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                            <h2 className="text-lg sm:text-xl font-black text-foreground">
                                {isArabic ? 'المهام اليومية ومعايير الإنجاز' : 'Tasks & Completion Criteria'}
                            </h2>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                {isArabic
                                    ? 'أنت من يحدد معيار النجاح الدقيق لكل مهمة لتسجيل تقدمك بدون تهاون.'
                                    : 'Define the tasks and exact verification criteria for daily check-ins.'}
                            </p>
                        </div>

                        <Button
                            type="button"
                            onClick={handleAddTask}
                            size="sm"
                            className="rounded-xl font-bold gap-1.5 h-8 px-3 text-xs shrink-0"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>{isArabic ? 'إضافة مهمة' : 'Add Task'}</span>
                        </Button>
                    </div>

                    {/* Tasks List */}
                    <div className="space-y-3">
                        {tasks.map((task, index) => {
                            return (
                                <div
                                    key={task.id}
                                    className={cn(
                                        WELL_SURFACE,
                                        "rounded-2xl border border-border/80 p-3.5 space-y-3 relative transition-all"
                                    )}
                                >
                                    {/* Task Title & Delete */}
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-lg bg-primary/12 border border-primary/25 text-primary text-xs font-black flex items-center justify-center shrink-0">
                                            {index + 1}
                                        </div>

                                        <Input
                                            value={task.task_description}
                                            onChange={(e) => handleUpdateTask(task.id, { task_description: e.target.value })}
                                            placeholder={isArabic ? `اسم المهمة (مثلاً: حل 3 مسائل برمجية، ركض 5 كم...)` : `Task ${index + 1} description...`}
                                            className="h-10 rounded-xl font-bold text-sm bg-background/80 border-border/80 focus:border-primary flex-1"
                                            dir={isArabic ? 'rtl' : 'ltr'}
                                        />

                                        <button
                                            type="button"
                                            onClick={() => handleDeleteTask(task.id)}
                                            className="w-8 h-8 rounded-lg text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                                            title={isArabic ? 'حذف المهمة' : 'Delete Task'}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Controls: Frequency & Time presets */}
                                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                                        {/* Frequency */}
                                        <div className="flex items-center gap-0.5 bg-muted/60 p-0.5 rounded-xl border border-border/60">
                                            <button
                                                type="button"
                                                onClick={() => handleUpdateTask(task.id, { frequency: 'daily' })}
                                                className={cn(
                                                    "text-xs font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer",
                                                    task.frequency === 'daily'
                                                        ? "bg-card text-foreground shadow-2xs font-extrabold"
                                                        : "text-muted-foreground hover:text-foreground"
                                                )}
                                            >
                                                {isArabic ? 'يومي' : 'Daily'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleUpdateTask(task.id, { frequency: 'weekly' })}
                                                className={cn(
                                                    "text-xs font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer",
                                                    task.frequency === 'weekly'
                                                        ? "bg-card text-foreground shadow-2xs font-extrabold"
                                                        : "text-muted-foreground hover:text-foreground"
                                                )}
                                            >
                                                {isArabic ? 'أسبوعي' : 'Weekly'}
                                            </button>
                                        </div>

                                        {/* Time presets */}
                                        <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/60 text-xs">
                                            <Clock className="w-3 h-3 text-muted-foreground ms-1 shrink-0" />
                                            {TIME_PRESETS.map((m) => (
                                                <button
                                                    key={m}
                                                    type="button"
                                                    onClick={() => handleUpdateTask(task.id, { time_required_minutes: m })}
                                                    className={cn(
                                                        "px-1.5 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer",
                                                        task.time_required_minutes === m
                                                            ? "bg-primary text-primary-foreground shadow-2xs"
                                                            : "text-muted-foreground hover:text-foreground"
                                                    )}
                                                >
                                                    {m}{isArabic ? 'د' : 'm'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Days selector */}
                                    <div className="flex flex-wrap items-center gap-1">
                                        <span className="text-[10px] font-bold text-muted-foreground me-1">
                                            {isArabic ? 'الأيام:' : 'Days:'}
                                        </span>
                                        {WEEK_DAYS.map((d) => {
                                            const active = task.schedule_days
                                                ? task.schedule_days.includes(d.idx)
                                                : true;
                                            return (
                                                <button
                                                    key={d.idx}
                                                    type="button"
                                                    onClick={() => {
                                                        const all = WEEK_DAYS.map((w) => w.idx);
                                                        const current = task.schedule_days && task.schedule_days.length > 0
                                                            ? task.schedule_days
                                                            : all;
                                                        const next = current.includes(d.idx)
                                                            ? current.filter((i) => i !== d.idx)
                                                            : [...current, d.idx];
                                                        handleUpdateTask(task.id, { schedule_days: normalizeScheduleDays(next) });
                                                    }}
                                                    className={cn(
                                                        "w-6 h-6 rounded-md border text-[11px] font-bold flex items-center justify-center transition-all cursor-pointer active:scale-95",
                                                        active
                                                            ? "bg-primary/20 text-primary border-primary/40 font-black shadow-2xs"
                                                            : "bg-muted/20 border-border/60 text-muted-foreground/60 hover:border-primary/40"
                                                    )}
                                                    title={isArabic ? d.ar : d.en}
                                                >
                                                    {isArabic ? d.letterAr : d.letterEn}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* CRITERIA FIELD: Core of the user's manual benchmark */}
                                    <div className="rounded-xl border border-primary/25 bg-primary/5 p-2.5 space-y-1">
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                                            <Target className="w-3.5 h-3.5 shrink-0" />
                                            <span>{isArabic ? 'معيار الإنجاز (شرط التحقق الدقيق):' : 'Completion Criteria:'}</span>
                                        </div>
                                        <Input
                                            value={task.completion_criteria}
                                            onChange={(e) => handleUpdateTask(task.id, { completion_criteria: e.target.value })}
                                            placeholder={isArabic ? 'ما الذي يثبت اكتمال هذه المهمة بدقة؟ (مثال: إنهاء 20 صفحة بدون مقاطعة)' : 'What proves this task is completed?'}
                                            className="h-8 rounded-lg text-xs font-medium bg-background/80 border-primary/20 focus:border-primary placeholder:text-muted-foreground/50"
                                            dir={isArabic ? 'rtl' : 'ltr'}
                                        />
                                    </div>
                                </div>
                            );
                        })}

                        {/* Add Task Button */}
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleAddTask}
                            className="w-full border-dashed border-border/80 hover:border-primary/50 hover:bg-primary/5 py-3 h-auto rounded-xl font-bold text-xs gap-2"
                        >
                            <Plus className="w-4 h-4 text-primary" />
                            <span>{isArabic ? 'إضافة مهمة أخرى' : 'Add Another Task'}</span>
                        </Button>
                    </div>

                    {/* Step 3 Summary Box */}
                    <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/70 space-y-1 text-xs">
                        <div className="font-bold text-foreground flex items-center justify-between">
                            <span>{goalTitle}</span>
                            <span className="text-primary font-black">{targetPoints.toLocaleString()} {isArabic ? 'نقطة' : 'pts'}</span>
                        </div>
                        <div className="text-muted-foreground text-[11px] flex items-center gap-2">
                            <span>{formatDurationLabel(totalDays, isArabic)}</span>
                            <span>·</span>
                            <span>{tasks.filter(t => t.task_description.trim()).length} {isArabic ? 'مهام محددة' : 'tasks'}</span>
                        </div>
                    </div>

                    {/* Step 3 Actions */}
                    <div className="pt-2 flex items-center justify-between gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handlePrevStep}
                            disabled={saving}
                            className="h-11 px-5 rounded-xl font-bold"
                        >
                            {isArabic ? 'السابق' : 'Back'}
                        </Button>

                        <Button
                            type="button"
                            onClick={handleLaunchGoal}
                            disabled={saving}
                            className="h-11 px-7 rounded-xl font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 active:scale-95 transition-all"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>{isArabic ? 'جارٍ الحفظ والإطلاق...' : 'Launching...'}</span>
                                </>
                            ) : (
                                <>
                                    <Rocket className="w-4 h-4" />
                                    <span>{isArabic ? 'إطلاق الهدف والبدء' : 'Launch Goal & Start'}</span>
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            )}

            {/* Launch Celebration Modal */}
            <GoalLaunchCelebrationModal
                open={showCelebration}
                goalTitle={goalTitle.trim()}
                totalDays={totalDays}
                targetPoints={targetPoints}
                isArabic={isArabic}
                onStartDayOne={() => onComplete()}
            />
        </div>
    );
}
