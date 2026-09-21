"use client";

import { useState } from "react";
import { ChevronDown, Loader2, Send, Sparkles, X } from "lucide-react";
import { translations, type Language } from "@/lib/translations";
import type { DailyFocusSession } from "@/lib/daily-focus";
import { cn } from "@/lib/utils";
import VoiceRecorder from "@/components/shared/VoiceRecorder";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

interface DailyFocusQuestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language?: Language;
  isArabic: boolean;
  dailyFocus: DailyFocusSession | null;
  loading: boolean;
  submitting: boolean;
  error?: string | null;
  answer: string;
  onAnswerChange: (value: string) => void;
  onAppendTranscript: (text: string) => void;
  onSubmit: () => void;
}

export default function DailyFocusQuestionDialog({
  open,
  onOpenChange,
  language = "ar",
  isArabic,
  dailyFocus,
  loading,
  submitting,
  error,
  answer,
  onAnswerChange,
  onAppendTranscript,
  onSubmit,
}: DailyFocusQuestionDialogProps) {
  const t = translations[language];
  const [questionWhyOpen, setQuestionWhyOpen] = useState(false);
  const submitDisabled = submitting || loading || !answer.trim();

  const currentQuestionNumber = Math.max(
    1,
    (dailyFocus?.answered_days_count || 0) + (dailyFocus?.answered_at ? 0 : 1),
  );
  const cycleTotal = Math.max(1, dailyFocus?.required_answer_days || 5);
  const cycleStep = Math.min(currentQuestionNumber, cycleTotal);
  const cycleLabel = isArabic
    ? `${cycleStep} من ${cycleTotal}`
    : `${cycleStep} of ${cycleTotal}`;
  const questionLabel = isArabic
    ? `السؤال ${currentQuestionNumber}`
    : `Q${currentQuestionNumber}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          // Mobile: bottom sheet
          "fixed bottom-0 left-0 right-0 top-auto w-full max-w-none translate-x-0 translate-y-0",
          "rounded-t-[1.5rem] rounded-b-none",
          // Desktop: centered modal (medium width)
          "sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2",
          "sm:w-full sm:max-w-xl",
          "sm:-translate-x-1/2 sm:-translate-y-1/2",
          "sm:rounded-3xl",
          // Base styles
          "gap-0 overflow-hidden border border-border/70 bg-background p-0",
          "shadow-lg sm:shadow-lg",
          "dark:border-white/8 dark:shadow-lg dark:sm:shadow-lg",
        )}
        dir={isArabic ? "rtl" : "ltr"}
      >
        <div className="flex max-h-[88svh] flex-col sm:max-h-[min(88svh,52rem)]">
          {/* Single custom close button — logical inset for LTR/RTL */}
          <DialogClose 
            aria-label={isArabic ? "إغلاق" : "Close"}
            className="absolute top-3 end-3 z-10 flex size-8 items-center justify-center rounded-full bg-muted/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:top-4 sm:end-4"
          >
            <X className="size-4" />
            <span className="sr-only">{isArabic ? "إغلاق" : "Close"}</span>
          </DialogClose>

          {/* ── Scroll area ── */}
          <div className="flex-1 overflow-y-auto pb-4">
            {/* Mobile drag handle */}
            <div className="flex justify-center pt-2 sm:hidden">
              <div className="h-1 w-10 rounded-full bg-foreground/12" />
            </div>

            {/* Header — padding respects dir; title scale is medium */}
            <div className="px-5 pt-4 pb-3 pe-12 sm:px-7 sm:pt-5 sm:pb-4 sm:pe-14">
              <DialogHeader
                className={cn(
                  "gap-0 space-y-0 !text-start sm:!text-start items-start",
                )}
              >
                {/* Badge row: logical separator works in both directions */}
                  <div
                    className={cn(
                      "mb-2.5 flex flex-wrap items-center gap-x-2 gap-y-2 justify-start",
                    )}
                  >
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/8 px-3 py-1.5 text-[11px] font-bold ltr:uppercase ltr:tracking-wide rtl:tracking-normal text-primary dark:bg-primary/20">
                    <Sparkles className="size-3.5 shrink-0" aria-hidden />
                    {t.dailyFocus}
                  </span>
                  <bdi className="text-[12px] font-semibold tabular-nums text-muted-foreground/75 ms-0.5 border-s border-border ps-2.5 dark:border-white/10">
                    {cycleLabel}
                  </bdi>
                </div>

                <DialogTitle className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  {t.todayQuestion}
                </DialogTitle>

                <DialogDescription className="sr-only">
                  {t.dailyAiQuestionDesc}
                </DialogDescription>
              </DialogHeader>
            </div>

            {/* Divider */}
            <div className="mx-5 h-px bg-border/60 sm:mx-7" />

            {/* Question block */}
            <div className="px-5 py-4 sm:px-7 sm:py-4">
              {/* Question number label */}
              <p className="mb-2 text-[10px] font-bold ltr:uppercase ltr:tracking-[0.18em] rtl:tracking-normal text-primary/75 sm:text-[11px]">
                {questionLabel}
              </p>

              {loading && !dailyFocus ? (
                <div className="space-y-3">
                  <div className="h-4 w-full animate-pulse rounded-full bg-muted" />
                  <div className="h-4 w-5/6 animate-pulse rounded-full bg-muted" />
                  <div className="h-4 w-4/6 animate-pulse rounded-full bg-muted" />
                </div>
              ) : (
                <>
                  <p
                    className={cn(
                      "whitespace-pre-line text-[15px] font-semibold leading-8 text-foreground sm:text-base sm:leading-8",
                      "text-start break-words",
                    )}
                  >
                    {dailyFocus?.question || t.dailyFocusUnavailable}
                  </p>

                  {dailyFocus?.question_why && (
                    <div className={cn("mt-3 rounded-xl border border-primary/15 bg-primary/12 dark:bg-white/5 sm:rounded-2xl")}>
                      <button
                        type="button"
                        id="daily-focus-why-trigger"
                        aria-expanded={questionWhyOpen}
                        aria-controls="daily-focus-why-content"
                        onClick={() => setQuestionWhyOpen(!questionWhyOpen)}
                        className={cn(
                          "flex w-full items-center justify-between gap-2 px-3.5 py-2.5 sm:px-4 sm:py-3",
                          "text-[10px] font-bold ltr:uppercase ltr:tracking-wider rtl:tracking-normal text-primary/75 sm:text-[11px]",
                          "transition-colors hover:text-primary",
                        )}
                      >
                        <span>{t.questionWhyLabel}</span>
                        <ChevronDown
                          className={cn(
                            "size-3.5 shrink-0 transition-transform duration-200",
                            questionWhyOpen && "rotate-180",
                          )}
                        />
                      </button>
                      {questionWhyOpen && (
                        <div id="daily-focus-why-content" className="px-3.5 pb-2.5 sm:px-4 sm:pb-3">
                          <p
                            className={cn(
                              "whitespace-pre-line text-[13px] leading-relaxed text-muted-foreground font-medium",
                              "text-start",
                            )}
                          >
                            {dailyFocus.question_why}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Divider */}
            <div className="mx-5 h-px bg-border/20 sm:mx-7" />

            {/* Error alert if any */}
            {error && (
              <div role="alert" className="mx-5 my-2.5 sm:mx-7 rounded-xl border border-destructive/20 bg-destructive/10 px-3.5 py-2.5 text-xs font-medium text-destructive">
                {error}
              </div>
            )}

            {/* Answer area */}
            <div className="px-5 pt-3 pb-2 sm:px-7">
              <label 
                htmlFor="daily-focus-dialog-answer"
                className="mb-1.5 block text-start text-[10px] font-bold ltr:uppercase ltr:tracking-[0.18em] rtl:tracking-normal text-muted-foreground/90 sm:text-[11px]"
              >
                {t.answerQuestion}
              </label>

              <div className="relative">
                <textarea
                  id="daily-focus-dialog-answer"
                  value={answer}
                  onChange={(e) => onAnswerChange(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                      e.preventDefault();
                      if (!submitDisabled) onSubmit();
                    }
                  }}
                  placeholder={t.answerQuestionPlaceholder}
                  disabled={loading || submitting}
                  rows={3}
                  className={cn(
                    "w-full resize-none rounded-2xl border-2 border-border/70 bg-muted/20",
                    "min-h-[7.5rem] sm:min-h-[9rem]",
                    "px-4 py-3.5 pb-14 pe-14",
                    "text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/50 sm:text-[15px]",
                    "text-start outline-none transition-all duration-200",
                    "focus:border-primary/25 focus:bg-background focus:ring-4 focus:ring-primary/15",
                    "dark:bg-white/5 dark:border-white/5 dark:focus:bg-white/10",
                    (loading || submitting) && "cursor-not-allowed opacity-60",
                  )}
                  dir={isArabic ? "rtl" : "ltr"}
                />

                {/* Mic: inset-inline-end follows RTL/LTR */}
                <div
                  className={cn(
                    "absolute bottom-3 end-3 flex flex-col",
                    isArabic ? "items-start" : "items-end",
                  )}
                >
                  <VoiceRecorder
                    onTranscript={onAppendTranscript}
                    language={language}
                    size="sm"
                    statusAboveButton
                    className="gap-1"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="border-t border-border/70 bg-background px-5 py-3 sm:px-7 sm:py-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-4">
            <button
              type="button"
              onClick={onSubmit}
              disabled={submitDisabled}
              className={cn(
                "group relative flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 sm:h-11 sm:rounded-2xl",
                "text-sm font-bold text-primary-foreground sm:text-[0.9375rem]",
                "transition-all duration-200",
                "hover:brightness-110 active:scale-[0.99] shadow-md shadow-primary/12",
                "disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none",
              )}
            >
              {submitting ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <>
                  <Send
                    className="size-[1.125rem] shrink-0 transition-transform group-hover:-translate-y-0.5 ltr:group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5"
                    aria-hidden
                  />
                  <span>{t.submitAnswer}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
