'use client';

import { useState } from 'react';
import {
    Loader2,
    Target,
    Edit3,
    CalendarDays,
    Repeat,
    ListTodo,
    Clock,
    Zap,
    Plus,
    Check,
    Trash2,
    RefreshCw,
    ArrowLeft,
    ArrowRight,
    Sparkles,
    MessageSquarePlus,
    X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PANEL_SURFACE } from "@/lib/surfaces";
import { Slider } from '@/components/ui/slider';
import type { FlatTask } from './goal-creator-types';
import { WEEK_DAYS } from './goal-creator-types';
import {
    formatDurationLabel,
    normalizeScheduleDays,
} from './goal-creator-helpers';
import TaskReplaceDialog from './TaskReplaceDialog';
import ReviewTaskCard from './ReviewTaskCard';

interface GoalReviewStepProps {
    editableGoalTitle: string;
    onTitleChange: (title: string) => void;
    aiSummary?: string;
    initialPlanDuration?: number;
    tunerDuration: number;
    onDurationChange: (duration: number) => void;
    onAdaptTasksToDuration?: (duration: number) => Promise<void>;
    isAdaptingDuration?: boolean;
    tunerPoints: number;
    flatTasks: FlatTask[];
    onUpdateFlatTask: (id: string, patch: Partial<FlatTask>) => void;
    onDeleteFlatTask: (id: string) => void;
    onAddFlatTask: () => void;
    onReplaceTask: (taskId: string, reason: string, note: string) => Promise<void>;
    isReplacingTask?: boolean;
    onRegenerateWithDirection?: (direction: string) => Promise<void>;
    isRegeneratingPlan?: boolean;
    saving: boolean;
    isArabic: boolean;
    acceptStartJourneyText?: string;
    onBackToQuestions: () => void;
    onSave: () => void;
}

