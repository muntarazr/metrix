"use client";

import { useState } from "react";
import { Check, ChevronDown, Loader2, Send, Sparkles } from "lucide-react";
import { translations, type Language } from "@/lib/translations";
import type { DailyFocusSession } from "@/lib/daily-focus";
import { cn } from "@/lib/utils";
import VoiceRecorder from "../../shared/VoiceRecorder";

interface DailyFocusQuestionSectionProps {
  language?: Language;
  isArabic: boolean;
  dailyFocus: DailyFocusSession | null;
  loading: boolean;
  submitting: boolean;
  error: string | null;
  answer: string;
  onAnswerChange: (value: string) => void;
  onAnswerSubmit: () => void;
  onAppendTranscript: (text: string) => void;
}

export function DailyFocusQuestionSection({
  language = "ar",
  isArabic,
  dailyFocus,
  loading,
  submitting,
  error,
  answer,
  onAnswerChange,
  onAnswerSubmit,
  onAppendTranscript,
}: DailyFocusQuestionSectionProps) {
  const t = translations[language];
  const hasAnswer = Boolean(dailyFocus?.answered_at);
  const [editingAnswer, setEditingAnswer] = useState(false);
  const [isAnswerExpanded, setIsAnswerExpanded] = useState(false);

  const submitDisabled = submitting || loading || !answer.trim();
  const showAnswerInput = !hasAnswer || editingAnswer;

  return (
    <section className="rounded-xl border border-border/70 bg-card p-4 sm:p-5 shadow-xs">
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary border border-primary/20 shadow-xs">
          <Sparkles className="h-3 w-3" />
          {isArabic ? "سؤال اليوم" : "Today's Question"}
        </span>

        {hasAnswer ? (
          <span className="ms-auto inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[10px] font-medium text-primary shadow-xs">
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
        </div>
      )}

      {error ? (
        <p role="alert" className="mt-3 rounded-xl border border-destructive/15 bg-destructive/10 px-3 py-2 text-xs text-destructive font-medium">
          {error}
        </p>
      ) : null}

      {/* Answer Input or Display */}
      {showAnswerInput ? (
        <div className="mt-3.5">
          {/* Quick options chips */}
          {dailyFocus?.quick_options && dailyFocus.quick_options.length > 0 && (
            <div className="mb-2.5 space-y-1.5">
              <p className="text-start text-[10px] font-bold ltr:uppercase ltr:tracking-wider rtl:tracking-normal text-muted-foreground/80">
                {isArabic ? "خيارات سريعة:" : "Quick options:"}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {dailyFocus.quick_options.map((option, idx) => {
                  const isSelected = answer.trim() === option.trim();
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          onAnswerChange("");
                        } else {
                          onAnswerChange(option);
                        }
                      }}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-all active:scale-95 text-start cursor-pointer",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground shadow-xs ring-1 ring-primary/20"
                          : "border-border/80 bg-muted/40 hover:bg-muted/70 text-foreground/90 hover:border-primary/40",
                      )}
                    >
                      <span>{option}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}



          <div className="relative">
            <textarea
              id="daily-focus-panel-answer"
              value={answer}
              onChange={(event) => {
                const val = event.target.value;
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
                  ? "اكتب جوابك باختصار (حتى 5 أسطر) أو اختر من الخيارات أعلاه..."
                  : "Write your answer briefly (up to 5 lines) or choose an option above..."
              }
              disabled={loading || submitting}
              rows={3}
              className={cn(
                "min-h-20 w-full rounded-xl border border-border/70 bg-background px-3.5 py-2.5 pb-12 pe-12 text-base sm:text-sm leading-relaxed text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-primary/30 focus:ring-2 focus:ring-primary/15",
                (loading || submitting) && "cursor-not-allowed opacity-70",
              )}
              dir={isArabic ? "rtl" : "ltr"}
            />
            <div className="pointer-events-auto absolute bottom-2 end-2">
              <VoiceRecorder
                onTranscript={onAppendTranscript}
                language={language}
                size="sm"
                statusAboveButton
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
              className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-xs sm:text-sm font-medium text-primary-foreground shadow-xs shadow-primary/20 hover:bg-primary/90 transition-all cursor-pointer active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className={cn("h-3.5 w-3.5", isArabic && "rtl:-scale-x-100")} />
              )}
              {t.submitAnswer}
            </button>
            {hasAnswer ? (
              <button
                type="button"
                onClick={() => setEditingAnswer(false)}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-border/80 bg-card px-4 text-xs sm:text-sm font-medium text-foreground shadow-xs hover:bg-accent cursor-pointer transition-all active:scale-[0.98]"
              >
                {t.cancel}
              </button>
            ) : null}
          </div>
        </div>
      ) : hasAnswer ? (
        <div className="mt-3.5 space-y-2.5">
          <div className="rounded-xl border border-border/70 bg-muted/40 shadow-xs overflow-hidden transition-all duration-200">
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
              className="flex items-center justify-between gap-2 p-2.5 sm:px-3.5 cursor-pointer hover:bg-muted/60 transition-colors select-none text-start"
            >
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform duration-200",
                    isAnswerExpanded && "rotate-180"
                  )}
                />
                <span className="text-[10px] font-bold ltr:uppercase ltr:tracking-wider rtl:tracking-normal text-muted-foreground/75 shrink-0">
                  {t.answerQuestion}
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
                  className="text-[11px] font-bold text-primary hover:underline px-1.5 py-0.5 rounded hover:bg-primary/10 transition-colors"
                >
                  {t.editSavedAnswer}
                </button>
              </div>
            </div>

            {isAnswerExpanded && (
              <div className="border-t border-border/60 bg-background/50 p-3 sm:p-3.5 animate-in fade-in-50 duration-150">
                <p className="whitespace-pre-wrap text-xs sm:text-sm leading-relaxed text-foreground font-medium">
                  {dailyFocus?.answer || "—"}
                </p>
              </div>
            )}
          </div>
          {dailyFocus?.answer_coaching ? (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 sm:p-4 shadow-xs">
              <p className="flex items-center gap-1.5 text-[10px] font-bold ltr:uppercase ltr:tracking-wider rtl:tracking-normal text-primary">
                <Sparkles className="h-3 w-3" />
                {t.aiCoachingLabel}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-foreground font-medium">
                {dailyFocus.answer_coaching}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
