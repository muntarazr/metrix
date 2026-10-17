"use client";

import { useState } from "react";
import {
  Target,
  Sparkles,
  Pin,
  Clock,
  Calendar,
  ListChecks,
  RefreshCw,
  Send,
  Loader2,
  Check,
  ChevronDown,
} from "lucide-react";
import type { Language } from "@/lib/translations";
import { translations } from "@/lib/translations";
import type { GoalTaskStats } from "@/app/page";
import type { DailyFocusSession } from "@/lib/daily-focus";
import { getIconComponent } from "@/components/goal/IconPicker";
import { getGoalEndDaysChip } from "@/lib/goal-dates";
import GoalProgressBar from "@/components/shared/GoalProgressBar";
import VoiceRecorder from "@/components/shared/VoiceRecorder";
import { cn } from "@/lib/utils";
import { WELL_SURFACE } from "@/lib/surfaces";
import type { Goal } from "./HomeTypes";

interface HomeGoalsSectionProps {
  className?: string;
  recentGoals: Goal[];
  taskStatsMap?: Record<string, GoalTaskStats>;
  language: Language;
  onSelectGoal: (id: string) => void;
  // Daily Focus Question Props
  activeFocusGoal: Goal | null;
  activeFocusGoalId: string | null;
  onSelectFocusGoal: (id: string) => void;
  dailyFocus: DailyFocusSession | null;
  dailyFocusAnswer: string;
  onAnswerChange: (val: string) => void;
  onAnswerSubmit: () => void;
  onAppendTranscript: (text: string) => void;
  onRefreshQuestion: () => void;
  focusLoading: boolean;
  focusSubmitting: boolean;
  focusError: string | null;
}

