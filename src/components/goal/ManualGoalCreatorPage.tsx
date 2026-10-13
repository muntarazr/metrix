'use client';

import { ArrowLeft, ArrowRight, Check, AlertCircle, X, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type Language } from '@/lib/translations';
import { persistGoalWithTaskTree } from '@/lib/goal-persistence';
import GoalLaunchCelebrationModal from './GoalLaunchCelebrationModal';
import {
    DRAFT_STORAGE_KEY,
    type ManualTaskDraft,
} from './manual/manual-goal-types';
import { useManualGoalCreatorState } from './manual/useManualGoalCreatorState';
import ManualBasicsStep from './manual/ManualBasicsStep';
import ManualDurationStep from './manual/ManualDurationStep';
import ManualTasksStep from './manual/ManualTasksStep';
import ManualReviewStep from './manual/ManualReviewStep';

export type { ManualTaskDraft };

export interface ManualGoalCreatorPageProps {
    initialGoalText?: string;
    onComplete: () => void;
    onCancel: () => void;
    onGuardStateChange?: (active: boolean) => void;
    language?: Language;
}

export default function ManualGoalCreatorPage({
    initialGoalText = '',
    onComplete,
    onCancel,
    onGuardStateChange,
    language = 'ar',
}: ManualGoalCreatorPageProps) {
    const {
        supabase,
        isArabic,
        step,
        setStep,
        draftRestored,
        handleResetDraft,
        goalTitle,
        setGoalTitle,
        goalIcon,
        setGoalIcon,
        goalDomain,
        setGoalDomain,
        customCategories,
        isAddingCategory,
        setIsAddingCategory,
        newCategoryName,
        setNewCategoryName,
        handleAddCustomCategory,
        handleDeleteCustomCategory,
        totalDays,
        setTotalDays,
        difficulty,
        setDifficulty,
        isCustomPoints,
        setIsCustomPoints,
        customPoints,
        setCustomPoints,
        tasks,
        handleAddTask,
        handleUpdateTask,
        handleDeleteTask,
        saving,
        setSaving,
        errorMessage,
        setErrorMessage,
        showCelebration,
        setShowCelebration,
        targetPoints,
        targetDateFormatted,
        handleNextStep,
        handlePrevStep,
    } = useManualGoalCreatorState(initialGoalText, onGuardStateChange, language);

    // Save Goal & Sub-layers to Supabase
    const handleLaunchGoal = async () => {
        setErrorMessage(null);

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

            await persistGoalWithTaskTree({
                supabaseClient: supabase,
                userId: user.id,
                title: trimmedTitle,
                domain: goalDomain || 'other',
                targetPoints,
                totalDays,
                icon: goalIcon || 'Target',
                tasks: validTasks,
            });

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
            className="w-full max-w-2xl mx-auto px-1 min-[380px]:px-3 sm:px-6 py-2 sm:py-6 space-y-4 sm:space-y-5 pb-6 sm:pb-24 animate-in fade-in duration-200"
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
                    {stepTitles.map((s) => {
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
                                    "flex items-center gap-2 p-2 rounded-xl transition-all text-start cursor-pointer",
                                    isActive
                                        ? "flex-[2] min-[420px]:flex-1 bg-primary/10 border border-primary/30"
                                        : "flex-1 justify-center min-[420px]:justify-start",
                                    !isActive && (isPassed ? "hover:bg-muted/40 opacity-90" : "opacity-45 pointer-events-none")
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
                                <div className={cn("min-w-0", isActive ? "block" : "hidden min-[420px]:block")}>
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

            {/* Step 1: Basics / Identity */}
            {step === 1 && (
                <ManualBasicsStep
                    goalTitle={goalTitle}
                    onGoalTitleChange={setGoalTitle}
                    goalIcon={goalIcon}
                    onGoalIconChange={setGoalIcon}
                    goalDomain={goalDomain}
                    onGoalDomainChange={setGoalDomain}
                    customCategories={customCategories}
                    isAddingCategory={isAddingCategory}
                    setIsAddingCategory={setIsAddingCategory}
                    newCategoryName={newCategoryName}
                    setNewCategoryName={setNewCategoryName}
                    onAddCustomCategory={handleAddCustomCategory}
                    onDeleteCustomCategory={handleDeleteCustomCategory}
                    onNext={handleNextStep}
                    isArabic={isArabic}
                />
            )}

            {/* Step 2: Timeline & Points */}
            {step === 2 && (
                <ManualDurationStep
                    totalDays={totalDays}
                    onTotalDaysChange={setTotalDays}
                    difficulty={difficulty}
                    onDifficultyChange={setDifficulty}
                    isCustomPoints={isCustomPoints}
                    onToggleCustomPoints={() => setIsCustomPoints(!isCustomPoints)}
                    customPoints={customPoints}
                    onCustomPointsChange={setCustomPoints}
                    targetPoints={targetPoints}
                    targetDateFormatted={targetDateFormatted}
                    onPrev={handlePrevStep}
                    onNext={handleNextStep}
                    isArabic={isArabic}
                />
            )}

            {/* Step 3: Tasks & Review/Launch */}
            {step === 3 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                    <ManualTasksStep
                        tasks={tasks}
                        onAddTask={handleAddTask}
                        onUpdateTask={handleUpdateTask}
                        onDeleteTask={handleDeleteTask}
                        isArabic={isArabic}
                    />
                    <ManualReviewStep
                        goalTitle={goalTitle}
                        targetPoints={targetPoints}
                        totalDays={totalDays}
                        tasksCount={tasks.filter((t) => t.task_description.trim()).length}
                        saving={saving}
                        onPrev={handlePrevStep}
                        onLaunch={handleLaunchGoal}
                        isArabic={isArabic}
                    />
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
