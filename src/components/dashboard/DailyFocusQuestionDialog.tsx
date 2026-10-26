"use client";

import { Loader2, Send, Sparkles, X } from "lucide-react";
import { translations, type Language } from "@/lib/translations";
import type { DailyFocusSession } from "@/lib/daily-focus";
import { cn } from "@/lib/utils";
import VoiceRecorder, { useVoiceGlow } from "@/components/shared/VoiceRecorder";
import { VoiceBeam } from "voice-glow";
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
  const voiceGlow = useVoiceGlow();
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
          "rounded-t-2xl rounded-b-none",
          // Desktop: centered modal (matching LogModeSelectScreen / AIDailyLogScreen)
          "sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2",
          "sm:w-full sm:max-w-lg",
          "sm:-translate-x-1/2 sm:-translate-y-1/2",
          "sm:rounded-3xl",
          // Base styles
          "flex max-h-[92dvh] sm:max-h-[88dvh] flex-col gap-0 overflow-hidden border border-border bg-card p-0",
          "shadow-2xl shadow-black/10",
        )}
        dir={isArabic ? "rtl" : "ltr"}
      >
        <div className="flex max-h-[92dvh] sm:max-h-[88dvh] flex-col min-h-0 w-full">
          {/* ── Header ── */}
          <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-border/70 flex justify-between items-center gap-3 shrink-0">
            <DialogHeader
              className={cn(
                "flex-1 min-w-0 gap-0.5 space-y-0 !text-start sm:!text-start items-start",
              )}
            >
              {/* Unified top row: Title + Badge + Counter */}
              <div className="flex flex-wrap items-center gap-2 w-full">
                <DialogTitle className="text-base sm:text-lg font-extrabold text-foreground tracking-tight truncate">
                  {t.dailyFocus}
                </DialogTitle>
                <span className="inline-flex items-center gap-1 rounded-lg bg-primary/12 border border-primary/20 px-2 py-0.5 text-xs font-bold text-primary shrink-0">
                  <Sparkles className="size-3 shrink-0" aria-hidden />
                  {questionLabel}
                </span>
                {dailyFocus?.required_answer_days && (
                  <span className="text-[11px] font-semibold text-muted-foreground/75 shrink-0">
                    ({cycleLabel})
                  </span>
                )}
              </div>

              {/* Subtitle / context description */}
              <DialogDescription className="text-xs text-muted-foreground/75 font-semibold mt-0.5 leading-relaxed truncate w-full text-start">
                {t.dailyAiQuestionDesc}
              </DialogDescription>
            </DialogHeader>

            <DialogClose
              aria-label={isArabic ? "إغلاق" : "Close"}
              className="p-2 hover:bg-muted/60 rounded-xl transition-all duration-200 active:scale-95 shrink-0 border border-border/45 hover:border-border/70 text-muted-foreground hover:text-foreground touch-manipulation cursor-pointer"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="sr-only">{isArabic ? "إغلاق" : "Close"}</span>
            </DialogClose>
          </div>

          {/* ── Scroll area ── */}
          <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-3.5 sm:space-y-4 overflow-y-auto overscroll-contain flex-1">
            {/* Question block */}
            <div className="p-3.5 sm:p-4 bg-primary/[0.08] border border-primary/20 rounded-xl shadow-2xs">
              {loading && !dailyFocus ? (
                <div className="space-y-2.5">
                  <div className="h-4 w-full animate-pulse rounded-full bg-muted" />
                  <div className="h-4 w-5/6 animate-pulse rounded-full bg-muted" />
                  <div className="h-4 w-4/6 animate-pulse rounded-full bg-muted" />
                </div>
              ) : (
                <p
                  className={cn(
                    "whitespace-pre-line text-sm sm:text-[15px] font-semibold leading-relaxed sm:leading-7 text-foreground",
                    "text-start break-words",
                  )}
                >
                  {dailyFocus?.question || t.dailyFocusUnavailable}
                </p>
              )}
            </div>

            {/* Error alert if any */}
            {error && (
              <div
                role="alert"
                className="rounded-xl border border-destructive/20 bg-destructive/12 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-destructive"
              >
                {error}
              </div>
            )}

            {/* Dynamic Quick Options Chips */}
            {dailyFocus?.quick_options && dailyFocus.quick_options.length > 0 && (
              <div className="space-y-1.5">
                <p className="px-1 text-start text-xs font-bold ltr:uppercase ltr:tracking-wider rtl:tracking-normal text-muted-foreground/75">
                  {isArabic
                    ? "خيارات سريعة (اختر مباشرة أو اكتب أدناه):"
                    : "Quick Options (tap to pick or write below):"}
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
                          "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-95 text-start cursor-pointer",
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground shadow-xs ring-2 ring-primary/20"
                            : "border-border/70 bg-muted/20 hover:bg-muted/60 text-foreground/90 hover:border-primary/40",
                        )}
                      >
                        <span>{option}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Answer area */}
            <div className="space-y-1.5 sm:space-y-2">
              <div className="flex items-center justify-between px-1">
                <label
                  htmlFor="daily-focus-dialog-answer"
                  className="text-xs sm:text-sm font-bold text-muted-foreground/75 ltr:uppercase ltr:tracking-wider rtl:tracking-normal cursor-pointer"
                >
                  {t.answerQuestion}
                </label>
              </div>

              <div className="relative">
                <VoiceBeam
                  stream={voiceGlow.stream}
                  active={voiceGlow.active}
                  motion={voiceGlow.motion}
                  theme={voiceGlow.theme}
                >
                  <textarea
                    id="daily-focus-dialog-answer"
                    value={answer}
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
                        if (!submitDisabled) onSubmit();
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
                      "block w-full h-28 sm:h-36 min-h-[100px] sm:min-h-[110px] p-3.5 sm:p-4 pb-12 sm:pb-14 pe-12 sm:pe-14 rounded-2xl resize-none",
                      "border border-border/70 bg-muted/20 text-foreground placeholder:text-muted-foreground/50",
                      "text-base leading-relaxed text-start outline-none transition-all duration-200",
                      "focus:border-primary/50 focus:bg-card focus:ring-1 focus:ring-primary/20",
                      (loading || submitting) && "cursor-not-allowed opacity-60",
                    )}
                    dir={isArabic ? "rtl" : "ltr"}
                  />
                </VoiceBeam>

                <div className="absolute bottom-2.5 end-2.5 z-10">
                  <VoiceRecorder
                    onTranscript={onAppendTranscript}
                    onStreamChange={voiceGlow.setStream}
                    onRecordingChange={voiceGlow.setIsRecording}
                    onProcessingChange={voiceGlow.setIsProcessing}
                    language={language}
                    size="sm"
                    statusAboveButton
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="px-4 py-3 sm:px-6 sm:py-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-4 border-t border-border/70 bg-card shrink-0">
            <button
              type="button"
              onClick={onSubmit}
              disabled={submitDisabled}
              className={cn(
                "group relative flex h-11 sm:h-12 w-full items-center justify-center gap-2 rounded-xl sm:rounded-2xl bg-primary px-5",
                "text-sm sm:text-base font-bold text-primary-foreground",
                "transition-all duration-200 cursor-pointer",
                "hover:bg-primary/90 active:scale-[0.98] shadow-md shadow-primary/12",
                "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none",
              )}
            >
              {submitting ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <>
                  <Send
                    className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 transition-transform group-hover:-translate-y-0.5 ltr:group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5"
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
