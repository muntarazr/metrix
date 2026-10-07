'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle,
    CheckCircle,
    RefreshCw,
    X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { translations, type Language } from '@/lib/translations';
import { createClient } from '@/utils/supabase/client';
import { apiUrl } from '@/lib/api';
import {
    getUnitDisplayLabel,
    getUnitOptionsForQuestion,
} from '@/components/goal/AnswerWidgets';
import type {
    GoalCreatorPageProps,
    GoalCreatorStep,
    FlatTask,
    InvestigationResult,
    PlanResult,
    DifficultyLevel,
    ApiErrorResponse,
} from './goal-creator-types';
import {
    DIFFICULTY_RATES,
    MAX_QUESTION_ROUNDS,
    additionKeyFor,
} from './goal-creator-types';
import {
    isArabicText,
    isApiErrorResponse,
    isInvestigationResult,
    isPlanResult,
    extractDurationDaysFromAnswers,
    extractFlatTasks,
} from './goal-creator-helpers';

import GoalInvestigatingStep from './GoalInvestigatingStep';
import GoalQuestionsStep from './GoalQuestionsStep';
import GoalGeneratingStep from './GoalGeneratingStep';
import GoalReviewStep from './GoalReviewStep';
import GoalLaunchCelebrationModal from './GoalLaunchCelebrationModal';

