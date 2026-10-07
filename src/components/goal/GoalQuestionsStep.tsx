'use client';

import { useState } from 'react';
import {
    Loader2,
    ArrowLeft,
    ArrowRight,
    Sparkles,
    Send,
    Plus,
    FastForward,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PANEL_SURFACE } from "@/lib/surfaces";
import {
    AnswerControl,
    getUnitOptionsForQuestion,
} from '@/components/goal/AnswerWidgets';
import type {
    InvestigationResult,
    InvestigationQuestion,
} from './goal-creator-types';
import { MAX_QUESTION_ROUNDS } from './goal-creator-types';

interface GoalQuestionsStepProps {
    initialGoalText: string;
    isArabic: boolean;
    investigationResult: InvestigationResult;
    answers: Record<string, string>;
    selectedUnits: Record<string, string>;
    contextLog: Record<string, string>;
    round: number;
    roundCapped: boolean;
    goalSummaryText: string | null;
    confirming: boolean;
    loading: boolean;
    onAnswerChange: (questionId: string, value: string) => void;
    onUnitChange: (questionId: string, newUnit: string, oldUnit?: string) => void;
    onSubmitAnswers: () => void;
    onSkipToPlan: () => void;
    onSendAddition: (text: string) => void;
    onCreatePlan: () => void;
}