export default function HomeGoalsSection({
  className,
  recentGoals,
  taskStatsMap = {},
  language,
  onSelectGoal,
  activeFocusGoal,
  activeFocusGoalId,
  onSelectFocusGoal,
  dailyFocus,
  dailyFocusAnswer,
  onAnswerChange,
  onAnswerSubmit,
  onAppendTranscript,
  onRefreshQuestion,
  focusLoading,
  focusSubmitting,
  focusError,
}: HomeGoalsSectionProps) {
  const isArabic = language === "ar";
  const t = translations[language];
  const [bottomTab, setBottomTab] = useState<"goals" | "question">("goals");
  const [editingAnswer, setEditingAnswer] = useState(false);
  const [isAnswerExpanded, setIsAnswerExpanded] = useState(false);

  const isRTLText = (text: string) => {
    const rtlChar = /[\u0591-\u07ff\uFB1D-\uFDFD\uFE70-\uFEFC]/;
    const ltrChar = /[A-Za-z\u00C0-\u024F]/;
    for (const char of text.trim()) {
      if (rtlChar.test(char)) return true;
      if (ltrChar.test(char)) return false;
    }
    return isArabic;
  };

  const hasAnswer = Boolean(dailyFocus?.answered_at);
  const showAnswerInput = !hasAnswer || editingAnswer;
  const submitDisabled = focusSubmitting || focusLoading || !dailyFocusAnswer.trim();

  return (
    <div
      className={cn(
        "flex-1 min-h-0 w-full flex flex-col overflow-hidden",
        className
      )}
      dir={isArabic ? "rtl" : "ltr"}
    >
      {/* Unified Container for Tabs & Content */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div
          className={cn(
            "min-h-0 flex-1 flex flex-col rounded-[18px] scrollbar-thin touch-pan-y [-webkit-overflow-scrolling:touch]",
            WELL_SURFACE
          )}
        >
          {/* Integrated Header: Tab Switcher & Goal Selector */}
          <div className="flex shrink-0 items-center justify-between gap-1 sm:gap-2 p-1.5 min-[380px]:p-2 sm:p-2.5 bg-muted/20">
            <div className="flex min-w-0 items-center gap-0.5 sm:gap-1.5 bg-muted/40 p-0.5 sm:p-1 rounded-xl border border-border/70 shadow-2xs shrink-0">
              <button
                type="button"
                onClick={() => setBottomTab("goals")}
                title={isArabic ? "الأهداف الأخيرة" : "Recent Goals"}
                className={cn(
                  "flex min-w-0 items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-[11px] min-[380px]:text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95",
                  bottomTab === "goals"
                    ? "bg-card text-foreground shadow-xs border border-border/70"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                )}
              >
                <Target className="h-3.5 w-3.5 text-primary opacity-85 shrink-0" />
                <span className="truncate">{isArabic ? "الأهداف الأخيرة" : "Recent Goals"}</span>
                <span className="inline-flex h-4 min-w-[1.1rem] items-center justify-center rounded-full bg-primary/10 px-1.5 text-[10px] font-bold text-primary tabular-nums shrink-0">
                  {recentGoals.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setBottomTab("question")}
                title={isArabic ? "سؤال اليوم" : "Today's Question"}
                className={cn(
                  "flex min-w-0 items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-[11px] min-[380px]:text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95",
                  bottomTab === "question"
                    ? "bg-card text-foreground shadow-xs border border-border/70"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                )}
              >
                <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="truncate">{isArabic ? "سؤال اليوم" : "Today's Question"}</span>
                {hasAnswer ? (
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold shrink-0">
                    ✓
                  </span>
                ) : dailyFocus?.question ? (
                  <span className="inline-flex h-2 w-2 rounded-full bg-primary animate-pulse shrink-0" />
                ) : null}
              </button>
            </div>

            {bottomTab === "question" && recentGoals.length > 1 && (
              <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto min-w-0 py-0.5 scrollbar-none">
                <div className="flex items-center gap-0.5 sm:gap-1.5 bg-muted/30 p-0.5 sm:p-1 rounded-xl border border-border/60">
                  {recentGoals.map((g) => {
                    const isSelected = g.id === activeFocusGoalId;
                    const GoalIcon = getIconComponent(g.icon || "Target");
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => onSelectFocusGoal(g.id)}
                        title={g.title}
                        className={cn(
                          "inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all shrink-0 cursor-pointer active:scale-95",
                          isSelected
                            ? "bg-card text-foreground font-bold shadow-xs border border-border/70"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent"
                        )}
                      >
                        <GoalIcon
                          className={cn(
                            "h-3.5 w-3.5 shrink-0 transition-colors",
                            isSelected ? "text-primary" : "text-muted-foreground"
                          )}
                        />
                        <span className="hidden sm:inline truncate max-w-[110px] sm:max-w-[150px]">{g.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Scrollable Tab Panels Body */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-2.5 sm:p-3">
          {bottomTab === "goals" ? (
            recentGoals.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                {recentGoals.map((goal) => {
                  const currentPoints = goal.current_points ?? 0;
                  const targetPoints = goal.target_points ?? 0;
                  const progress =
                    targetPoints > 0 ? Math.round((currentPoints / targetPoints) * 100) : 0;
                  const Icon = getIconComponent(goal.icon || "Target");
                  const goalIsRTL = isArabic || isRTLText(goal.title);
                  const daysChip = getGoalEndDaysChip(goal.estimated_completion_date, isArabic);
                  const stats = taskStatsMap[goal.id];
                  const hasStatsBadge = !!stats && stats.total > 0;

                  return (
                    <div
                      key={goal.id}
                      className="group relative w-full min-h-[96px] sm:min-h-[104px] rounded-xl border border-border/70 bg-card p-2.5 sm:p-3 shadow-xs transition-all duration-200 ease-out hover:border-primary/60 hover:shadow-xs active:scale-[0.99] flex flex-col justify-between gap-1.5 sm:gap-2"
                    >
                      <button
                        type="button"
                        onClick={() => onSelectGoal(goal.id)}
                        className="flex h-full w-full cursor-pointer flex-col justify-between gap-2 text-start outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-1"
                        dir={goalIsRTL ? "rtl" : "ltr"}
                      >
                        {/* Top: Icon + Title */}
                        <div className="flex w-full items-center justify-between gap-2">
                          <div className="flex min-w-0 flex-1 items-center gap-2.5">
                            <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary shadow-xs transition-all duration-200 group-hover:bg-primary group-hover:text-primary-foreground">
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="block truncate text-sm sm:text-[15px] font-bold text-foreground transition-colors group-hover:text-primary">
                                {goal.title}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Middle: Badges row */}
                        <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 py-0.5">
                          {goal.is_pinned && (
                            <span className="inline-flex h-5 shrink-0 items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2 text-[9.5px] sm:text-[10px] font-semibold text-primary">
                              <Pin className="h-2.5 w-2.5" />
                              {isArabic ? "مثبت" : "Pinned"}
                            </span>
                          )}
                          {daysChip && (
                            <span
                              className={cn(
                                "inline-flex h-5 shrink-0 items-center gap-1 rounded-full border px-2 text-[9.5px] sm:text-[10px] font-semibold tabular-nums shadow-2xs transition-colors",
                                daysChip.tone === "soon" &&
                                  "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
                                daysChip.tone === "today" &&
                                  "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25 animate-pulse",
                                daysChip.tone === "late" &&
                                  "border-destructive/35 bg-destructive/10 text-destructive font-bold",
                                !daysChip.tone &&
                                  "border-border/70 bg-muted/60 text-muted-foreground/85"
                              )}
                              title={daysChip.title}
                            >
                              <Clock className="h-2.5 w-2.5" />
                              {daysChip.text}
                            </span>
                          )}
                          {!daysChip && goal.total_days && goal.total_days > 0 ? (
                            <span
                              className="inline-flex h-5 shrink-0 items-center gap-1 rounded-full border border-border/70 bg-muted/60 px-2 text-[9.5px] sm:text-[10px] font-semibold text-muted-foreground/85"
                              title={
                                isArabic
                                  ? `إجمالي مدة الهدف ${goal.total_days} يوم`
                                  : `Total duration: ${goal.total_days} days`
                              }
                            >
                              <Calendar className="h-2.5 w-2.5" />
                              <span>
                                {goal.total_days} {isArabic ? "يوم" : "d"}
                              </span>
                            </span>
                          ) : null}
                          {hasStatsBadge && (
                            <span
                              className={cn(
                                "inline-flex h-5 shrink-0 items-center gap-1 rounded-full border px-2 text-[9.5px] sm:text-[10px] font-semibold tabular-nums",
                                stats.completed >= stats.total
                                  ? "border-primary/25 bg-primary/10 text-primary font-bold"
                                  : "border-border/70 bg-muted/60 text-muted-foreground/85"
                              )}
                              title={
                                isArabic
                                  ? `${stats.completed} من ${stats.total} مهمة منجزة`
                                  : `${stats.completed} of ${stats.total} tasks done`
                              }
                            >
                              <ListChecks className="h-2.5 w-2.5" />
                              <span dir="ltr">
                                {stats.completed}/{stats.total}
                              </span>
                              {stats.completed >= stats.total && (
                                <span className="text-[9px] font-black text-primary">✓</span>
                              )}
                            </span>
                          )}
                        </div>

                        {/* Bottom: Progress Bar */}
                        <GoalProgressBar
                          currentPoints={currentPoints}
                          targetPoints={targetPoints}
                          progress={progress}
                          className="h-5.5 sm:h-6 shrink-0 w-full rounded-full"
                          labelClassName="px-2 text-[10px] sm:text-[11px] font-bold"
                          percentClassName="text-xs sm:text-sm font-black text-foreground"
                          targetClassName="text-foreground"
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-full min-h-[140px] sm:min-h-[160px] flex-col items-center justify-center p-3 sm:p-4 text-center">
                <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl border border-border/70 bg-card text-muted-foreground/50 shadow-xs mb-2">
                  <Target className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <h2 className="text-sm sm:text-base font-bold text-foreground tracking-tight">
                  {isArabic ? "لا توجد أهداف بعد" : "No goals yet"}
                </h2>
                <p className="mt-1 max-w-[16rem] text-xs text-muted-foreground/75 leading-relaxed">
                  {isArabic
                    ? "ابدأ بإضافة هدفك الأول وسيظهر تقدمه هنا."
                    : "Create your first goal and its progress will appear here."}
                </p>
              </div>
            )
          ) : (
            /* Daily Question & Answer View */
            <div className="flex flex-col gap-2.5 min-h-full">
              {!activeFocusGoal ? (
                <div className="flex h-full min-h-[140px] sm:min-h-[160px] flex-col items-center justify-center p-3 sm:p-4 text-center">
                  <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl border border-border/70 bg-card text-muted-foreground/50 shadow-xs mb-2">
                    <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-foreground">
                    {isArabic ? "أضف هدفاً أولاً للإجابة عن أسئلته" : "Add a goal first to answer questions"}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground max-w-[260px]">
                    {isArabic
                      ? "يقوم الذكاء الاصطناعي بتوليد سؤال يومي لكل هدف لمعايرة خطواتك ومساعدتك على الإنجاز."
                      : "AI generates a daily focus question for your active goals to calibrate your steps."}
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-border/70 bg-card p-3.5 sm:p-4 shadow-xs flex flex-col gap-3">
                  {/* Goal and status header */}
                  <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary border border-primary/20 shrink-0">
                        <Sparkles className="h-3 w-3" />
                        {isArabic ? "سؤال اليوم" : "Today's Question"}
                      </span>
                      <span className="text-xs text-muted-foreground font-semibold truncate">
                        • {activeFocusGoal.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {hasAnswer && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          <Check className="h-3 w-3" />
                          {isArabic ? "تمت الإجابة" : "Answered"}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={onRefreshQuestion}
                        disabled={focusLoading || focusSubmitting}
                        title={isArabic ? "تحديث السؤال" : "Refresh question"}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw className={cn("h-3.5 w-3.5", focusLoading && "animate-spin")} />
                      </button>
                    </div>
                  </div>

                  {/* Question Prompt */}
                  {focusLoading && !dailyFocus ? (
                    <div className="animate-pulse space-y-2 py-2">
                      <div className="h-4 w-4/5 rounded bg-muted/60" />
                      <div className="h-3 w-3/5 rounded bg-muted/40" />
                    </div>
                  ) : (
                    <div>
                      <h3 className="text-sm sm:text-[15px] font-bold leading-relaxed text-foreground whitespace-pre-line">
                        {dailyFocus?.question || (isArabic ? "جاري تحضير سؤال اليوم..." : "Preparing today's question...")}
                      </h3>
                      {dailyFocus?.question_why && (
                        <p className="mt-1 text-xs text-muted-foreground leading-normal">
                          {dailyFocus.question_why}
                        </p>
                      )}
                    </div>
                  )}

                  {focusError && (
                    <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-1.5 text-xs text-destructive font-medium">
                      {focusError}
                    </p>
                  )}

                  {/* Quick Options Chips */}
                  {showAnswerInput && dailyFocus?.quick_options && dailyFocus.quick_options.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                        {isArabic ? "خيارات سريعة:" : "Quick options:"}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {dailyFocus.quick_options.map((opt, idx) => {
                          const isSelected = dailyFocusAnswer.trim() === opt.trim();
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                onAnswerChange(isSelected ? "" : opt);
                              }}
                              className={cn(
                                "inline-flex items-center rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer active:scale-95",
                                isSelected
                                  ? "border-primary bg-primary text-primary-foreground shadow-2xs"
                                  : "border-border/80 bg-muted/30 hover:bg-muted/60 text-foreground"
                              )}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Answer Input or Answer Display */}
                  {showAnswerInput ? (
                    <div className="space-y-2 pt-1">
                      <div className="relative">
                        <textarea
                          value={dailyFocusAnswer}
                          onChange={(e) => {
                            const val = e.target.value;
                            const lines = val.split("\n");
                            if (lines.length > 5) {
                              onAnswerChange(lines.slice(0, 5).join("\n"));
                            } else {
                              onAnswerChange(val);
                            }
                          }}
                          onKeyDown={(e) => {
                            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                              e.preventDefault();
                              if (!submitDisabled) {
                                onAnswerSubmit();
                                setEditingAnswer(false);
                              }
                            }
                          }}
                          placeholder={
                            isArabic
                              ? "اكتب جوابك باختصار أو اختر من الخيارات أعلاه..."
                              : "Write your answer briefly or choose an option above..."
                          }
                          disabled={focusLoading || focusSubmitting}
                          rows={3}
                          className="w-full rounded-xl border border-border/70 bg-background px-3 py-2.5 pb-10 pe-11 text-xs sm:text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:border-primary/40 focus:ring-2 focus:ring-primary/15 outline-none resize-none sm:min-h-[92px]"
                        />
                        <div className="absolute bottom-2 end-2">
                          <VoiceRecorder
                            onTranscript={onAppendTranscript}
                            language={language}
                            size="sm"
                            statusAboveButton
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            onAnswerSubmit();
                            setEditingAnswer(false);
                          }}
                          disabled={submitDisabled}
                          className="inline-flex h-8 sm:h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground shadow-xs hover:bg-primary/90 transition-all cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {focusSubmitting ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Send className={cn("h-3.5 w-3.5", isArabic && "rtl:-scale-x-100")} />
                          )}
                          <span>{t.submitAnswer || (isArabic ? "إرسال الجواب" : "Submit Answer")}</span>
                        </button>
                        {hasAnswer && (
                          <button
                            type="button"
                            onClick={() => setEditingAnswer(false)}
                            className="inline-flex h-8 sm:h-9 items-center justify-center rounded-lg border border-border/80 bg-card px-3 text-xs font-semibold text-foreground hover:bg-muted transition-all cursor-pointer active:scale-95"
                          >
                            {t.cancel || (isArabic ? "إلغاء" : "Cancel")}
                          </button>
                        )}
                      </div>
                    </div>
                  ) : hasAnswer ? (
                    <div className="space-y-2.5 pt-1">
                      <div className="rounded-xl border border-border/70 bg-muted/30 shadow-2xs overflow-hidden transition-all duration-200">
                        {/* Dropdown Header Trigger */}
                        <div
                          role="button"
                          tabIndex={0}
                          aria-expanded={isAnswerExpanded}
                          onClick={() => setIsAnswerExpanded((prev) => !prev)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setIsAnswerExpanded((prev) => !prev);
                            }
                          }}
                          className="flex items-center justify-between gap-2 p-2.5 sm:px-3 cursor-pointer hover:bg-muted/50 transition-colors select-none text-start"
                        >
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <ChevronDown
                              className={cn(
                                "h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform duration-200",
                                isAnswerExpanded && "rotate-180"
                              )}
                            />
                            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider shrink-0">
                              {isArabic ? "إجابتك المحفوظة" : "Your Saved Answer"}
                            </span>
                            {!isAnswerExpanded && dailyFocus?.answer && (
                              <span className="text-[11px] text-muted-foreground/80 truncate font-normal">
                                — {dailyFocus.answer}
                              </span>
                            )}
                          </div>

                          <div
                            className="flex items-center gap-1.5 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => setEditingAnswer(true)}
                              className="text-[11px] font-bold text-primary hover:underline cursor-pointer px-1.5 py-0.5 rounded hover:bg-primary/10 transition-colors"
                            >
                              {isArabic ? "تعديل" : "Edit"}
                            </button>
                          </div>
                        </div>

                        {/* Collapsible Content */}
                        {isAnswerExpanded && (
                          <div className="border-t border-border/60 bg-background/50 p-3 animate-in fade-in-50 duration-150">
                            <p className="text-xs sm:text-sm text-foreground whitespace-pre-wrap leading-relaxed font-medium">
                              {dailyFocus?.answer || "—"}
                            </p>
                          </div>
                        )}
                      </div>

                      {dailyFocus?.answer_coaching && (
                        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 shadow-2xs">
                          <div className="flex items-center gap-1.5 text-primary text-[10px] font-bold uppercase tracking-wider mb-1">
                            <Sparkles className="h-3 w-3" />
                            <span>{isArabic ? "توجيه وإرشاد ذكي:" : "AI Coaching Insight:"}</span>
                          </div>
                          <p className="text-xs text-foreground leading-relaxed">
                            {dailyFocus.answer_coaching}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
