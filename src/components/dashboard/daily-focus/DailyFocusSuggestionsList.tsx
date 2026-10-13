"use client";

import { useState } from "react";
import {
  Check,
  ChevronDown,
  Clock,
  Flame,
  ListTodo,
  Loader2,
  Lock,
  Plus,
  RotateCcw,
  Sparkles,
  Target,
  Wrench,
  X,
} from "lucide-react";
import { translations, type Language } from "@/lib/translations";
import type { DailyFocusSession, DailyFocusSuggestion } from "@/lib/daily-focus";
import { cn } from "@/lib/utils";

interface DailyFocusSuggestionsListProps {
  language?: Language;
  isArabic: boolean;
  dailyFocus: DailyFocusSession | null;
  tasks?: Array<{
    id: string;
    task_description: string;
    completion_criteria?: string | null;
    time_required_minutes?: number | null;
    frequency?: string | null;
    impact_weight?: number | null;
    schedule_days?: number[] | null;
  }>;
  addingSuggestionId: string | null;
  onAddSuggestion: (suggestionId: string) => void;
  onRejectSuggestion?: (suggestionId: string) => void;
  onUndoRejectSuggestion?: (suggestionId: string) => void;
  onNavigateToSection?: (section: "tasks" | "suggestions" | "questions") => void;
  isSuggestionsLocked?: boolean;
  daysUntilSuggestionsUnlock?: number;
  daysPassedSinceGoalCreation?: number;
}

