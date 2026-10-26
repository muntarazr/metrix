"use client";

import { useRef, useState, useEffect, useTransition } from "react";
import {
  Plus,
  Zap,
  PenLine,
  Sparkles,
  Loader2,
} from "lucide-react";
import { translations, type Language } from "@/lib/translations";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { PANEL_SURFACE } from "@/lib/surfaces";
import { getIconComponent } from "@/components/goal/IconPicker";
import VoiceRecorder, { useVoiceGlow } from "@/components/shared/VoiceRecorder";
import { VoiceBeam } from "voice-glow";
import type { Goal } from "./HomeTypes";

interface HomeInputSectionProps {
  goals: Goal[];
  boxMode: "new" | "log";
  onBoxModeChange: (mode: "new" | "log") => void;
  goalInput: string;
  onGoalInputChange: (value: string | ((prev: string) => string)) => void;
  selectedLogGoalIds: string[];
  onToggleGoalSelection: (id: string) => void;
  onToggleSelectAllGoals: () => void;
  onNavigateToCreate?: (goalText: string, mode?: "ai" | "manual") => void;
  onDailyLogSubmit: () => void;
  logTasksLoading: boolean;
  language: Language;
  focusInputSignal?: number;
}

export default function HomeInputSection({
  goals,
  boxMode,
  onBoxModeChange,
  goalInput,
  onGoalInputChange,
  selectedLogGoalIds,
  onToggleGoalSelection,
  onToggleSelectAllGoals,
  onNavigateToCreate,
  onDailyLogSubmit,
  logTasksLoading,
  language,
  focusInputSignal,
}: HomeInputSectionProps) {
  const isArabic = language === "ar";
  const t = translations[language];
  const goalTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (focusInputSignal && focusInputSignal > 0 && boxMode === "new") {
      const timer = setTimeout(() => {
        if (goalTextareaRef.current) {
          goalTextareaRef.current.focus();
          goalTextareaRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [focusInputSignal, boxMode]);

  const voiceGlow = useVoiceGlow();
  const { isRecording, isProcessing } = voiceGlow;
  const [selectedCreationMode, setSelectedCreationMode] = useState<"ai" | "manual">("ai");

  // Goal input analysis
  const normalizedGoalInput = goalInput.trim().replace(/\s+/g, " ");

  const goalInputPlaceholder = isProcessing
    ? isArabic
      ? "جارِ المعالجة..."
      : "Processing..."
    : isRecording
      ? isArabic
        ? "جارِ الاستماع..."
        : "Listening..."
      : isArabic
        ? "اكتب هدفك هنا\u200f..."
        : "Write your goal here...";

  const resizeGoalTextarea = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = "0px";
    const computedStyle = window.getComputedStyle(textarea);
    const lineHeight = Number.parseFloat(computedStyle.lineHeight) || 24;
    const paddingTop = Number.parseFloat(computedStyle.paddingTop) || 0;
    const paddingBottom = Number.parseFloat(computedStyle.paddingBottom) || 0;
    const minHeight = lineHeight + paddingTop + paddingBottom;
    const maxHeight = lineHeight * 4.5 + paddingTop + paddingBottom;
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  };

  useEffect(() => {
    if (goalTextareaRef.current) {
      resizeGoalTextarea(goalTextareaRef.current);
    }
  }, [goalInput, boxMode]);

  const handleManualCreate = () => {
    setSelectedCreationMode("manual");
    if (!normalizedGoalInput) {
      goalTextareaRef.current?.focus();
      return;
    }
    onNavigateToCreate?.(normalizedGoalInput, "manual");
  };

  const handleAICreate = () => {
    setSelectedCreationMode("ai");
    if (!normalizedGoalInput) {
      goalTextareaRef.current?.focus();
      return;
    }
    onNavigateToCreate?.(normalizedGoalInput, "ai");
  };

  return (
    <div
      className="relative shrink-0 transition-all duration-300 pt-0"
      dir={isArabic ? "rtl" : "ltr"}
    >
      {/* Main card box */}
      <VoiceBeam
        stream={voiceGlow.stream}
        active={boxMode === "new" && voiceGlow.active}
        motion={voiceGlow.motion}
        theme={voiceGlow.theme}
        scale={1.15}
        rangeWidth={1.35}
        className="z-20"
      >
      <div
        className={cn(
          "relative flex items-stretch gap-1 sm:gap-2 overflow-hidden rounded-2xl min-h-[96px] sm:min-h-[102px]",
          PANEL_SURFACE,
          "shadow-sm shadow-black/[0.03] transition-all duration-300 ease-out dark:shadow-black/10",
          boxMode === "new"
            ? isRecording || isProcessing
              ? "border-primary/30"
              : "border-border"
            : "border-primary/25"
        )}
      >
        {/* Vertical mode toggle */}
        <div
          className="flex shrink-0 flex-col justify-center gap-1 p-1 sm:p-1.5 bg-muted/20 border-inline-end border-border/70"
          role="tablist"
          aria-label={isArabic ? "وضع الصندوق" : "Box mode"}
        >
          <button
            type="button"
            role="tab"
            aria-selected={boxMode === "new"}
            onClick={() => onBoxModeChange("new")}
            className={cn(
              "flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-200 cursor-pointer",
              boxMode === "new"
                ? "bg-primary/12 text-primary ring-1 ring-primary/25 shadow-[0_4px_12px_-6px_color-mix(in_oklch,var(--primary)_60%,transparent)]"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
            title={t.modeNewGoal}
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={boxMode === "log"}
            onClick={() => onBoxModeChange("log")}
            disabled={goals.length === 0}
            className={cn(
              "flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-200 cursor-pointer",
              boxMode === "log"
                ? "bg-primary/12 text-primary ring-1 ring-primary/25 shadow-[0_4px_12px_-6px_color-mix(in_oklch,var(--primary)_45%,transparent)]"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
            )}
            title={t.modeDailyLog}
          >
            <Zap className="h-4 w-4" />
          </button>
        </div>

        {/* Content area */}
        {boxMode === "new" ? (
          /* ===== NEW GOAL MODE ===== */
          <div className="relative min-w-0 flex-1 flex flex-col justify-between min-h-[96px] sm:min-h-[102px]">
            <div
              className={cn(
                "pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b to-transparent",
                "from-primary/12 via-primary/12"
              )}
            />
            <div className="relative z-10 flex-1 flex flex-col min-h-0 px-2 pt-1.5 pb-0.5 sm:px-3 sm:pt-2 sm:pb-1">
              <Textarea
                ref={goalTextareaRef}
                rows={1}
                value={goalInput}
                onChange={(e) => {
                  onGoalInputChange(e.target.value);
                  resizeGoalTextarea(e.currentTarget);
                }}
                onInput={(e) => resizeGoalTextarea(e.currentTarget)}
                placeholder={goalInputPlaceholder}
                className={cn(
                  "flex-1 min-h-[38px] sm:min-h-[42px] max-h-[140px] resize-none overflow-y-hidden border-0 bg-transparent px-2 sm:px-2.5 py-1 sm:py-1.5 shadow-none scrollbar-thin",
                  "text-sm font-medium leading-[1.65] text-foreground sm:text-base sm:leading-[1.7] md:text-base",
                  "placeholder:text-muted-foreground/50",
                  "focus-visible:border-0 focus-visible:ring-0 focus-visible:ring-offset-0",
                  "dark:bg-transparent",
                  isArabic ? "text-right" : "text-left",
                  isRecording && "placeholder:text-primary/80 caret-primary"
                )}
                dir={isArabic ? "rtl" : "auto"}
              />
            </div>
            <div
              className={cn(
                "relative z-10 flex flex-row-reverse items-center justify-between gap-2 px-2 pb-2 pt-0 sm:items-center sm:px-3 sm:pb-2.5",
                isArabic ? "sm:flex-row-reverse" : "sm:flex-row"
              )}
            >
              <VoiceRecorder
                size="responsive"
                language={language}
                onStreamChange={voiceGlow.setStream}
                onRecordingChange={voiceGlow.setIsRecording}
                onProcessingChange={voiceGlow.setIsProcessing}
                onTranscript={(transcript) => {
                  onGoalInputChange((prev) =>
                    prev ? `${prev} ${transcript}` : transcript
                  );
                }}
              />
              <div
                className={cn(
                  "grid min-w-0 flex-1 grid-cols-2 gap-1.5 sm:w-auto sm:flex-none sm:gap-2 sm:min-w-[280px]"
                )}
                dir={isArabic ? "rtl" : "ltr"}
              >
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleManualCreate}
                  aria-pressed={selectedCreationMode === "manual"}
                  className={cn(
                    "w-full h-9 min-w-0 gap-1 sm:gap-2 rounded-full border px-1.5 sm:px-4 text-[11px] min-[380px]:text-xs font-semibold shadow-none transition-all duration-200 sm:h-10 sm:text-sm cursor-pointer",
                    selectedCreationMode === "manual"
                      ? "border-foreground/25 bg-foreground/12 text-foreground ring-1 ring-foreground/15"
                      : "border-border bg-background text-muted-foreground/90 hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  <PenLine className="size-3.5 sm:size-4 shrink-0" />
                  <span className="truncate">{isArabic ? "يدوي" : "Manual"}</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAICreate}
                  aria-pressed={selectedCreationMode === "ai"}
                  className={cn(
                    "w-full h-9 min-w-0 gap-1 sm:gap-2 rounded-full border px-1.5 sm:px-4 text-[11px] min-[380px]:text-xs font-semibold shadow-none transition-all duration-300 sm:h-10 sm:text-sm cursor-pointer",
                    selectedCreationMode === "ai"
                      ? "border-primary/25 bg-primary/12 text-primary ring-1 ring-primary/15 hover:bg-primary/15"
                      : "border-border bg-background text-muted-foreground/90 hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  <Sparkles className="size-3.5 sm:size-4 shrink-0" />
                  <span className="truncate">{isArabic ? "ذكاء اصطناعي" : "AI Plan"}</span>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* ===== DAILY LOG MODE ===== */
          <div className="relative min-w-0 flex-1 flex flex-col justify-between min-h-[96px] sm:min-h-[102px]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-primary/10 to-transparent" />
            <div className="relative flex-1 px-2 pt-1.5 pb-1 sm:px-3 sm:pt-2 sm:pb-1.5 flex flex-col justify-center min-h-[38px]">
              {goals.length === 0 ? (
                <div className="flex items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/12 px-3 py-2 text-center">
                  <p className="text-xs text-muted-foreground/75">
                    {t.noGoalsToLog}
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-1.5 max-h-[64px] sm:max-h-[68px] overflow-y-auto overscroll-contain scrollbar-thin py-0.5">
                  {goals.length > 1 && (
                    <button
                      type="button"
                      onClick={onToggleSelectAllGoals}
                      className={cn(
                        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition-all duration-150 cursor-pointer active:scale-95",
                        selectedLogGoalIds.length === goals.length
                          ? "border-primary/40 bg-primary/15 text-primary font-semibold"
                          : "border-dashed border-border/80 bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
                      )}
                    >
                      <span>
                        {selectedLogGoalIds.length === goals.length
                          ? (isArabic ? "إلغاء الكل" : "None")
                          : (isArabic ? "الكل" : "All")}
                      </span>
                    </button>
                  )}

                  {goals.map((goal) => {
                    const Icon = getIconComponent(goal.icon || "Target");
                    const currentPoints = goal.current_points ?? 0;
                    const targetPoints = goal.target_points ?? 0;
                    const progress =
                      targetPoints > 0
                        ? Math.round((currentPoints / targetPoints) * 100)
                        : 0;
                    const isSelected = selectedLogGoalIds.includes(goal.id);
                    return (
                      <button
                        key={goal.id}
                        type="button"
                        onClick={() => onToggleGoalSelection(goal.id)}
                        aria-pressed={isSelected}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all duration-150 cursor-pointer active:scale-95",
                          isSelected
                            ? "border-primary bg-primary/12 text-primary ring-1 ring-primary/25 font-semibold shadow-xs"
                            : "border-border bg-background text-muted-foreground hover:border-primary/25 hover:bg-primary/10 hover:text-foreground opacity-75 hover:opacity-100"
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border transition-all duration-150",
                            isSelected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-primary/25 bg-primary/12 text-primary"
                          )}
                        >
                          <Icon className="h-2.5 w-2.5" />
                        </span>
                        <span className="max-w-[115px] min-[380px]:max-w-[140px] sm:max-w-[180px] truncate">{goal.title}</span>
                        <span
                          className={cn(
                            "tabular-nums text-[10px] font-bold transition-opacity",
                            isSelected ? "opacity-90" : "opacity-50"
                          )}
                        >
                          {progress}%
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Action Button */}
            <div className="px-2 pb-2 pt-0 sm:px-3 sm:pb-2.5">
              <Button
                type="button"
                disabled={
                  selectedLogGoalIds.length === 0 ||
                  logTasksLoading ||
                  goals.length === 0
                }
                onClick={onDailyLogSubmit}
                className={cn(
                  "w-full h-9 sm:h-10 rounded-xl px-4 text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer",
                  selectedLogGoalIds.length === 0 || goals.length === 0
                    ? "bg-muted/60 text-muted-foreground/50 cursor-not-allowed shadow-none"
                    : "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 active:scale-[0.99]"
                )}
              >
                {logTasksLoading ? (
                  <Loader2 className="size-3.5 sm:size-4 shrink-0 animate-spin" />
                ) : (
                  <Zap className="size-3.5 shrink-0" />
                )}
                <span>
                  {isArabic ? "تسجيل التقدّم اليوم" : "Log Today's Progress"}
                </span>
                {selectedLogGoalIds.length > 1 && (
                  <span className="inline-flex items-center justify-center rounded-full bg-primary-foreground/20 px-1.5 py-0.5 text-[10px] font-bold tabular-nums">
                    {selectedLogGoalIds.length}
                  </span>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
      </VoiceBeam>
    </div>
  );
}