export default function GoalCreatorPage({
    initialGoalText,
    onComplete,
    onCancel,
    onGuardStateChange,
    language = 'ar',
}: GoalCreatorPageProps) {
    const supabase = createClient();
    const hasArabic = isArabicText(initialGoalText);
    const resolvedLanguage: Language = hasArabic ? 'ar' : language;
    const isArabic = resolvedLanguage === 'ar';
    const t = translations[resolvedLanguage];

    const [step, setStep] = useState<GoalCreatorStep>('INVESTIGATING');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [guardDismissed, setGuardDismissed] = useState(false);

    const [investigationResult, setInvestigationResult] = useState<InvestigationResult | null>(null);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [selectedUnits, setSelectedUnits] = useState<Record<string, string>>({});
    const [contextLog, setContextLog] = useState<Record<string, string>>({});
    const [confirming, setConfirming] = useState(false);
    const [round, setRound] = useState(0);
    const [roundCapped, setRoundCapped] = useState(false);
    const [goalSummaryText, setGoalSummaryText] = useState<string | null>(null);

    const [planResult, setPlanResult] = useState<PlanResult | null>(null);
    const [flatTasks, setFlatTasks] = useState<FlatTask[]>([]);
    const [notification, setNotification] = useState<{ type: 'error' | 'warning' | 'info'; message: string } | null>(null);
    const [refusedMessage, setRefusedMessage] = useState<string | null>(null);

    const [tunerDuration, setTunerDuration] = useState<number>(90);
    const [tunerDifficulty, setTunerDifficulty] = useState<DifficultyLevel>('medium');
    const [editableGoalTitle, setEditableGoalTitle] = useState<string>('');
    const [isReplacingTask, setIsReplacingTask] = useState(false);
    const [showCelebration, setShowCelebration] = useState(false);
    const [isAdaptingDuration, setIsAdaptingDuration] = useState(false);
    const [isRegeneratingPlan, setIsRegeneratingPlan] = useState(false);

    const tunerPoints = useMemo(
        () => Math.max(1000, tunerDuration * (DIFFICULTY_RATES[tunerDifficulty] || 100)),
        [tunerDuration, tunerDifficulty],
    );

    useEffect(() => {
        if (!editableGoalTitle && (initialGoalText || planResult?.plan?.goal_summary)) {
            setEditableGoalTitle(planResult?.plan?.goal_summary?.trim() || initialGoalText?.trim() || '');
        }
    }, [initialGoalText, planResult?.plan?.goal_summary, editableGoalTitle]);

    useEffect(() => {
        const shouldGuard = !guardDismissed && (
            step === 'QUESTIONS' ||
            step === 'GENERATING_PLAN' ||
            step === 'REVIEW'
        );
        onGuardStateChange?.(shouldGuard);
    }, [guardDismissed, onGuardStateChange, step]);

    useEffect(() => {
        return () => {
            onGuardStateChange?.(false);
        };
    }, [onGuardStateChange]);

    const handleUnitChange = useCallback((questionId: string, newUnit: string, oldUnit?: string) => {
        setSelectedUnits(prev => ({ ...prev, [questionId]: newUnit }));

        setAnswers(prev => {
            const rawVal = prev[questionId];
            const currentVal = Number(rawVal);
            if (isNaN(currentVal) || currentVal <= 0) return prev;

            const isOldMin = oldUnit === 'minutes' || (!oldUnit && newUnit === 'hours');
            const isOldHr = oldUnit === 'hours' || (!oldUnit && newUnit === 'minutes');

            if (isOldMin && newUnit === 'hours') {
                return { ...prev, [questionId]: String(currentVal >= 60 ? Math.round(currentVal / 60) : 1) };
            } else if (isOldHr && newUnit === 'minutes') {
                if (currentVal < 24) return { ...prev, [questionId]: String(currentVal * 60) };
            }

            const PERIOD_TO_DAYS: Record<string, number> = { days: 1, weeks: 7, months: 30 };
            const oldFactor = oldUnit ? PERIOD_TO_DAYS[oldUnit] : undefined;
            const newFactor = PERIOD_TO_DAYS[newUnit];
            if (oldFactor && newFactor && oldUnit !== newUnit) {
                const inDays = currentVal * oldFactor;
                const converted = Math.max(1, Math.round(inDays / newFactor));
                return { ...prev, [questionId]: String(converted) };
            }
            return prev;
        });
    }, []);

    const handleCreatePlan = useCallback(async (
        finalAnswers?: Record<string, string>,
        options?: { setGeneratingStep?: boolean; targetDeadline?: string }
    ) => {
        if (options?.setGeneratingStep) {
            setStep('GENERATING_PLAN');
        }

        setLoading(true);
        setNotification(null);

        try {
            const res = await fetch(apiUrl('/api/goal/plan'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    goal: initialGoalText,
                    answers: finalAnswers || answers,
                    structured_input: {},
                    targetDeadline: options?.targetDeadline,
                    target_deadline: options?.targetDeadline,
                }),
            });

            const data: PlanResult | ApiErrorResponse | null = await res.json().catch(() => null);
            if (!res.ok) {
                if (isApiErrorResponse(data) && data.error === 'quota_exceeded') {
                    setNotification({
                        type: 'warning',
                        message: (isArabic ? data.message_ar : data.message_en) || data.error || `HTTP ${res.status}`,
                    });
                    setStep('QUESTIONS');
                    return;
                }
                throw new Error(isApiErrorResponse(data) ? data.error || `HTTP ${res.status}` : `HTTP ${res.status}`);
            }

            if (!isPlanResult(data) || !data.plan) throw new Error('Invalid plan response');

            const explicitDays = options?.targetDeadline
                ? Math.round((new Date(options.targetDeadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : null;
            const statedDays = explicitDays && explicitDays > 0 ? explicitDays : extractDurationDaysFromAnswers(finalAnswers || answers);
            const modelDays = Number(data.plan?.estimated_total_days) || (explicitDays && explicitDays > 0 ? explicitDays : 90);
            const initialDays = explicitDays && explicitDays > 0
                ? explicitDays
                : (statedDays !== null && Math.abs(statedDays - modelDays) > Math.max(2, modelDays * 0.1)
                    ? Math.min(365, Math.max(7, statedDays))
                    : modelDays);
            if (initialDays !== modelDays) {
                data.plan.estimated_total_days = initialDays;
            }

            setPlanResult(data);
            setTunerDuration(initialDays);
            setTunerDifficulty('medium');
            setEditableGoalTitle(data.plan?.goal_summary?.trim() || initialGoalText?.trim() || '');
            setFlatTasks(extractFlatTasks(data, initialGoalText));
            setStep('REVIEW');
        } catch (error: unknown) {
            console.error(error);
            setNotification({ type: 'error', message: isArabic ? 'فشل إنشاء الخطة.' : 'Failed to create plan.' });
            setStep('QUESTIONS');
        } finally {
            setLoading(false);
        }
    }, [initialGoalText, answers, isArabic]);

    const handleInvestigate = useCallback(async (
        currentAnswers?: Record<string, string>,
        pendingStep: GoalCreatorStep = 'INVESTIGATING'
    ) => {
        setStep(pendingStep);
        setLoading(true);
        setNotification(null);
        setConfirming(false);
        setRoundCapped(false);
        setRound(r => r + 1);

        try {
            const res = await fetch(apiUrl('/api/goal/investigate'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    goal: initialGoalText,
                    context: currentAnswers || {},
                    structured_input: {},
                }),
            });

            const data: InvestigationResult | ApiErrorResponse | null = await res.json().catch(() => null);
            if (!res.ok) {
                if (isApiErrorResponse(data) && data.error === 'quota_exceeded') {
                    setNotification({
                        type: 'warning',
                        message: (isArabic ? data.message_ar : data.message_en) || data.error || `HTTP ${res.status}`,
                    });
                    setStep('QUESTIONS');
                    return;
                }
                throw new Error(isApiErrorResponse(data) ? data.error || `HTTP ${res.status}` : `HTTP ${res.status}`);
            }

            if (!isInvestigationResult(data)) {
                throw new Error('Invalid investigation response');
            }

            setInvestigationResult(data);

            const summary = data.goal_understanding?.goal_summary?.trim();
            if (summary) setGoalSummaryText(summary);

            if (data.status === 'refused') {
                setGuardDismissed(true);
                setRefusedMessage(data.safe_redirection?.message || (isArabic ? 'تم رفض الهدف لأسباب تتعلق بالسلامة.' : 'Goal refused for safety reasons.'));
                return;
            }

            setAnswers({});
            setSelectedUnits({});

            const hasQuestions = Array.isArray(data.questions) && data.questions.length > 0;
            if (!hasQuestions || data.goal_understanding?.readiness === 'ready_for_plan') {
                setConfirming(true);
                setStep('QUESTIONS');
                return;
            }

            setConfirming(false);
            setStep('QUESTIONS');
        } catch (error: unknown) {
            console.error(error);
            setNotification({ type: 'error', message: isArabic ? 'فشل تحليل الهدف.' : 'Failed to analyze goal.' });
            setStep('QUESTIONS');
        } finally {
            setLoading(false);
        }
    }, [initialGoalText, isArabic]);

    useEffect(() => {
        void handleInvestigate();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const submitAnswers = useCallback(() => {
        const roundAnswers: Record<string, string> = {};
        if (investigationResult?.questions) {
            for (const q of investigationResult.questions) {
                const rawVal = answers[q.id]?.trim();
                if (rawVal !== undefined && rawVal !== '') {
                    const unitOptions = getUnitOptionsForQuestion(q.unit, q.question);
                    const defaultUnit = unitOptions[0]?.value || q.unit || '';
                    const chosenUnit = selectedUnits[q.id] || defaultUnit;
                    const unitLabel = chosenUnit ? getUnitDisplayLabel(chosenUnit, isArabic) : '';

                    const formattedAnswer = (q.type === 'number' && unitLabel && /^-?\d+(?:\.\d+)?$/.test(rawVal))
                        ? `${rawVal} ${unitLabel}`
                        : rawVal;
                    roundAnswers[q.question] = formattedAnswer;
                }
            }
        }

        const mergedContext = { ...contextLog, ...roundAnswers };
        setContextLog(mergedContext);

        if (round >= MAX_QUESTION_ROUNDS) {
            setRoundCapped(true);
            setConfirming(true);
            setStep('QUESTIONS');
            return;
        }

        void handleInvestigate(mergedContext, 'QUESTIONS');
    }, [answers, contextLog, handleInvestigate, investigationResult?.questions, isArabic, round, selectedUnits]);

    const handleSkipToPlan = useCallback(() => {
        const roundAnswers: Record<string, string> = {};
        if (investigationResult?.questions) {
            for (const q of investigationResult.questions) {
                const rawVal = answers[q.id]?.trim();
                if (rawVal) roundAnswers[q.question] = rawVal;
            }
        }
        const mergedContext = { ...contextLog, ...roundAnswers };
        setContextLog(mergedContext);
        void handleCreatePlan(mergedContext, { setGeneratingStep: true });
    }, [answers, contextLog, handleCreatePlan, investigationResult?.questions]);

    const sendAddition = useCallback((addition: string) => {
        if (!addition.trim()) return;

        const baseKey = additionKeyFor(isArabic);
        let key = baseKey;
        let n = 2;
        while (key in contextLog) {
            key = `${baseKey} ${n}`;
            n += 1;
        }

        const mergedContext = { ...contextLog, [key]: addition.trim() };
        setContextLog(mergedContext);
        void handleInvestigate(mergedContext, 'QUESTIONS');
    }, [contextLog, handleInvestigate, isArabic]);

    const handleReplaceTask = async (taskId: string, reason: string, note: string) => {
        const taskToReplace = flatTasks.find(t => t.id === taskId);
        if (!taskToReplace) return;

        setIsReplacingTask(true);
        try {
            const res = await fetch(apiUrl('/api/goal/replace-task'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    goalTitle: editableGoalTitle.trim() || initialGoalText.trim(),
                    currentTask: taskToReplace,
                    reason,
                    userNote: note,
                    allTasks: flatTasks,
                    otherTasks: flatTasks.filter(t => t.id !== taskId).map(t => t.task),
                }),
            });

            const data = await res.json().catch(() => null);
            if (!res.ok) throw new Error(data?.message_ar || data?.error || `HTTP ${res.status}`);

            if (Array.isArray(data?.tasks) && data.tasks.length > 0) {
                setFlatTasks(data.tasks.map((t: any, idx: number) => ({
                    id: t.id || `task_${idx + 1}`,
                    task: t.task,
                    completion_criteria: t.completion_criteria || '',
                    time_required_minutes: Number(t.time_required_minutes) || 20,
                    frequency: t.frequency === 'weekly' ? 'weekly' : 'daily',
                    schedule_days: t.schedule_days ?? null,
                    impact_weight: Number(t.impact_weight) || 3,
                    included: true,
                })));

                setNotification({
                    type: 'info',
                    message: data.explanation || (isArabic ? 'تمت إعادة موازنة وترتيب جميع المهام وفق توجيهك بنجاح.' : 'Tasks rebalanced successfully per your direction.'),
                });
            } else if (data?.task) {
                setFlatTasks(prev => prev.map(t => t.id === taskId ? {
                    ...t,
                    task: data.task,
                    completion_criteria: data.completion_criteria || t.completion_criteria,
                    time_required_minutes: data.time_required_minutes || t.time_required_minutes,
                    frequency: data.frequency || t.frequency,
                    impact_weight: data.impact_weight || t.impact_weight,
                } : t));

                setNotification({
                    type: 'info',
                    message: data.explanation || (isArabic ? 'تم استبدال المهمة بنجاح وفق رغبتك وملاحظاتك.' : 'Task replaced successfully per your notes.'),
                });
            }
        } catch (err: unknown) {
            console.error('Error replacing task:', err);
            setNotification({
                type: 'error',
                message: isArabic ? 'تعذر استبدال المهمة حالياً، حاول مرة أخرى.' : 'Could not replace task, please try again.',
            });
        } finally {
            setIsReplacingTask(false);
        }
    };

    const handleAdaptTasksToDuration = async (newDuration: number) => {
        setIsAdaptingDuration(true);
        try {
            const targetDeadline = new Date(Date.now() + newDuration * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const updatedContext = {
                ...contextLog,
                'المدة الزمنية المطلوب تكييف وتوزيع المهام معها': `${newDuration} يوم`,
            };
            setContextLog(updatedContext);
            setTunerDuration(newDuration);
            await handleCreatePlan(updatedContext, {
                targetDeadline,
                setGeneratingStep: false,
            });
            setNotification({
                type: 'info',
                message: isArabic
                    ? `تم تكييف وتوزيع المهام بذكاء لتناسب مدة ${newDuration} يوم بنجاح.`
                    : `Tasks adapted to ${newDuration} days successfully.`,
            });
        } catch (err) {
            console.error('Adapt tasks error:', err);
            setNotification({
                type: 'error',
                message: isArabic ? 'تعذر تكييف المهام للمدة الجديدة.' : 'Failed to adapt tasks to duration.',
            });
        } finally {
            setIsAdaptingDuration(false);
        }
    };

    const handleRegenerateWithDirection = async (direction: string) => {
        setIsRegeneratingPlan(true);
        try {
            const updatedContext = {
                ...contextLog,
                'توجيه إضافي حاسم لتعديل مسار الخطة': direction,
            };
            setContextLog(updatedContext);
            await handleCreatePlan(updatedContext, {
                setGeneratingStep: true,
            });
        } finally {
            setIsRegeneratingPlan(false);
        }
    };

    const handleSave = async () => {
        if (!planResult) return;
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const targetPoints = tunerPoints;
            const totalDays = tunerDuration;
            const adjustedCompletionDate = new Date(Date.now() + totalDays * 24 * 60 * 60 * 1000).toISOString();

            const goalTitle = editableGoalTitle.trim() || planResult.plan?.goal_summary || initialGoalText.trim();
            const goalSummary = planResult.ai_summary || '';

            const { data: goalData, error: goalError } = await supabase
                .from('goals')
                .insert({
                    user_id: user.id,
                    title: goalTitle,
                    domain: investigationResult?.goal_understanding?.domain || 'other',
                    target_points: targetPoints,
                    current_points: 0,
                    estimated_completion_date: adjustedCompletionDate,
                    total_days: totalDays,
                    ai_summary: goalSummary,
                    status: 'active',
                })
                .select()
                .single();

            if (goalError) {
                console.error('Goal insert failed:', JSON.stringify(goalError), goalError);
                throw new Error(goalError.message || goalError.details || 'فشل إدراج الهدف في قاعدة البيانات');
            }

            const activeTasks = flatTasks.filter(t => t.included);
            const tasksToProcess = activeTasks.length > 0 ? activeTasks : flatTasks;

            const subRows = tasksToProcess.map((task, index) => ({
                goal_id: goalData.id,
                task_description: task.task.trim() || `Task ${index + 1}`,
                frequency: task.frequency === 'weekly' ? 'weekly' : 'daily',
                schedule_days: task.schedule_days && task.schedule_days.length > 0 ? task.schedule_days : null,
                impact_weight: Math.max(1, Math.min(5, Number(task.impact_weight) || 1)),
                completion_criteria: task.completion_criteria.trim() || '',
                time_required_minutes: Math.max(5, Number(task.time_required_minutes) || 20),
                task_type: 'main',
                parent_task_id: null,
                sort_order: index,
            }));

            if (subRows.length > 0) {
                let { error: subError } = await supabase.from('sub_layers').insert(subRows);
                if (subError && (subError.message || '').includes('schedule_days')) {
                    const fallbackRows = subRows.map((row) => {
                        const { schedule_days, ...rest } = row;
                        return rest;
                    });
                    ({ error: subError } = await supabase.from('sub_layers').insert(fallbackRows));
                }
                if (subError) {
                    console.error('Sub_layers insert failed:', JSON.stringify(subError), subError);
                    // Rollback inserted goal to avoid leaving an orphaned empty goal
                    await supabase.from('goals').delete().eq('id', goalData.id);
                    throw new Error(subError.message || subError.details || 'فشل إدراج المهام في قاعدة البيانات');
                }
            }

            setNotification({ type: 'info', message: isArabic ? 'تم إنشاء الهدف بنجاح.' : 'Goal created successfully.' });
            setGuardDismissed(true);
            setShowCelebration(true);
        } catch (error: unknown) {
            const errObj = error as Record<string, unknown> | null;
            const message = error instanceof Error
                ? error.message
                : (errObj?.message ? String(errObj.message) : (errObj?.details ? String(errObj.details) : (errObj?.error_description ? String(errObj.error_description) : JSON.stringify(error))));
            console.error('Save goal caught error:', message, error);
            setNotification({ type: 'error', message: `${isArabic ? 'فشل الحفظ' : 'Save failed'}: ${message}` });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="w-full flex-1 flex flex-col justify-center min-h-[calc(100vh-140px)] py-6 px-4">
            {/* Global Notification Banner */}
            {notification && (
                <div className={cn(
                    "w-full max-w-2xl mx-auto mb-4 p-3.5 rounded-xl flex items-start gap-3 border shadow-xs animate-in fade-in duration-200",
                    notification.type === 'error'
                        ? 'bg-destructive/12 border-destructive/25 text-destructive'
                        : notification.type === 'warning'
                            ? 'bg-foreground/12 border-foreground/25 text-foreground'
                            : 'bg-primary/12 border-primary/25 text-primary'
                )}>
                    {notification.type === 'error' ? (
                        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    ) : (
                        <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    )}
                    <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <p className="text-sm font-medium leading-relaxed">{notification.message}</p>
                        {notification.type === 'error' && (
                            <button
                                type="button"
                                onClick={() => {
                                    setNotification(null);
                                    if (step === 'QUESTIONS') submitAnswers();
                                    else if (step === 'REVIEW') handleSave();
                                    else handleInvestigate();
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors w-fit shrink-0 cursor-pointer"
                            >
                                <RefreshCw className="w-3 h-3" />
                                <span>{isArabic ? 'إعادة المحاولة' : 'Retry'}</span>
                            </button>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => setNotification(null)}
                        className="shrink-0 p-1 hover:opacity-75 transition-opacity cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Step Switcher */}
            {step === 'INVESTIGATING' && (
                <GoalInvestigatingStep
                    initialGoalText={initialGoalText}
                    isArabic={isArabic}
                    refusedMessage={refusedMessage}
                    onCancel={onCancel}
                />
            )}

            {step === 'QUESTIONS' && investigationResult && (
                <GoalQuestionsStep
                    initialGoalText={initialGoalText}
                    isArabic={isArabic}
                    investigationResult={investigationResult}
                    answers={answers}
                    selectedUnits={selectedUnits}
                    contextLog={contextLog}
                    round={round}
                    roundCapped={roundCapped}
                    goalSummaryText={goalSummaryText}
                    confirming={confirming}
                    loading={loading}
                    onAnswerChange={(qId, val) => setAnswers(prev => ({ ...prev, [qId]: val }))}
                    onUnitChange={handleUnitChange}
                    onSubmitAnswers={submitAnswers}
                    onSkipToPlan={handleSkipToPlan}
                    onSendAddition={sendAddition}
                    onCreatePlan={() => handleCreatePlan(contextLog, { setGeneratingStep: true })}
                />
            )}

            {step === 'GENERATING_PLAN' && (
                <GoalGeneratingStep
                    initialGoalText={initialGoalText}
                    isArabic={isArabic}
                    goalSummaryText={goalSummaryText}
                />
            )}

            {step === 'REVIEW' && planResult && (
                <GoalReviewStep
                    editableGoalTitle={editableGoalTitle}
                    onTitleChange={setEditableGoalTitle}
                    aiSummary={planResult.ai_summary}
                    initialPlanDuration={planResult.plan?.estimated_total_days || tunerDuration}
                    tunerDuration={tunerDuration}
                    onDurationChange={setTunerDuration}
                    onAdaptTasksToDuration={handleAdaptTasksToDuration}
                    isAdaptingDuration={isAdaptingDuration}
                    onRegenerateWithDirection={handleRegenerateWithDirection}
                    isRegeneratingPlan={isRegeneratingPlan}
                    tunerPoints={tunerPoints}
                    flatTasks={flatTasks}
                    onUpdateFlatTask={(id, patch) => setFlatTasks(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t))}
                    onDeleteFlatTask={(id) => setFlatTasks(prev => prev.filter(t => t.id !== id))}
                    onAddFlatTask={() => setFlatTasks(prev => [...prev, {
                        id: `custom_${Date.now()}`,
                        task: '',
                        frequency: 'daily',
                        impact_weight: 3,
                        time_required_minutes: 25,
                        completion_criteria: '',
                        included: true,
                    }])}
                    onReplaceTask={handleReplaceTask}
                    isReplacingTask={isReplacingTask}
                    saving={saving}
                    isArabic={isArabic}
                    acceptStartJourneyText={t.acceptStartJourney}
                    onBackToQuestions={() => setStep('QUESTIONS')}
                    onSave={handleSave}
                />
            )}

            {/* Launch Celebration Modal */}
            <GoalLaunchCelebrationModal
                open={showCelebration}
                goalTitle={editableGoalTitle.trim() || initialGoalText.trim()}
                totalDays={tunerDuration}
                targetPoints={tunerPoints}
                isArabic={isArabic}
                onStartDayOne={() => onComplete()}
            />
        </div>
    );
}