export function DailyFocusSuggestionsList({
  language = "ar",
  isArabic,
  dailyFocus,
  tasks = [],
  addingSuggestionId,
  onAddSuggestion,
  onRejectSuggestion,
  onUndoRejectSuggestion,
  onNavigateToSection,
  isSuggestionsLocked = false,
  daysUntilSuggestionsUnlock = 0,
  daysPassedSinceGoalCreation = 0,
}: DailyFocusSuggestionsListProps) {
  const t = translations[language];
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null);
  const [showRejected, setShowRejected] = useState(false);

  const allSuggestions = dailyFocus?.suggestions ?? [];
  const suggestionsUnlocked = Boolean(dailyFocus?.suggestions_unlocked);

  const appliedIds = dailyFocus?.appliedSuggestionIds || dailyFocus?.addedSuggestionIds || [];
  const rejectedIds = dailyFocus?.rejectedSuggestionIds || [];

  const activeSuggestions = allSuggestions.filter(
    (s) => !rejectedIds.includes(s.id) && s.status !== "rejected",
  );
  const rejectedSuggestions = allSuggestions.filter(
    (s) => rejectedIds.includes(s.id) || s.status === "rejected",
  );

  if (isSuggestionsLocked) {
    const requiredDays = 5;
    const daysPassed = daysPassedSinceGoalCreation ?? 0;
    const daysRemaining = daysUntilSuggestionsUnlock ?? Math.max(0, requiredDays - daysPassed);
    const currentDay = Math.min(daysPassed + 1, requiredDays);

    return (
      <div
        className="flex min-h-full sm:min-h-[440px] flex-1 flex-col items-center justify-center p-2 sm:p-6"
        dir={isArabic ? "rtl" : "ltr"}
      >
        <div className="flex w-full max-w-lg flex-col items-center justify-center gap-3 sm:gap-5 rounded-2xl border border-border/70 bg-card p-4 sm:p-8 text-center shadow-xs">
          <div className="relative flex h-13 w-13 sm:h-14 sm:w-14 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary shadow-xs">
            <Sparkles className="size-6 sm:size-7" />
            <span className="absolute -bottom-1 -end-1 flex h-5 w-5 items-center justify-center rounded-full bg-card border border-border/80 text-muted-foreground shadow-2xs">
              <Lock className="size-2.5" />
            </span>
          </div>

          <div className="space-y-1.5 max-w-md">
            <h3 className="text-sm sm:text-base font-bold text-foreground tracking-tight">
              {t.suggestionsLockedDaysTitle || (isArabic ? "معايرة التوصيات الذكية" : "Calibrating Recommendations")}
            </h3>
            <p className="text-xs sm:text-[13px] leading-relaxed text-muted-foreground">
              {t.suggestionsLockedDaysDesc || (isArabic
                ? "يحتاج النظام إلى 5 أيام من تسجيل الأداء لتقديم توصيات دقيقة تناسب وتيرتك."
                : "5 days of logged check-ins are required to calibrate tailored suggestions for your pace.")}
            </p>
          </div>

          <div className="w-full max-w-xs sm:max-w-sm space-y-2 py-1">
            <div className="flex items-center gap-1.5 w-full">
              {Array.from({ length: requiredDays }).map((_, idx) => {
                const isCompleted = idx < daysPassed;
                const isCurrent = idx === daysPassed;
                return (
                  <div
                    key={idx}
                    className={cn(
                      "h-2 sm:h-2.5 flex-1 rounded-full transition-all duration-300",
                      isCompleted
                        ? "bg-primary"
                        : isCurrent
                          ? "bg-primary/50 ring-2 ring-primary/20 animate-pulse"
                          : "bg-muted border border-border/60",
                    )}
                  />
                );
              })}
            </div>

            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground px-0.5">
              <span className="tabular-nums font-semibold">
                {isArabic
                  ? `اليوم ${currentDay} من ${requiredDays}`
                  : `Day ${currentDay} of ${requiredDays}`}
              </span>
              <span className="text-primary font-bold tabular-nums">
                {isArabic
                  ? `متبقي ${daysRemaining} ${daysRemaining === 1 ? "يوم" : "أيام"}`
                  : `${daysRemaining} days left`}
              </span>
            </div>
          </div>

          {onNavigateToSection && (
            <button
              type="button"
              onClick={() => onNavigateToSection("tasks")}
              className="inline-flex h-9 sm:h-10 items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 text-xs sm:text-sm font-semibold transition-all duration-150 hover:bg-primary/90 active:scale-98 shadow-xs cursor-pointer"
            >
              <ListTodo className="size-4 shrink-0" />
              <span>{isArabic ? "التركيز على مهام اليوم" : "Focus on Today's Tasks"}</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const renderSuggestionCard = (suggestion: DailyFocusSuggestion, isRejectedList: boolean = false) => {
    const isExpanded = expandedSuggestion === suggestion.id;
    const isApplied = appliedIds.includes(suggestion.id) || suggestion.status === "applied";
    const isModification =
      suggestion.change_type === "modify_task" || suggestion.support_type === "task_adjustment";

    const matchedTask = suggestion.target_task_id
      ? tasks.find((t) => t.id === suggestion.target_task_id)
      : undefined;

    const displayTaskName =
      suggestion.target_task_title ||
      matchedTask?.task_description ||
      suggestion.title;

    const currentMinutes = matchedTask?.time_required_minutes ?? null;
    const proposedMinutes =
      suggestion.changes?.time_required_minutes ??
      suggestion.adjusted_time_required ??
      (suggestion.time_required_minutes || null);

    const hasTimeChange =
      isModification &&
      proposedMinutes !== null &&
      proposedMinutes !== undefined &&
      (currentMinutes === null || currentMinutes !== proposedMinutes);

    const currentCriteria = matchedTask?.completion_criteria?.trim() || "";
    const proposedCriteria =
      suggestion.changes?.completion_criteria?.trim() ||
      suggestion.completion_criteria?.trim() ||
      "";

    const hasCriteriaChange =
      isModification &&
      proposedCriteria.length > 0 &&
      currentCriteria !== proposedCriteria;

    return (
      <div
        key={suggestion.id}
        className={cn(
          "group rounded-2xl border transition-all duration-200 shadow-xs overflow-hidden",
          isApplied
            ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/10"
            : isRejectedList
              ? "border-border/60 bg-muted/20 opacity-75"
              : "border-border/80 bg-card hover:border-primary/40 hover:shadow-sm",
        )}
      >
        {/* Card Header & Main Info */}
        <div className="p-3.5 sm:p-4">
          <div className="flex flex-wrap sm:flex-nowrap items-start gap-2.5 sm:gap-3">
            {/* Category Icon */}
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-base shadow-xs",
                isModification
                  ? "bg-sky-500/10 text-sky-600 border-sky-500/25 dark:text-sky-400"
                  : "bg-primary/10 text-primary border-primary/25",
              )}
            >
              {isModification ? <Wrench className="size-4.5" /> : <Target className="size-4.5" />}
            </div>

            {/* Core Details */}
            <div className="min-w-[calc(100%-3rem)] sm:min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                {/* Badge Type */}
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold shrink-0 shadow-2xs",
                    isModification
                      ? "border-sky-500/30 bg-sky-500/12 text-sky-700 dark:text-sky-300"
                      : "border-primary/30 bg-primary/12 text-primary",
                  )}
                >
                  {isModification ? (
                    <>
                      <span>{t.taskAdjustmentBadge || (isArabic ? "تعديل لمهمة حالية" : "Task Adjustment")}</span>
                    </>
                  ) : (
                    <>
                      <span>{t.newTaskBadge || (isArabic ? "مهمة جديدة مقترحة" : "New Proposed Task")}</span>
                    </>
                  )}
                </span>

                {isApplied && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/12 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    <Check className="size-3" />
                    <span>{t.taskAdjustmentApplied || (isArabic ? "تم تطبيق التعديل" : "Adjustment Applied")}</span>
                  </span>
                )}
              </div>

              {/* Task Name or Headline */}
              <h4 className="text-[13.5px] sm:text-sm font-bold text-foreground leading-snug">
                {isModification ? (
                  <span>
                    <span className="text-muted-foreground font-medium text-xs">
                      {isArabic ? "المهمة: " : "Task: "}
                    </span>
                    {displayTaskName}
                  </span>
                ) : (
                  suggestion.title
                )}
              </h4>

              {/* Action Summary if present */}
              {suggestion.action_summary && (
                <p className="mt-1 text-xs font-semibold text-primary/90 dark:text-primary leading-relaxed">
                  {suggestion.action_summary}
                </p>
              )}
            </div>

            {/* Action Buttons: Apply / Reject / Expand */}
            <div className="flex w-full sm:w-auto items-center justify-end gap-1.5 shrink-0 pt-2 sm:pt-0 border-t border-border/40 sm:border-0 sm:self-start">
              {!isRejectedList ? (
                <>
                  <button
                    type="button"
                    onClick={() => onAddSuggestion(suggestion.id)}
                    disabled={addingSuggestionId === suggestion.id || isApplied}
                    className={cn(
                      "inline-flex h-8 flex-1 sm:flex-initial justify-center items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-all duration-150 cursor-pointer active:scale-95 shadow-xs touch-manipulation",
                      isApplied
                        ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400 cursor-default"
                        : "bg-primary text-primary-foreground border-transparent hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed",
                    )}
                  >
                    {addingSuggestionId === suggestion.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : isApplied ? (
                      <Check className="size-3.5" />
                    ) : isModification ? (
                      <Check className="size-3.5" />
                    ) : (
                      <Plus className="size-3.5" />
                    )}
                    <span>
                      {isApplied
                        ? isModification
                          ? t.taskAdjustmentApplied || (isArabic ? "تم التعديل" : "Applied")
                          : t.addedToFocus || (isArabic ? "تمت الإضافة" : "Added")
                        : isModification
                          ? t.applyTaskAdjustment || (isArabic ? "تطبيق التعديل" : "Apply Adjustment")
                          : t.addToFocus || (isArabic ? "إضافة للخطة" : "Add to Plan")}
                    </span>
                  </button>

                  {!isApplied && onRejectSuggestion && (
                    <button
                      type="button"
                      onClick={() => onRejectSuggestion(suggestion.id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-border/70 bg-card text-muted-foreground transition-all duration-150 hover:text-destructive hover:border-destructive/30 hover:bg-destructive/10 active:scale-95 shadow-xs cursor-pointer touch-manipulation"
                      title={t.rejectSuggestion || (isArabic ? "رفض الاقتراح" : "Reject Suggestion")}
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </>
              ) : (
                onUndoRejectSuggestion && (
                  <button
                    type="button"
                    onClick={() => onUndoRejectSuggestion(suggestion.id)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-border/80 bg-card px-2.5 text-xs font-semibold text-foreground transition-all duration-150 hover:bg-muted active:scale-95 shadow-xs cursor-pointer touch-manipulation"
                  >
                    <RotateCcw className="size-3" />
                    <span>{t.restoreSuggestion || (isArabic ? "استعادة" : "Restore")}</span>
                  </button>
                )
              )}

              <button
                type="button"
                aria-expanded={isExpanded}
                aria-label={isArabic ? "التفاصيل" : "Details"}
                onClick={() => setExpandedSuggestion(isExpanded ? null : suggestion.id)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-all duration-150 hover:text-foreground hover:bg-muted/70 active:scale-95 touch-manipulation"
              >
                <ChevronDown
                  className={cn(
                    "size-4 transition-transform duration-200",
                    isExpanded && "rotate-180",
                  )}
                />
              </button>
            </div>
          </div>

          {/* Quick Metrics comparison chips row */}
          {isModification && (hasTimeChange || hasCriteriaChange) && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2.5 border-t border-border/50">
              {hasTimeChange && (
                <div className="flex items-center justify-between rounded-xl bg-muted/40 border border-border/60 px-3 py-1.5 text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
                    <Clock className="size-3.5 text-sky-500" />
                    <span>{t.timeComparisonTitle || (isArabic ? "الوقت:" : "Time:")}</span>
                  </span>
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className="text-muted-foreground line-through text-[11px]">
                      {currentMinutes ? `${currentMinutes} د` : (isArabic ? "غير محدد" : "None")}
                    </span>
                    <span className="text-sky-600 dark:text-sky-400">➔</span>
                    <span className="text-foreground">
                      {proposedMinutes} {isArabic ? "دقيقة" : "min"}
                    </span>
                  </div>
                </div>
              )}

              {suggestion.changes?.impact_weight && (
                <div className="flex items-center justify-between rounded-xl bg-muted/40 border border-border/60 px-3 py-1.5 text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
                    <Flame className="size-3.5 text-amber-500" />
                    <span>{t.impactComparisonTitle || (isArabic ? "الأهمية:" : "Weight:")}</span>
                  </span>
                  <div className="flex items-center gap-1.5 font-bold">
                    {matchedTask?.impact_weight && (
                      <>
                        <span className="text-muted-foreground line-through text-[11px]">
                          {matchedTask.impact_weight}
                        </span>
                        <span className="text-amber-500">➔</span>
                      </>
                    )}
                    <span className="text-foreground">{suggestion.changes.impact_weight}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Expanded Details Panel: Before vs After & Reason */}
        <div
          className="grid transition-[grid-template-rows] duration-200 ease-out-quart"
          style={{ gridTemplateRows: isExpanded ? "1fr" : "0fr" }}
        >
          <div className="overflow-hidden">
            <div className="border-t border-border/60 bg-muted/25 px-3.5 py-3 sm:px-4 space-y-3">
              {/* Detailed Reason Analysis */}
              {suggestion.reason && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {isArabic ? "تحليل السبب والتشخيص:" : "Reason & Coaching:"}
                  </p>
                  <p className="text-xs leading-relaxed text-foreground/90 font-medium bg-card/60 border border-border/50 rounded-xl p-2.5">
                    {suggestion.reason}
                  </p>
                </div>
              )}

              {/* Completion criteria comparison if changed */}
              {proposedCriteria && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
                    {isModification
                      ? isArabic
                        ? "معيار الإنجاز المقترح:"
                        : "Proposed Completion Criteria:"
                      : isArabic
                        ? "معيار إنجاز المهمة:"
                        : "Completion Criteria:"}
                  </p>
                  <div className="rounded-xl border border-primary/25 bg-primary/10 p-2.5">
                    <p className="text-xs font-bold text-foreground leading-relaxed">
                      {proposedCriteria}
                    </p>
                    {isModification && currentCriteria && currentCriteria !== proposedCriteria && (
                      <p className="mt-1 pt-1.5 border-t border-primary/15 text-[11px] text-muted-foreground">
                        <span className="font-semibold">{isArabic ? "المعيار السابق: " : "Previous: "}</span>
                        {currentCriteria}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Cadence info badge */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-lg bg-card px-2.5 py-1 font-bold border border-border/60 shadow-2xs">
                  {suggestion.frequency === "daily"
                    ? t.daily || (isArabic ? "يومي" : "Daily")
                    : t.weekly || (isArabic ? "أسبوعي" : "Weekly")}
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg bg-card px-2.5 py-1 font-bold border border-border/60 shadow-2xs">
                  {isArabic
                    ? `الأهمية: ${suggestion.impact_weight}`
                    : `Impact: ${suggestion.impact_weight}`}
                </span>
                {proposedMinutes !== null && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-card px-2.5 py-1 font-bold border border-border/60 shadow-2xs">
                    {isArabic ? `${proposedMinutes} دقيقة` : `${proposedMinutes} min`}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col" dir={isArabic ? "rtl" : "ltr"}>
      {activeSuggestions.length === 0 && rejectedSuggestions.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/70 bg-card/40 p-6 sm:p-8 text-center my-auto">
          <span className="text-3xl opacity-70">🎯</span>
          <p className="text-sm font-bold text-foreground">
            {suggestionsUnlocked ? t.suggestionEmpty : t.suggestionsLocked}
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground max-w-sm">
            {suggestionsUnlocked
              ? t.suggestionEmptyDescription
              : t.suggestionsLockedDescription}
          </p>
          {!suggestionsUnlocked && onNavigateToSection && (
            <button
              type="button"
              onClick={() => onNavigateToSection("questions")}
              className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-xs transition-all duration-150 hover:bg-primary/90 active:scale-95 cursor-pointer"
            >
              <span>
                {isArabic
                  ? "الإجابة على سؤال اليوم لفتح الاقتراحات"
                  : "Answer today's question to unlock suggestions"}
              </span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3 pb-4">
          {/* Active Suggestions List */}
          {activeSuggestions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 bg-card/30 p-5 text-center">
              <p className="text-xs font-semibold text-muted-foreground">
                {t.noActiveSuggestions || (isArabic ? "لا توجد اقتراحات نشطة حالياً." : "No active suggestions right now.")}
              </p>
            </div>
          ) : (
            activeSuggestions.map((s) => renderSuggestionCard(s, false))
          )}

          {/* Rejected Suggestions Collapsible Section */}
          {rejectedSuggestions.length > 0 && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowRejected((prev) => !prev)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <ChevronDown
                  className={cn(
                    "size-3.5 transition-transform duration-200",
                    showRejected && "rotate-180",
                  )}
                />
                <span>
                  {showRejected
                    ? t.hideRejectedSuggestions || (isArabic ? "إخفاء الاقتراحات المرفوضة" : "Hide rejected suggestions")
                    : `${t.showRejectedSuggestions || (isArabic ? "عرض الاقتراحات المرفوضة" : "Show rejected suggestions")} (${rejectedSuggestions.length})`}
                </span>
              </button>

              {showRejected && (
                <div className="mt-2.5 space-y-2 border-t border-border/40 pt-2.5">
                  {rejectedSuggestions.map((s) => renderSuggestionCard(s, true))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