export default function GoalQuestionsStep({
    initialGoalText,
    isArabic,
    investigationResult,
    answers,
    selectedUnits,
    contextLog,
    round,
    roundCapped,
    goalSummaryText,
    confirming,
    loading,
    onAnswerChange,
    onUnitChange,
    onSubmitAnswers,
    onSkipToPlan,
    onSendAddition,
    onCreatePlan,
}: GoalQuestionsStepProps) {
    const [additionText, setAdditionText] = useState('');
    const [showAddition, setShowAddition] = useState(false);

    // ─── Final confirmation screen ("هل عندك إضافة أخرى؟") ─────────────
    if (confirming) {
        const summaryEntries = Object.entries(contextLog);
        const displaySummary = investigationResult.goal_understanding?.goal_summary?.trim() || goalSummaryText;

        return (
            <div
                className="w-full max-w-2xl mx-auto my-auto space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300"
                dir={isArabic ? 'rtl' : 'ltr'}
            >
                {/* Goal echo */}
                <div className={cn(PANEL_SURFACE, "rounded-2xl px-5 py-4")}>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                        {isArabic ? 'هدفك' : 'Your goal'}
                    </p>
                    <p className="text-sm font-semibold text-foreground leading-snug">
                        {initialGoalText}
                    </p>
                </div>

                {/* The question */}
                <div className="rounded-2xl border border-primary/25 bg-primary/12 px-5 py-4 space-y-2">
                    <p className="flex items-center gap-2 text-base font-bold text-foreground">
                        <Sparkles className="w-4 h-4 text-primary shrink-0" />
                        {isArabic ? 'هل عندك أي تفاصيل أو إضافة أخرى؟' : 'Anything else to add?'}
                    </p>
                    {displaySummary && (
                        <p className="text-sm text-foreground/75 leading-relaxed">{displaySummary}</p>
                    )}
                    {roundCapped && (
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                            {isArabic
                                ? `وصلنا لأقصى عدد من الأسئلة (${MAX_QUESTION_ROUNDS} جولات) — راجع إجاباتك ثم أنشئ الخطة.`
                                : `We reached the maximum number of question rounds (${MAX_QUESTION_ROUNDS}) — review your answers, then create the plan.`}
                        </p>
                    )}
                </div>

                {/* Everything collected */}
                <div className={cn(PANEL_SURFACE, "rounded-2xl px-5 py-4 space-y-3")}>
                    <p className="text-xs font-medium text-muted-foreground">
                        {isArabic
                            ? `ملخص إجاباتك السابقة (${summaryEntries.length})`
                            : `Your answers summary (${summaryEntries.length})`}
                    </p>
                    {summaryEntries.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            {isArabic ? 'لم تُجب عن أي سؤال بعد.' : 'No answers collected yet.'}
                        </p>
                    ) : (
                        <ul className="space-y-2.5 max-h-72 overflow-y-auto pe-1">
                            {summaryEntries.map(([question, answer]) => (
                                <li
                                    key={question}
                                    className="flex flex-col gap-0.5 pb-2.5 border-b border-border/50 last:border-0 last:pb-0"
                                >
                                    <span className="text-xs text-muted-foreground leading-relaxed">{question}</span>
                                    <span className="text-sm font-semibold text-foreground leading-snug">{answer}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={onCreatePlan}
                        disabled={loading}
                        className="flex items-center justify-center gap-2 px-5 py-4 rounded-2xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all duration-150 disabled:opacity-50 cursor-pointer active:scale-[0.98]"
                    >
                        {loading
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : (isArabic ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />)}
                        {isArabic ? 'جاهز، أنشئ الخطة الآن' : 'Ready, create the plan now'}
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowAddition((v) => !v)}
                        disabled={loading}
                        className="flex items-center justify-center gap-2 px-5 py-4 rounded-2xl border border-border bg-muted/60 text-sm font-bold text-foreground hover:bg-muted hover:border-primary/45 transition-all duration-150 disabled:opacity-50 cursor-pointer active:scale-[0.98]"
                    >
                        <Plus className="w-4 h-4" />
                        {isArabic ? 'نعم، أريد إضافة تفاصيل' : 'Yes, I want to add details'}
                    </button>
                </div>

                {showAddition && (
                    <div className={cn(PANEL_SURFACE, "rounded-2xl px-5 py-4 space-y-3 animate-in fade-in")}>
                        <textarea
                            rows={3}
                            value={additionText}
                            onChange={(e) => setAdditionText(e.target.value)}
                            autoFocus
                            className="w-full p-3 rounded-xl border border-border bg-background text-base sm:text-sm outline-hidden focus:border-primary/45 resize-none"
                            placeholder={isArabic ? 'اكتب إضافتك عن الأدوات أو ظروفك الخاصة...' : 'Type details about your tools or conditions...'}
                            dir={isArabic ? 'rtl' : 'ltr'}
                        />
                        <div className={cn("flex items-center justify-end gap-3", isArabic ? "flex-row-reverse" : "flex-row")}>
                            <button
                                type="button"
                                onClick={() => {
                                    if (additionText.trim()) {
                                        onSendAddition(additionText.trim());
                                        setAdditionText('');
                                        setShowAddition(false);
                                    }
                                }}
                                disabled={loading || !additionText.trim()}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50 transition-all hover:opacity-90 cursor-pointer"
                            >
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                <Send className="w-4 h-4" />
                                {isArabic ? 'إرسال الإضافة' : 'Send addition'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ─── Active QUESTIONS cards ───────────────────────────────────────
    const questions = investigationResult.questions || [];
    const goalSummary = investigationResult.goal_understanding?.goal_summary || goalSummaryText;
    const missingRequired = questions.some((q) => q.required && !(answers[q.id] || '').trim());

    return (
        <div
            className="w-full max-w-2xl mx-auto my-auto space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300"
            dir={isArabic ? 'rtl' : 'ltr'}
        >
            {/* Goal echo */}
            <div className={cn(PANEL_SURFACE, "rounded-2xl px-5 py-4")}>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                    {isArabic ? 'هدفك' : 'Your goal'}
                </p>
                <p className="text-sm font-semibold text-foreground leading-snug">
                    {initialGoalText}
                </p>
            </div>

            {/* AI understanding */}
            {goalSummary && (
                <div className="rounded-2xl border border-primary/25 bg-primary/12 px-5 py-4 flex gap-3">
                    <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-sm text-foreground/75 leading-relaxed">{goalSummary}</p>
                </div>
            )}

            {/* Questions list */}
            {questions.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3 px-1">
                        <p className="text-sm font-semibold text-muted-foreground">
                            {isArabic
                                ? 'أجب على هذه الأسئلة لتحديد المهام الأنسب لك:'
                                : 'Answer these questions to calibrate tasks:'}
                        </p>
                        <span className="flex items-center gap-2 shrink-0">
                            <span className="flex items-center gap-1" aria-hidden="true">
                                {Array.from({ length: MAX_QUESTION_ROUNDS }).map((_, i) => (
                                    <span
                                        key={i}
                                        className={cn(
                                            "w-1.5 h-1.5 rounded-full transition-colors duration-150",
                                            i < round ? "bg-primary" : "bg-border"
                                        )}
                                    />
                                ))}
                            </span>
                            <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                                {isArabic
                                    ? `الجولة ${round} من ${MAX_QUESTION_ROUNDS}`
                                    : `Round ${round} of ${MAX_QUESTION_ROUNDS}`}
                            </span>
                        </span>
                    </div>

                    {loading && (
                        <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground px-1">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            {isArabic
                                ? 'جارٍ تحليل إجاباتك وتجهيز الخطوات التالية...'
                                : 'Analyzing your answers and preparing next steps...'}
                        </p>
                    )}

                    {questions.map((q: InvestigationQuestion, idx: number) => {
                        const unitOptions = getUnitOptionsForQuestion(q.unit, q.question);
                        const defaultUnit = unitOptions[0]?.value || q.unit || '';
                        const unansweredRequired = Boolean(q.required) && !(answers[q.id] || '').trim();

                        return (
                            <div key={q.id} className={cn(PANEL_SURFACE, "rounded-2xl px-5 py-4 space-y-3")}>
                                <div className="flex items-start justify-between gap-3">
                                    <label className="text-sm font-semibold text-foreground leading-snug">
                                        {idx + 1}. {q.question}
                                        {q.required && (
                                            <span className="text-destructive ms-1" aria-hidden="true">*</span>
                                        )}
                                    </label>
                                    <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap shrink-0 pt-0.5">
                                        {isArabic
                                            ? `السؤال ${idx + 1} من ${questions.length}`
                                            : `Question ${idx + 1} of ${questions.length}`}
                                    </span>
                                </div>

                                <AnswerControl
                                    question={q}
                                    value={answers[q.id] || ''}
                                    onChange={(value) => onAnswerChange(q.id, value)}
                                    unit={defaultUnit}
                                    selectedUnit={selectedUnits[q.id]}
                                    onUnitChange={(newUnit, prevUnit) => onUnitChange(q.id, newUnit, prevUnit)}
                                    language={isArabic ? 'ar' : 'en'}
                                    disabled={loading}
                                />

                                {unansweredRequired && (
                                    <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                                        {isArabic ? 'هذا السؤال مطلوب' : 'This question is required'}
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Actions: Continue or Quick Skip */}
            <div className="space-y-3 pt-2">
                {missingRequired && (
                    <p className="text-xs font-medium text-amber-600 dark:text-amber-400 px-1">
                        {isArabic
                            ? 'أجب على الأسئلة المطلوبة (*) قبل المتابعة أو اختر تخطي وإنشاء الخطة مباشرة.'
                            : 'Answer the required questions (*) or skip directly to plan generation.'}
                    </p>
                )}

                <div className="flex items-center justify-between gap-3">
                    {/* Quick Skip button as agreed in plan */}
                    <button
                        type="button"
                        onClick={onSkipToPlan}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border/80 bg-muted/40 hover:bg-muted text-xs font-semibold text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                        title={isArabic ? 'تخطي الأسئلة وبناء الخطة مباشرة بالمعلومات المتاحة' : 'Skip questions and build plan with available info'}
                    >
                        <FastForward className="w-3.5 h-3.5" />
                        <span>{isArabic ? 'تخطي وإنشاء الخطة الآن' : 'Skip & Create Plan'}</span>
                    </button>

                    <button
                        type="button"
                        onClick={onSubmitAnswers}
                        disabled={loading || missingRequired}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50 transition-all hover:opacity-90 cursor-pointer shadow-xs active:scale-95"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        <span>{isArabic ? 'متابعة' : 'Continue'}</span>
                        {!loading && (isArabic ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />)}
                    </button>
                </div>
            </div>
        </div>
    );
}
