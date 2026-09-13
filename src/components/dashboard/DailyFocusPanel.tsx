"use client";

import { useState } from "react";
import {
  Check,
  ChevronDown,
  Loader2,
  Plus,
  Send,
  Sparkles,
} from "lucide-react";
import { translations, type Language } from "@/lib/translations";
import type {
  DailyFocusHistoryItem,
  DailyFocusSession,
} from "@/lib/daily-focus";
import { cn } from "@/lib/utils";
import VoiceRecorder from "../shared/VoiceRecorder";

interface DailyFocusPanelProps {
  mode?: "suggestions" | "questions";
  language?: Language;
  isArabic: boolean;
  dailyFocus: DailyFocusSession | null;
  dailyFocusHistory?: DailyFocusHistoryItem[];
  missedDailyFocusHistory?: DailyFocusHistoryItem[];
  loading: boolean;
  submitting: boolean;
  addingSuggestionId: string | null;
  error: string | null;
  answer: string;
  onAnswerChange: (value: string) => void;
  onAnswerSubmit: () => void;
  onAppendTranscript: (text: string) => void;
  onAddSuggestion: (suggestionId: string) => void;
}

export default function DailyFocusPanel({
  mode = "suggestions",
  language = "ar",
  isArabic,
  dailyFocus,
  dailyFocusHistory = [],
  missedDailyFocusHistory = [],
  loading,
  submitting,
  addingSuggestionId,
  error,
  answer,
  onAnswerChange,
  onAnswerSubmit,
  onAppendTranscript,
  onAddSuggestion,
}: DailyFocusPanelProps) {
  const t = translations[language];
  const hasAnswer = Boolean(dailyFocus?.answered_at);
  const [editingAnswer, setEditingAnswer] = useState(false);
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(
    null,
  );
  const [questionHistoryTab, setQuestionHistoryTab] = useState<"answered" | "missed">("answered");
  const [expandedHistoryItem, setExpandedHistoryItem] = useState<string | null>(
    null,
  );
  const [expandedMissedItem, setExpandedMissedItem] = useState<string | null>(
    null,
  );

  const submitDisabled = submitting || loading || !answer.trim();
  const showAnswerInput = !hasAnswer || editingAnswer;

  const suggestions = dailyFocus?.suggestions ?? [];
  const suggestionsUnlocked = Boolean(dailyFocus?.suggestions_unlocked);
  const previousHistory = dailyFocusHistory.slice(0, 8);

  if (mode === "suggestions") {
    return (
      <div className="flex min-h-0 flex-1 flex-col" dir={isArabic ? "rtl" : "ltr"}>
        {suggestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2.5 rounded-2xl border border-dashed border-border/70 bg-card/40 p-8 text-center">
            <span className="text-3xl opacity-60">🎯</span>
            <p className="text-xs font-bold text-foreground">
              {suggestionsUnlocked ? t.suggestionEmpty : t.suggestionsLocked}
            </p>
            <p className="text-[11px] leading-relaxed text-muted-foreground/75 max-w-[20rem]">
              {suggestionsUnlocked
                ? t.suggestionEmptyDescription
                : t.suggestionsLockedDescription}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {suggestions.map((suggestion) => {
              const isExpanded = expandedSuggestion === suggestion.id;

              return (
                <div
                  key={suggestion.id}
                  className="group rounded-xl border border-border/70 bg-card transition-all duration-200 hover:border-primary/25 hover:shadow-xs dark:bg-card/20"
                >
                  <div className="flex items-center gap-2.5 px-3 py-2 sm:px-3.5 sm:py-2.5">
                    {/* Compact Emoji */}
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/30 text-base border border-border/50 shadow-xs">
                      {suggestion.emoji || "🎯"}
                    </span>

                    {/* Title + badges */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h5 className="text-[13px] font-bold leading-tight text-foreground line-clamp-1">
                          {suggestion.title}
                        </h5>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-bold shrink-0",
                            suggestion.support_type === "goal_task"
                              ? "border-primary/15 bg-primary/12 text-primary"
                              : "border-foreground/15 bg-foreground/12 text-foreground",
                          )}
                        >
                          {suggestion.support_type === "goal_task"
                            ? t.suggestionInGoal
                            : t.suggestionExternalBooster}
                        </span>
                      </div>
                    </div>

                    {/* Actions: Add + Expand */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onAddSuggestion(suggestion.id)}
                        disabled={addingSuggestionId === suggestion.id}
                        className="inline-flex h-7 items-center gap-1 rounded-lg bg-primary/12 border border-primary/20 px-2 text-xs font-bold text-primary transition-all duration-200 hover:bg-primary hover:text-primary-foreground hover:border-transparent active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                        title={isArabic ? "إضافة إلى المهام" : "Add to tasks"}
                      >
                        {addingSuggestionId === suggestion.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Plus className="h-3.5 w-3.5" />
                        )}
                        <span className="hidden sm:inline text-[11px]">
                          {isArabic ? "إضافة" : "Add"}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setExpandedSuggestion(isExpanded ? null : suggestion.id)
                        }
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-200 hover:text-foreground hover:bg-muted/60 active:scale-95"
                        aria-label={isArabic ? "التفاصيل" : "Details"}
                      >
                        <ChevronDown
                          className={cn(
                            "h-3.5 w-3.5 transition-transform duration-200",
                            isExpanded && "rotate-180",
                          )}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Expanded suggestion details */}
                  <div
                    className="grid transition-[grid-template-rows] duration-200 ease-out-quart"
                    style={{ gridTemplateRows: isExpanded ? "1fr" : "0fr" }}
                  >
                    <div className="overflow-hidden">
                      <div className="border-t border-border/40 bg-muted/15 px-3.5 py-2.5 sm:px-4">
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {suggestion.reason}
                        </p>
                        {suggestion.completion_criteria && (
                          <div className="mt-2.5 rounded-lg border border-primary/20 bg-primary/8 p-2 text-start">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-primary">
                              <span>🎯</span>
                              <span>
                                {isArabic
                                  ? "معيار الإنجاز المقترح:"
                                  : "Suggested Completion Criteria:"}
                              </span>
                            </div>
                            <p className="mt-0.5 text-xs font-semibold text-foreground/90 leading-relaxed">
                              {suggestion.completion_criteria}
                            </p>
                          </div>
                        )}
                        <div className="mt-2 flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted/50 px-2 py-0.5 text-[10px] font-bold border border-border/40 text-muted-foreground">
                            {suggestion.frequency === "daily"
                              ? t.daily
                              : t.weekly}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted/50 px-2 py-0.5 text-[10px] font-bold border border-border/40 text-muted-foreground">
                            {isArabic
                              ? `أهمية: ${suggestion.impact_weight}`
                              : `Impact: ${suggestion.impact_weight}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // mode === "questions"
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4" dir={isArabic ? "rtl" : "ltr"}>
      {/* Today's Question Card */}
      <section className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1 rounded-md bg-primary/12 px-2 py-0.5 text-[11px] font-bold text-primary">
            <Sparkles className="h-3 w-3" />
            {isArabic ? "سؤال اليوم" : "Today's Question"}
          </span>
          {dailyFocus?.angle_label ? (
            <span className="inline-flex items-center rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
              {dailyFocus.angle_label}
            </span>
          ) : null}
          {hasAnswer ? (
            <span className="ms-auto inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/12 px-2.5 py-0.5 text-[10px] font-bold text-primary shadow-xs">
              <Check className="h-3 w-3" />
              {isArabic ? "تمت الإجابة" : "Answered"}
            </span>
          ) : null}
        </div>

        {loading && !dailyFocus ? (
          <div className="animate-pulse space-y-2.5 my-2">
            <div className="h-4 w-5/6 rounded-lg bg-muted/60" />
            <div className="h-4 w-2/3 rounded-lg bg-muted/40" />
          </div>
        ) : (
          <div>
            <h3 className="whitespace-pre-line text-sm sm:text-[15px] font-bold leading-relaxed text-foreground">
              {dailyFocus?.question || t.dailyFocusUnavailable}
            </h3>
            {dailyFocus?.question_why ? (
              <div className="mt-2.5 rounded-xl border border-border/50 bg-muted/30 p-3">
                <p className="text-[10px] font-bold text-foreground/75 uppercase tracking-wider">
                  {t.questionWhyLabel}
                </p>
                <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
                  {dailyFocus.question_why}
                </p>
              </div>
            ) : null}
          </div>
        )}

        {error ? (
          <p className="mt-3 rounded-xl border border-destructive/15 bg-destructive/10 px-3 py-2 text-xs text-destructive font-medium">
            {error}
          </p>
        ) : null}

        {/* Answer Input or Display */}
        {showAnswerInput ? (
          <div className="mt-3.5">
            <div className="relative">
              <textarea
                value={answer}
                onChange={(event) => onAnswerChange(event.target.value)}
                placeholder={t.answerQuestionPlaceholder}
                disabled={loading || submitting}
                className={cn(
                  "min-h-20 w-full rounded-xl border border-border/70 bg-background px-3.5 py-2.5 pe-12 text-xs sm:text-sm leading-relaxed text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-primary/30 focus:ring-2 focus:ring-primary/15",
                  (loading || submitting) && "cursor-not-allowed opacity-70",
                )}
                dir={isArabic ? "rtl" : "ltr"}
              />
              <div className="pointer-events-auto absolute bottom-2 end-2">
                <VoiceRecorder
                  onTranscript={onAppendTranscript}
                  language={language}
                  statusAboveButton
                  className="items-end"
                />
              </div>
            </div>
            <div className="mt-2.5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onAnswerSubmit();
                  setEditingAnswer(false);
                }}
                disabled={submitDisabled}
                className="inline-flex h-8 sm:h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground shadow-xs transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                {t.submitAnswer}
              </button>
              {hasAnswer ? (
                <button
                  type="button"
                  onClick={() => setEditingAnswer(false)}
                  className="inline-flex h-8 sm:h-9 items-center justify-center rounded-lg border border-border/70 px-3 text-xs font-semibold text-muted-foreground transition-all duration-200 hover:text-foreground hover:bg-muted/40 active:scale-[0.98]"
                >
                  {t.cancel}
                </button>
              ) : null}
            </div>
          </div>
        ) : hasAnswer ? (
          <div className="mt-3.5 space-y-2.5">
            <div className="rounded-xl border border-border/60 bg-muted/25 p-3 sm:p-3.5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/75">
                  {t.answerQuestion}
                </p>
                <button
                  type="button"
                  onClick={() => setEditingAnswer(true)}
                  className="text-[11px] font-bold text-primary hover:underline"
                >
                  {t.editSavedAnswer}
                </button>
              </div>
              <p className="whitespace-pre-wrap text-xs sm:text-sm leading-relaxed text-foreground">
                {dailyFocus?.answer || "—"}
              </p>
            </div>
            {dailyFocus?.answer_coaching ? (
              <div className="rounded-xl border border-primary/20 bg-primary/10 p-3 sm:p-3.5">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                  <Sparkles className="h-3 w-3" />
                  {t.aiCoachingLabel}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-foreground">
                  {dailyFocus.answer_coaching}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      {/* History section with clean segmented tabs */}
      {(previousHistory.length > 0 || missedDailyFocusHistory.length > 0) && (
        <section className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5 shadow-xs">
          {/* Segmented Control */}
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <div className="inline-flex items-center rounded-lg border border-border/60 bg-muted/40 p-0.5">
              <button
                type="button"
                onClick={() => setQuestionHistoryTab("answered")}
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded-md px-3 text-[11px] font-bold transition-all duration-200",
                  questionHistoryTab === "answered"
                    ? "bg-card text-foreground shadow-xs ring-1 ring-border/60"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span>{isArabic ? "الأسئلة المُجاب عنها" : "Answered"}</span>
                <span className="rounded-full bg-primary/12 px-1.5 py-0.2 text-[9px] font-bold text-primary">
                  {previousHistory.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setQuestionHistoryTab("missed")}
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded-md px-3 text-[11px] font-bold transition-all duration-200",
                  questionHistoryTab === "missed"
                    ? "bg-card text-foreground shadow-xs ring-1 ring-border/60"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span>{isArabic ? "أسئلة فاتتك" : "Missed"}</span>
                <span className="rounded-full bg-muted-foreground/15 px-1.5 py-0.2 text-[9px] font-bold text-muted-foreground">
                  {missedDailyFocusHistory.length}
                </span>
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="mt-3">
            {questionHistoryTab === "answered" ? (
              previousHistory.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground/75">
                  {isArabic ? "لا توجد أسئلة مجاب عنها حتى الآن." : "No answered questions yet."}
                </p>
              ) : (
                <div className="space-y-2">
                  {previousHistory.map((item) => {
                    const itemKey = `${item.prompt_date}-${item.question}`;
                    const itemOpen = expandedHistoryItem === itemKey;

                    return (
                      <article
                        key={itemKey}
                        className="rounded-xl border border-border/60 bg-muted/20 transition-all duration-200 hover:border-border/80"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedHistoryItem(itemOpen ? null : itemKey)
                          }
                          className="w-full px-3 py-2 sm:px-3.5 sm:py-2.5 text-start transition-colors"
                        >
                          <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground">
                            <span>{item.prompt_date}</span>
                            <span className="rounded-full border border-primary/20 bg-primary/12 px-1.5 py-0.2 text-primary text-[9px]">
                              {isArabic ? "محفوظ" : "Saved"}
                            </span>
                            <ChevronDown
                              className={cn(
                                "ms-auto h-3.5 w-3.5 transition-transform duration-200",
                                itemOpen && "rotate-180",
                              )}
                            />
                          </div>
                          <p className="mt-1 line-clamp-1 text-xs font-bold text-foreground">
                            {item.question}
                          </p>
                        </button>

                        <div
                          className="grid transition-[grid-template-rows] duration-200 ease-out-quart"
                          style={{ gridTemplateRows: itemOpen ? "1fr" : "0fr" }}
                        >
                          <div className="overflow-hidden">
                            <div className="border-t border-border/50 bg-card/60 px-3.5 pb-3 pt-2.5">
                              <p className="text-xs font-semibold leading-relaxed text-foreground">
                                {item.question}
                              </p>
                              <div className="mt-2 rounded-lg border border-border/60 bg-muted/30 p-2.5">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/75">
                                  {t.answerQuestion}
                                </p>
                                <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-foreground">
                                  {item.answer || "—"}
                                </p>
                              </div>
                              {item.answer_coaching ? (
                                <p className="mt-2 whitespace-pre-line text-[11px] leading-relaxed text-muted-foreground italic">
                                  {item.answer_coaching}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )
            ) : missedDailyFocusHistory.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground/75">
                {isArabic ? "رائع! لم يفتك أي سؤال." : "Great! No missed questions."}
              </p>
            ) : (
              <div className="space-y-2">
                {missedDailyFocusHistory.map((item) => {
                  const itemKey = `${item.prompt_date}-${item.question}`;
                  const itemOpen = expandedMissedItem === itemKey;

                  return (
                    <article
                      key={itemKey}
                      className="rounded-xl border border-dashed border-border/70 bg-muted/15"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedMissedItem(itemOpen ? null : itemKey)
                        }
                        className="w-full px-3 py-2 sm:px-3.5 sm:py-2.5 text-start transition-colors"
                      >
                        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground/60">
                          <span>{item.prompt_date}</span>
                          <span className="rounded-full border border-foreground/15 bg-foreground/10 px-1.5 py-0.2 text-foreground/70 text-[9px]">
                            {isArabic ? "فائت" : "Missed"}
                          </span>
                          <ChevronDown
                            className={cn(
                              "ms-auto h-3.5 w-3.5 transition-transform duration-200",
                              itemOpen && "rotate-180",
                            )}
                          />
                        </div>
                        <p className="mt-1 line-clamp-1 text-xs font-semibold text-muted-foreground/80">
                          {item.question}
                        </p>
                      </button>

                      <div
                        className="grid transition-[grid-template-rows] duration-200 ease-out-quart"
                        style={{ gridTemplateRows: itemOpen ? "1fr" : "0fr" }}
                      >
                        <div className="overflow-hidden">
                          <div className="border-t border-border/40 px-3.5 pb-3 pt-2.5">
                            <p className="text-xs font-semibold leading-relaxed text-muted-foreground">
                              {item.question}
                            </p>
                            <p className="mt-1.5 text-[11px] italic text-muted-foreground/60">
                              {isArabic
                                ? "لم يتم إرسال جواب لهذا السؤال في ذلك اليوم."
                                : "No answer was submitted for this question on that day."}
                            </p>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
