"use client";

import { useRef, useState, useEffect, useTransition } from "react";
import {
  CircleAlert,
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
import VoiceRecorder from "@/components/shared/VoiceRecorder";
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

const MINIMUM_GOAL_WORDS = 15;

const PROMPT_MESSAGES = {
  ar: {
    5: "وضّح النتيجة التي تريد الوصول لها وما الذي تريد تغييره فعلاً.",
    4: "أضف لماذا هذا الهدف مهم لك أو ما الأثر الذي تنتظره منه.",
    3: "زد وقتاً أو ظرفاً مهماً حتى تصبح الخطة أقرب لواقعك.",
    2: "الوصف صار أفضل، وأي تفصيل عن النتيجة سيجعل البداية أدق.",
    1: "باقي توضيح صغير عن الهدف حتى نبدأ بخطة أوضح.",
  },
  en: {
    5: "Clarify the result you want and what you want to change.",
    4: "Add why this goal matters or the impact you expect from it.",
    3: "Add timing or context so the plan feels closer to your reality.",
    2: "This is clearer now, and one more outcome detail will sharpen the start.",
    1: "One small clarification will help us start with a clearer plan.",
  },
} as const;

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

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAIDetailPrompt, setShowAIDetailPrompt] = useState(false);
  const [selectedCreationMode, setSelectedCreationMode] = useState<"ai" | "manual">("ai");

  // Goal input analysis
  const normalizedGoalInput = goalInput.trim().replace(/\s+/g, " ");
  const goalWordCount = normalizedGoalInput ? normalizedGoalInput.split(" ").length : 0;
  const goalNeedsMoreDetail = normalizedGoalInput.length > 0 && goalWordCount < MINIMUM_GOAL_WORDS;
  const aiPromptVisible = showAIDetailPrompt && goalNeedsMoreDetail;

  const promptColorStage = !goalNeedsMoreDetail
    ? 0
    : goalWordCount < 3
      ? 5
      : goalWordCount < 6
        ? 4
        : goalWordCount < 9
          ? 3
          : goalWordCount < 12
            ? 2
            : 1;

  const promptToneClasses =
    promptColorStage === 5 || promptColorStage === 4
      ? "border-foreground/25 bg-gradient-to-b from-foreground/12 via-foreground/12 to-background"
      : promptColorStage === 3 || promptColorStage === 2
        ? "border-foreground/15 bg-gradient-to-b from-foreground/12 via-foreground/12 to-background"
        : "border-foreground/15 bg-gradient-to-b from-foreground/12 via-background/90 to-background";

  const promptCardClasses =
    promptColorStage === 5 || promptColorStage === 4
      ? "border-foreground/25 bg-foreground/12"
      : "border-foreground/15 bg-foreground/12";

  const goalPromptMessage = goalNeedsMoreDetail
    ? isArabic
      ? PROMPT_MESSAGES.ar[promptColorStage as 1 | 2 | 3 | 4 | 5]
      : PROMPT_MESSAGES.en[promptColorStage as 1 | 2 | 3 | 4 | 5]
    : null;

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
    const lineHeight = Number.parseFloat(computedStyle.lineHeight) || 28;
    const paddingTop = Number.parseFloat(computedStyle.paddingTop) || 0;
    const paddingBottom = Number.parseFloat(computedStyle.paddingBottom) || 0;
    const minHeight = lineHeight + paddingTop + paddingBottom;
    const maxHeight = lineHeight * 4 + paddingTop + paddingBottom;
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  };

  const handleManualCreate = () => {
    setSelectedCreationMode("manual");
    if (!normalizedGoalInput) {
      goalTextareaRef.current?.focus();
      return;
    }
    setShowAIDetailPrompt(false);
    onNavigateToCreate?.(normalizedGoalInput, "manual");
  };

  const handleAICreate = () => {
    setSelectedCreationMode("ai");
    if (!normalizedGoalInput) {
      goalTextareaRef.current?.focus();
      return;
    }
    if (goalNeedsMoreDetail) {
      setShowAIDetailPrompt(true);
      return;
    }
    setShowAIDetailPrompt(false);
    onNavigateToCreate?.(normalizedGoalInput, "ai");
  };

  return (
    <div
      className={cn(
        "relative shrink-0 transition-all duration-300",
        aiPromptVisible && boxMode === "new" ? "pt-12 min-[400px]:pt-11 sm:pt-11" : "pt-0"
      )}
      dir={isArabic ? "rtl" : "ltr"}
    >
      {/* Floating detail hint banner */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 z-10 overflow-hidden transition-all duration-300",
          aiPromptVisible && boxMode === "new"
            ? "h-[5.5rem] opacity-100 sm:h-[5.75rem]"
            : "h-0 opacity-0"
        )}
      >
        <div
          className={cn(
            "rounded-t-[22px] border border-b-0 px-3 pt-1.5 pb-6 sm:px-5 sm:pt-1.5 sm:pb-9",
            promptToneClasses
          )}
        >
          <div
            role="status"
            aria-live="polite"
            className={cn(
              "flex items-center gap-2 sm:gap-3 text-xs sm:text-sm font-medium leading-4 sm:leading-6 text-foreground",
              isArabic ? "flex-row-reverse text-right" : "text-left"
            )}
          >
            <div className="shrink-0 rounded-full border border-primary/25 bg-background/60 p-1.5 backdrop-blur">
              <CircleAlert className="size-4 shrink-0 text-primary" />
            </div>
            <p
              id="goal-ai-detail-prompt"
              className="flex-1 text-xs sm:text-[13px] font-semibold leading-4 sm:leading-5 text-foreground/90 line-clamp-2"
            >
              {goalPromptMessage}
            </p>
          </div>
        </div>
      </div>

      {/* Main card box */}
      <div
        className={cn(
          "relative z-20 flex items-stretch gap-1 sm:gap-2 overflow-hidden rounded-2xl min-h-[114px] sm:min-h-[118px]",
          PANEL_SURFACE,
          "shadow-sm shadow-black/[0.03] transition-all duration-300 ease-out dark:shadow-black/10",
          boxMode === "new"
            ? isRecording
              ? "border-destructive/45 bg-destructive/12"
              : isProcessing
                ? "border-primary/25 bg-primary/12"
                : aiPromptVisible
                  ? promptCardClasses
                  : "border-border"
            : "border-primary/25"
        )}
      >
        {/* Vertical mode toggle */}
        <div
          className="flex shrink-0 flex-col gap-1 p-1 sm:p-1.5 bg-muted/20 border-inline-end border-border/70"
          role="tablist"
          aria-label={isArabic ? "وضع الصندوق" : "Box mode"}
        >
          <button
            type="button"
            role="tab"
            aria-selected={boxMode === "new"}
            onClick={() => onBoxModeChange("new")}
            className={cn(
              "flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl transition-all duration-200 cursor-pointer",
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
              "flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl transition-all duration-200 cursor-pointer",
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
          <div className="relative min-w-0 flex-1 flex flex-col justify-between min-h-[114px] sm:min-h-[118px]">
            <div
              className={cn(
                "pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b to-transparent",
                isRecording
                  ? "from-destructive/12 via-destructive/12"
                  : isProcessing
                    ? "from-primary/12 via-primary/12"
                    : "from-primary/12 via-primary/12"
              )}
            />
            <div className="relative px-2 pt-2 pb-1.5 sm:px-3 sm:pt-2.5 sm:pb-2.5">
              <Textarea
                ref={goalTextareaRef}
                rows={1}
                value={goalInput}
                onChange={(e) => {
                  const val = e.target.value;
                  onGoalInputChange(val);
                  const norm = val.trim().replace(/\s+/g, " ");
                  const words = norm ? norm.split(" ").length : 0;
                  if (words >= MINIMUM_GOAL_WORDS) {
                    setShowAIDetailPrompt(false);
                  }
                  resizeGoalTextarea(e.currentTarget);
                }}
                onInput={(e) => resizeGoalTextarea(e.currentTarget)}
                placeholder={goalInputPlaceholder}
                aria-describedby={aiPromptVisible ? "goal-ai-detail-prompt" : undefined}
                className={cn(
                  "min-h-[44px] max-h-[132px] resize-none overflow-y-hidden border-0 bg-transparent px-2 sm:px-3 py-1.5 sm:py-2 shadow-none scrollbar-thin",
                  "text-base font-medium leading-6 text-foreground sm:text-base sm:leading-7 md:text-base",
                  "placeholder:text-muted-foreground/50",
                  "focus-visible:border-0 focus-visible:ring-0 focus-visible:ring-offset-0",
                  "dark:bg-transparent",
                  isArabic ? "text-right" : "text-left",
                  isRecording && "placeholder:text-destructive/75 caret-destructive"
                )}
                dir={isArabic ? "rtl" : "auto"}
              />
            </div>
            <div
              className={cn(
                "flex flex-row-reverse items-center justify-between gap-2 px-2 pb-2 pt-0 sm:items-center sm:px-3 sm:pb-3",
                isArabic ? "sm:flex-row-reverse" : "sm:flex-row"
              )}
            >
              <VoiceRecorder
                language={language}
                onRecordingChange={setIsRecording}
                onProcessingChange={setIsProcessing}
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
                    aiPromptVisible
                      ? "border-primary/45 bg-primary/12 text-primary"
                      : selectedCreationMode === "ai"
                        ? "border-primary/25 bg-primary/12 text-primary ring-1 ring-primary/15 hover:bg-primary/12"
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
          <div className="relative min-w-0 flex-1 flex flex-col justify-between min-h-[114px] sm:min-h-[118px]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-primary/10 to-transparent" />
            <div className="relative flex-1 px-2 pt-2 pb-1.5 sm:px-3 sm:pt-2.5 sm:pb-2.5 flex flex-col justify-center min-h-[44px]">
              {goals.length === 0 ? (
                <div className="flex items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/12 px-3 py-3 text-center">
                  <p className="text-xs text-muted-foreground/75">
                    {t.noGoalsToLog}
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-1.5 max-h-[76px] overflow-y-auto overscroll-contain scrollbar-thin py-0.5">
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
            <div className="px-2 pb-2 pt-0 sm:px-3 sm:pb-3">
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
    </div>
  );
}