export default function GoalReviewStep({
    editableGoalTitle,
    onTitleChange,
    aiSummary,
    initialPlanDuration,
    tunerDuration,
    onDurationChange,
    onAdaptTasksToDuration,
    isAdaptingDuration = false,
    tunerPoints,
    flatTasks,
    onUpdateFlatTask,
    onDeleteFlatTask,
    onAddFlatTask,
    onReplaceTask,
    isReplacingTask = false,
    onRegenerateWithDirection,
    isRegeneratingPlan = false,
    saving,
    isArabic,
    acceptStartJourneyText,
    onBackToQuestions,
    onSave,
}: GoalReviewStepProps) {
    const [replaceModalTask, setReplaceModalTask] = useState<FlatTask | null>(null);
    const [showDirectionModal, setShowDirectionModal] = useState(false);
    const [customDirection, setCustomDirection] = useState('');

    const dailyTasksCount = flatTasks.filter(t => t.included && t.frequency === 'daily').length;
    const weeklyTasksCount = flatTasks.filter(t => t.included && t.frequency === 'weekly').length;

    const handleConfirmReplace = async (reason: string, customNote: string) => {
        if (!replaceModalTask) return;
        await onReplaceTask(replaceModalTask.id, reason, customNote);
        setReplaceModalTask(null);
    };

    const handleSendRegenerate = async () => {
        if (!customDirection.trim() || !onRegenerateWithDirection) return;
        await onRegenerateWithDirection(customDirection.trim());
        setShowDirectionModal(false);
        setCustomDirection('');
    };

    // Has user adjusted the duration from what the plan originally generated?
    const isDurationChanged = initialPlanDuration && initialPlanDuration !== tunerDuration;

    return (
        <div
            className="w-full max-w-2xl mx-auto my-auto space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300"
            dir={isArabic ? 'rtl' : 'ltr'}
        >
            {/* Plan Header & Duration Tuner Panel */}
            <div className="rounded-2xl border border-primary/25 bg-card shadow-lg transition-all duration-300 hover:shadow-xl hover:border-primary/40 p-4 sm:p-5 space-y-4 relative overflow-hidden">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/12 border border-primary/25 flex items-center justify-center shrink-0">
                        <Target className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 group/title">
                            <input
                                value={editableGoalTitle}
                                onChange={(e) => onTitleChange(e.target.value)}
                                className="w-full bg-transparent border border-transparent hover:border-border/60 focus:border-primary/40 hover:bg-muted/20 focus:bg-muted/30 rounded-lg px-2 py-0.5 outline-hidden font-bold text-lg text-foreground leading-snug truncate transition-all text-start"
                                dir={isArabic ? 'rtl' : 'ltr'}
                                placeholder={isArabic ? 'اسم الهدف...' : 'Goal title...'}
                                title={editableGoalTitle}
                            />
                            <Edit3 className="w-4 h-4 text-muted-foreground/40 group-hover/title:text-muted-foreground/80 shrink-0 pointer-events-none transition-colors" />
                        </div>
                        {aiSummary && (
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed px-2 line-clamp-2">
                                {aiSummary}
                            </p>
                        )}
                    </div>
                </div>

                <hr className="border-border/70" />

                {/* Plan Tuner (Duration Slider & Realistic Points) */}
                <div className="space-y-3">
                    {/* Row 1 — plan stats */}
                    <div className="flex flex-col items-center gap-1.5 rounded-xl bg-muted/40 border border-border/60 px-3.5 py-2.5 text-center sm:flex-row sm:justify-between sm:gap-x-4 sm:py-2 sm:text-start">
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 text-[11px] text-muted-foreground">
                            <CalendarDays className="size-3.5 shrink-0" />
                            <span className="font-semibold text-foreground tabular-nums">{formatDurationLabel(tunerDuration, isArabic)}</span>
                            <span className="opacity-50">·</span>
                            <span className="tabular-nums">
                                {new Date(Date.now() + tunerDuration * 24 * 60 * 60 * 1000).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', {
                                    year: 'numeric', month: 'short', day: 'numeric',
                                })}
                            </span>
                        </div>
                        <span className="flex items-center gap-3 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <Repeat className="size-3.5 text-primary" />
                                <span className="font-semibold text-foreground tabular-nums">{dailyTasksCount}</span>
                                {isArabic ? 'يومية' : 'daily'}
                            </span>
                            <span className="flex items-center gap-1">
                                <ListTodo className="size-3.5 text-muted-foreground" />
                                <span className="font-semibold text-foreground tabular-nums">{weeklyTasksCount}</span>
                                {isArabic ? 'أسبوعية' : 'weekly'}
                            </span>
                        </span>
                    </div>

                    {/* Row 2 — Continuous Duration Slider (3 to 365 days) */}
                    <div className="flex items-center gap-3">
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                            <Clock className="size-4 text-muted-foreground shrink-0" />
                            <Slider
                                min={3}
                                max={365}
                                step={1}
                                value={[tunerDuration]}
                                onValueChange={([val]) => onDurationChange(val)}
                                className="flex-1 [&_[data-slot=slider-thumb]]:size-5"
                                aria-label={isArabic ? 'المدة الزمنية للهدف' : 'Goal timeline'}
                            />
                        </div>

                        <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-primary/25 bg-primary/8 px-3 py-1 shadow-2xs">
                            <Zap className="size-3.5 shrink-0 text-primary" />
                            <span className="text-sm font-black tracking-tight text-primary tabular-nums">
                                {tunerPoints.toLocaleString()}
                            </span>
                            <span className="text-[10px] font-semibold text-primary/75">
                                {isArabic ? 'نقطة' : 'pts'}
                            </span>
                        </div>
                    </div>

                    {/* Duration Adaptation Button - When duration is adjusted */}
                    {isDurationChanged && onAdaptTasksToDuration && (
                        <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-primary/30 bg-primary/10 animate-in fade-in">
                            <span className="text-xs text-foreground font-medium">
                                {isArabic
                                    ? `تم تغيير مدة الهدف إلى ${formatDurationLabel(tunerDuration, true)}. هل ترغب في إعادة تكييف المهام؟`
                                    : `Target duration changed to ${formatDurationLabel(tunerDuration, false)}. Adapt tasks?`}
                            </span>
                            <button
                                type="button"
                                onClick={() => onAdaptTasksToDuration(tunerDuration)}
                                disabled={isAdaptingDuration}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all shrink-0 cursor-pointer shadow-xs"
                            >
                                <Sparkles className={cn("w-3.5 h-3.5", isAdaptingDuration && "animate-spin")} />
                                <span>{isArabic ? 'تكييف المهام مع المدة الجديدة' : 'Adapt Tasks to Duration'}</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Flat Actionable Tasks List */}
            <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                    <div>
                        <p className="text-sm font-bold text-foreground">
                            {isArabic ? 'المهام التنفيذية المباشرة:' : 'Direct Actionable Tasks:'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {isArabic
                                ? 'كل مهمة محددة بمعيار إنجاز ووقت تقديري، ويمكنك استبدال أي مهمة برأيك الخاص'
                                : 'Each task has concrete criteria and minutes. Replace any task with your note.'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onAddFlatTask}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{isArabic ? 'إضافة مهمة' : 'Add Task'}</span>
                    </button>
                </div>

                {flatTasks.map((task, idx) => (
                    <ReviewTaskCard
                        key={task.id || idx}
                        task={task}
                        index={idx}
                        isArabic={isArabic}
                        isReplacingTask={isReplacingTask}
                        onUpdate={onUpdateFlatTask}
                        onDelete={onDeleteFlatTask}
                        onRequestReplace={setReplaceModalTask}
                    />
                ))}
            </div>

            {/* Bottom Action Bar */}
            <div className={cn("flex flex-wrap items-center justify-between gap-3 pt-3", isArabic ? "flex-row-reverse" : "flex-row")}>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={onBackToQuestions}
                        disabled={saving}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border text-muted-foreground hover:text-foreground text-sm font-semibold transition-all hover:bg-muted/40 cursor-pointer"
                    >
                        {isArabic ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                        <span>{isArabic ? 'العودة للأسئلة' : 'Back to questions'}</span>
                    </button>

                    {onRegenerateWithDirection && (
                        <button
                            type="button"
                            onClick={() => setShowDirectionModal(true)}
                            disabled={saving || isRegeneratingPlan}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-primary/25 bg-primary/5 text-primary hover:bg-primary/10 text-xs sm:text-sm font-semibold transition-all cursor-pointer"
                            title={isArabic ? 'إعادة توليد مسودة الخطة بتوجيه جديد' : 'Regenerate plan with new direction'}
                        >
                            <Sparkles className={cn("w-3.5 h-3.5", isRegeneratingPlan && "animate-spin")} />
                            <span>{isArabic ? 'إعادة التوليد بتوجيه جديد' : 'Regenerate with Direction'}</span>
                        </button>
                    )}
                </div>

                <button
                    onClick={onSave}
                    disabled={saving || (flatTasks.filter(t => t.included).length === 0)}
                    className="flex shrink-0 items-center gap-2 px-6 py-3 rounded-xl bg-foreground text-background text-sm font-bold disabled:opacity-50 transition-all hover:opacity-90 shadow-md cursor-pointer active:scale-[0.98]"
                >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    <Zap className="w-4 h-4" />
                    <span>{acceptStartJourneyText || (isArabic ? 'اعتماد الخطة وبدء الرحلة' : 'Accept Plan & Start Journey')}</span>
                </button>
            </div>

            {/* Task Replace Dialog Modal */}
            <TaskReplaceDialog
                open={Boolean(replaceModalTask)}
                taskTitle={replaceModalTask?.task || ''}
                language={isArabic ? 'ar' : 'en'}
                isSubmitting={isReplacingTask}
                onClose={() => setReplaceModalTask(null)}
                onConfirm={handleConfirmReplace}
            />

            {/* Regenerate With Direction Modal */}
            {showDirectionModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-200">
                    <div
                        className="w-full max-w-md rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xl space-y-4"
                        dir={isArabic ? 'rtl' : 'ltr'}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                                    <MessageSquarePlus className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-base text-foreground leading-snug">
                                        {isArabic ? 'إعادة التوليد بتوجيه جديد' : 'Regenerate Plan with New Direction'}
                                    </h3>
                                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5 font-medium">
                                        {isArabic ? 'اكتب ملاحظتك لإعادة ضبط مسار الخطة بالكامل' : 'Write guidance to reshape the entire plan'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowDirectionModal(false)}
                                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <textarea
                            value={customDirection}
                            onChange={(e) => setCustomDirection(e.target.value)}
                            placeholder={
                                isArabic
                                    ? 'مثلاً: ركز أكثر على التمارين المنزلية، أو خفف ساعات التعلم في أيام الأسبوع، أو غير الأسلوب ليكون أسهل...'
                                    : 'E.g., focus more on home workouts, or reduce study time on weekdays...'
                            }
                            rows={4}
                            autoFocus
                            className="w-full text-xs sm:text-sm rounded-xl border border-border/80 bg-muted/20 px-3.5 py-3 text-foreground placeholder:text-muted-foreground/60 focus:outline-hidden focus:border-primary/60 focus:bg-background resize-none leading-relaxed transition-all"
                        />

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                            <button
                                type="button"
                                onClick={() => setShowDirectionModal(false)}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                            >
                                {isArabic ? 'إلغاء' : 'Cancel'}
                            </button>
                            <button
                                type="button"
                                onClick={handleSendRegenerate}
                                disabled={!customDirection.trim() || isRegeneratingPlan}
                                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs flex items-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
                            >
                                <Sparkles className={cn("w-3.5 h-3.5", isRegeneratingPlan && "animate-spin")} />
                                <span>{isArabic ? 'إعادة توليد الخطة' : 'Regenerate Plan'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
