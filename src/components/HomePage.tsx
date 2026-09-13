"use client";

import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import {
  Mic,
  StopCircle,
  Loader2,
  Pin,
  Target,
  PenLine,
  Sparkles,
  CircleAlert,
  ListChecks,
  Bell,
  Clock,
  Plus,
  Zap,
} from "lucide-react";
import { translations, type Language } from "@/lib/translations";
import type { GoalTaskStats } from "@/app/page";
import { BrandLockup } from "@/components/brand/Logo";
import { getIconComponent } from "./goal/IconPicker";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { PANEL_SURFACE, WELL_SURFACE } from "@/lib/surfaces";
import { getGoalEndDaysChip } from "@/lib/goal-dates";
import GoalProgressBar from "@/components/shared/GoalProgressBar";
import { createClient } from "@/utils/supabase/client";
import { getLocalDateKey } from "@/lib/task-periods";
import {
  useSmartNotifications,
} from "@/hooks/useSmartNotifications";
import NotificationBellPopover from "@/components/notifications/NotificationBellPopover";
import AICoachBanner from "@/components/notifications/AICoachBanner";
import ProgressLogDialog from "./progress/ProgressLogDialog";
import type { TaskRow } from "@/lib/task-hierarchy";
import { apiUrl } from "@/lib/api";

interface Goal {
  id: string;
  title: string;
  current_points: number;
  target_points: number;
  status: string;
  created_at: string;
  estimated_completion_date?: string | null;
  icon?: string;
  is_pinned?: boolean;
  ai_summary?: string;
}

interface HomePageProps {
  goals: Goal[];
  taskStatsMap?: Record<string, GoalTaskStats>;
  onSelectGoal: (id: string) => void;
  onNavigateToCreate?: (goalText: string, mode: "ai" | "manual") => void;
  language?: Language;
  recentGoalsLimit?: number;
}

/* ------------------------------------------------------------------ */
/*  HomePage component                                                 */
/* ------------------------------------------------------------------ */

export default function HomePage({
  goals,
  taskStatsMap = {},
  onSelectGoal,
  onNavigateToCreate,
  language = "ar",
  recentGoalsLimit = 6,
}: HomePageProps) {
  const [goalInput, setGoalInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAIDetailPrompt, setShowAIDetailPrompt] = useState(false);
  const [selectedCreationMode, setSelectedCreationMode] =
    useState<"ai" | "manual">("ai");
  const goalTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const isArabic = language === "ar";
  const safeRecentGoalsLimit = Math.max(1, recentGoalsLimit);
  const recentGoals = goals.slice(0, safeRecentGoalsLimit);

  /* ---- Dual-mode box state ---- */
  /**
   * Landing mode for the dual-mode box.
   *
   * Creating a goal is a one-off; logging against it is the daily job. So once
   * any goal exists the box opens on "log" instead of asking for another goal.
   * Derived rather than set in an effect, so it settles the moment `goals`
   * arrives — and a tab click pins the choice from then on.
   */
  const [boxModePref, setBoxModePref] = useState<"new" | "log" | null>(null);
  const boxMode: "new" | "log" =
    goals.length === 0 ? "new" : (boxModePref ?? "log");
  const setBoxMode = setBoxModePref;
  const [selectedLogGoalId, setSelectedLogGoalId] = useState<string | null>(
    null,
  );
  const [logTasks, setLogTasks] = useState<TaskRow[]>([]);
  const [logTasksLoading, setLogTasksLoading] = useState(false);
  const [showProgressDialog, setShowProgressDialog] = useState(false);

  const t = translations[language];
  const selectedLogGoal = useMemo(
    () => goals.find((g) => g.id === selectedLogGoalId) || null,
    [goals, selectedLogGoalId],
  );

  /* ---- Pick primary goal for notifications ---- */
  const primaryGoal = useMemo(() => {
    const pinned = goals.find((g) => g.is_pinned);
    return pinned || goals[0] || null;
  }, [goals]);

  const supabase = useMemo(() => createClient(), []);

  const {
    notifications,
    unreadNotifications,
    highPriorityCount,
    coachInsight,
    refresh: handleRefreshNotifs,
    markAllAsRead: handleMarkAllNotifsRead,
  } = useSmartNotifications({
    goals,
    language: isArabic ? "ar" : "en",
  });

  /* ---- RTL helper ---- */
  const isRTLText = (text: string) => {
    const rtlChar = /[\u0591-\u07ff\uFB1D-\uFDFD\uFE70-\uFEFC]/;
    const ltrChar = /[A-Za-z\u00C0-\u024F]/;
    for (const char of text.trim()) {
      if (rtlChar.test(char)) return true;
      if (ltrChar.test(char)) return false;
    }
    return isArabic;
  };

  /* ---- Goal input helpers ---- */
  const minimumGoalWords = 15;

  const analyzeGoalInput = (value: string) => {
    const normalized = value.trim().replace(/\s+/g, " ");
    const wordCount = normalized ? normalized.split(" ").length : 0;
    const needsMoreDetail =
      normalized.length > 0 && wordCount < minimumGoalWords;
    const detailProgress =
      normalized.length > 0 ? Math.min(wordCount / minimumGoalWords, 1) : 0;
    return { normalized, wordCount, needsMoreDetail, detailProgress };
  };

  const handleAICreate = () => {
    setSelectedCreationMode("ai");
    const trimmedGoal = normalizedGoalInput;
    if (!trimmedGoal) {
      goalTextareaRef.current?.focus();
      return;
    }
    if (goalNeedsMoreDetail) {
      setShowAIDetailPrompt(true);
      return;
    }
    setShowAIDetailPrompt(false);
    onNavigateToCreate?.(trimmedGoal, "ai");
  };

  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: 16000, echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      audioChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      mediaRecorder.onstop = async () => {
        setIsProcessing(true);
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          const formData = new FormData();
          formData.append("audio", audioBlob, `recording.${mimeType.split("/")[1]}`);
          formData.append("language", language === "ar" ? "ar" : "en");
          const response = await fetch(apiUrl("/api/transcribe"), { method: "POST", body: formData });
          const data = await response.json();
          if (response.ok && !data.fallback && data.text) {
            setGoalInput((prev) => (prev ? prev + " " + data.text : data.text));
          }
        } catch (err) {
          console.error("Transcription error:", err);
        } finally {
          setIsProcessing(false);
          cleanupStream();
        }
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access error:", err);
      alert(
        language === "ar"
          ? "فشل الوصول إلى الميكروفون. يرجى السماح بالوصول من إعدادات المتصفح."
          : "Failed to access microphone. Please allow access in browser settings."
      );
      setIsRecording(false);
    }
  }, [language, cleanupStream]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  const toggleRecording = useCallback(() => {
    if (isProcessing) return;
    if (isRecording) stopRecording();
    else startRecording();
  }, [isRecording, isProcessing, startRecording, stopRecording]);

  const {
    normalized: normalizedGoalInput,
    wordCount: goalWordCount,
    needsMoreDetail: goalNeedsMoreDetail,
  } = analyzeGoalInput(goalInput);
  const hasGoalInput = normalizedGoalInput.length > 0;
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
    promptColorStage === 5
      ? "border-foreground/25 bg-gradient-to-b from-foreground/12 via-foreground/12 to-background"
      : promptColorStage === 4
        ? "border-foreground/25 bg-gradient-to-b from-foreground/12 via-foreground/12 to-background"
        : promptColorStage === 3
          ? "border-foreground/15 bg-gradient-to-b from-foreground/12 via-foreground/12 to-background"
          : promptColorStage === 2
            ? "border-foreground/15 bg-gradient-to-b from-foreground/12 via-foreground/12 to-background"
            : "border-foreground/15 bg-gradient-to-b from-foreground/12 via-background/90 to-background";

  const promptCardClasses =
    promptColorStage === 5
      ? "border-foreground/25 bg-foreground/12"
      : promptColorStage === 4
        ? "border-foreground/25 bg-foreground/12"
        : promptColorStage === 3
          ? "border-foreground/15 bg-foreground/12"
          : promptColorStage === 2
            ? "border-foreground/15 bg-foreground/12"
            : "border-foreground/15 bg-foreground/12";

  const promptMessages = {
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

  const goalPromptMessage = goalNeedsMoreDetail
    ? isArabic
      ? promptMessages.ar[promptColorStage as 1 | 2 | 3 | 4 | 5]
      : promptMessages.en[promptColorStage as 1 | 2 | 3 | 4 | 5]
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

  const handleManualCreate = () => {
    setSelectedCreationMode("manual");
    if (!hasGoalInput) {
      goalTextareaRef.current?.focus();
      return;
    }
    setShowAIDetailPrompt(false);
    onNavigateToCreate?.(normalizedGoalInput, "manual");
  };

  /* ---- Log mode: fetch tasks and open progress dialog ---- */
  const handleLogSubmit = useCallback(async () => {
      if (!selectedLogGoalId) return;
      setLogTasksLoading(true);
      try {
        const { data, error } = await supabase
          .from("sub_layers")
          .select("*")
          .eq("goal_id", selectedLogGoalId)
          .order("sort_order", { ascending: true });

        if (error) {
          console.error("Failed to fetch tasks for log mode:", error);
          return;
        }

        setLogTasks((data as TaskRow[]) || []);
        setShowProgressDialog(true);
      } catch (err) {
        console.error("Log mode fetch tasks error:", err);
      } finally {
        setLogTasksLoading(false);
      }
    },
    [selectedLogGoalId, supabase],
  );

  const handleProgressDialogClose = useCallback(() => {
    setShowProgressDialog(false);
    setLogTasks([]);
  }, []);

  const handleProgressDialogSuccess = useCallback(() => {
    handleProgressDialogClose();
  }, [handleProgressDialogClose]);

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

  /* ------------------------------------------------------------------ */
  /*  JSX                                                                */
  /* ------------------------------------------------------------------ */

  return (
    <div
      className="mx-auto flex min-h-0 w-full max-w-4xl 2xl:max-w-5xl flex-col gap-[28px] px-4 pt-[112px] pb-6"
      dir={isArabic ? "rtl" : "ltr"}
    >
      {/* Upper Main Focus Group (Logo, Notification Bell, Coach Quote, Action Box) */}
      <div className="flex shrink-0 flex-col gap-3.5 sm:gap-4">
        {/* Header with Logo & Notification Bell */}
        <div className="flex shrink-0 items-center justify-between px-1">
          <div className="w-9 sm:w-10" /> {/* Spacer for symmetry */}
          <div className="flex flex-col items-center justify-center gap-2 text-center">
            <BrandLockup className="h-auto w-[165px] text-foreground transition-transform duration-300 hover:scale-[1.02] sm:w-[205px] md:w-[230px]" />
            <p
              className="max-w-[18rem] text-xs font-semibold leading-relaxed text-muted-foreground/75 tracking-tight sm:max-w-[26rem] sm:text-sm"
              dir={isArabic ? "rtl" : "ltr"}
              lang={isArabic ? "ar" : "en"}
            >
              {isArabic
                ? "اذا ما استمرت بهدفك راح تفشل يا غبي"
                : "If you don't stick to your goal, you'll fail, stupid"}
            </p>
          </div>
          <div className="shrink-0">
            <NotificationBellPopover
              notifications={notifications}
              unreadCount={unreadNotifications.length}
              highPriorityCount={highPriorityCount}
              isArabic={isArabic}
              onSelectGoal={onSelectGoal}
              onMarkAllAsRead={handleMarkAllNotifsRead}
            />
          </div>
        </div>

        {/* AI Coach Banner (Personalized behavioral quote/guidance) */}
        <AICoachBanner
          insight={coachInsight}
          isArabic={isArabic}
        />

        {/* Dual-mode box: vertical toggle + content */}
        <div
          className={cn(
            "relative shrink-0 transition-all duration-300",
            aiPromptVisible && boxMode === "new" ? "pt-10 sm:pt-11" : "pt-0"
          )}
          dir={isArabic ? "rtl" : "ltr"}
        >
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 z-10 overflow-hidden transition-all duration-300",
            aiPromptVisible && boxMode === "new" ? "h-[4.75rem] opacity-100 sm:h-[5.75rem]" : "h-0 opacity-0"
          )}
        >
          <div className={cn("rounded-t-[22px] border border-b-0 px-4 pt-1 pb-6 sm:px-5 sm:pt-1.5 sm:pb-9", promptToneClasses)}>
            <div
              role="status"
              aria-live="polite"
              className={cn(
                "flex items-center gap-3 text-sm font-medium leading-6 text-foreground",
                isArabic ? "flex-row-reverse text-right" : "text-left"
              )}
            >
              <div className="shrink-0 rounded-full border border-primary/25 bg-background/60 p-1.5 backdrop-blur">
                <CircleAlert className="size-4 shrink-0 text-primary" />
              </div>
              <p
                id="goal-ai-detail-prompt"
                className="flex-1 text-[13px] font-semibold leading-5 text-foreground/90"
              >
                {goalPromptMessage}
              </p>
            </div>
          </div>
        </div>

        <div
          className={cn(
            "relative z-20 flex items-stretch gap-2 overflow-hidden rounded-2xl",
            PANEL_SURFACE,
            "shadow-sm shadow-black/[0.03] transition-all duration-300 ease-out dark:shadow-black/10",
            boxMode === "new"
              ? (isRecording ? "border-destructive/45 bg-destructive/12" : isProcessing ? "border-primary/25 bg-primary/12" : aiPromptVisible ? promptCardClasses : "border-border")
              : "border-primary/25"
          )}
        >
          {/* Vertical mode toggle */}
          <div
            className="flex shrink-0 flex-col gap-1 p-1.5 bg-muted/20 border-inline-end border-border/70"
            role="tablist"
            aria-label={isArabic ? "وضع الصندوق" : "Box mode"}
          >
            <button
              type="button"
              role="tab"
              aria-selected={boxMode === "new"}
              onClick={() => setBoxMode("new")}
              className={cn(
                "flex h-12 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-200",
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
              onClick={() => setBoxMode("log")}
              disabled={goals.length === 0}
              className={cn(
                "flex h-12 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-200",
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
            /* ===== NEW GOAL MODE (existing input) ===== */
            <div className="relative min-w-0 flex-1">
              <div
                className={cn(
                  "pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b to-transparent",
                  isRecording ? "from-destructive/12 via-destructive/12" : isProcessing ? "from-primary/12 via-primary/12" : aiPromptVisible ? "from-primary/12 via-primary/12" : "from-primary/12 via-primary/12"
                )}
              />
              <div className="relative px-2 pt-2 pb-1.5 sm:px-3 sm:pt-2.5 sm:pb-2.5">
                <Textarea
                  ref={goalTextareaRef}
                  rows={1}
                  value={goalInput}
                  onChange={(e) => {
                    setGoalInput(e.target.value);
                    if (!analyzeGoalInput(e.target.value).needsMoreDetail) setShowAIDetailPrompt(false);
                    resizeGoalTextarea(e.currentTarget);
                  }}
                  onInput={(e) => resizeGoalTextarea(e.currentTarget)}
                  placeholder={goalInputPlaceholder}
                  aria-describedby={aiPromptVisible ? "goal-ai-detail-prompt" : undefined}
                  className={cn(
                    "min-h-[44px] max-h-[132px] resize-none overflow-y-hidden border-0 bg-transparent px-3 py-2 shadow-none scrollbar-thin",
                    "text-sm font-medium leading-6 text-foreground sm:text-base sm:leading-7 md:text-base",
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
                  "flex flex-row-reverse items-center gap-2 px-2 pb-2 pt-0 sm:items-center sm:justify-between sm:px-3 sm:pb-3",
                  isArabic ? "sm:flex-row-reverse" : "sm:flex-row"
                )}
              >
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={toggleRecording}
                  disabled={isProcessing}
                  aria-pressed={isRecording}
                  className={cn(
                    "h-9 w-9 shrink-0 rounded-full px-0 shadow-none sm:w-9 sm:px-0",
                    isProcessing
                      ? "border-primary/45 bg-primary/12 text-primary"
                      : isRecording
                        ? "border-destructive/45 bg-destructive/12 text-destructive hover:bg-destructive/12"
                        : "border-border bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  {isProcessing ? <Loader2 className="size-4 animate-spin" /> : isRecording ? <StopCircle className="size-4" /> : <Mic className="size-4" />}
                </Button>
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
                      "w-full h-9 min-w-0 rounded-full border px-2 text-xs font-semibold shadow-none transition-all duration-200 sm:h-10 sm:px-4 sm:text-sm",
                      selectedCreationMode === "manual"
                        ? "border-foreground/25 bg-foreground/12 text-foreground ring-1 ring-foreground/15"
                        : "border-border bg-background text-muted-foreground/90 hover:bg-muted/60 hover:text-foreground"
                    )}
                  >
                    <PenLine className="size-4 shrink-0" />
                    <span className="truncate">{isArabic ? "يدوي" : "Manual"}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAICreate}
                    aria-pressed={selectedCreationMode === "ai"}
                    className={cn(
                      "w-full h-9 min-w-0 rounded-full border px-2 text-xs font-semibold shadow-none transition-all duration-300 sm:h-10 sm:px-4 sm:text-sm",
                      aiPromptVisible
                        ? "border-primary/45 bg-primary/12 text-primary"
                        : selectedCreationMode === "ai"
                          ? "border-primary/25 bg-primary/12 text-primary ring-1 ring-primary/15 hover:bg-primary/12"
                          : "border-border bg-background text-muted-foreground/90 hover:bg-muted/60 hover:text-foreground"
                    )}
                  >
                    <Sparkles className="size-4 shrink-0" />
                    <span className="truncate">{isArabic ? "ذكاء اصطناعي" : "AI Plan"}</span>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* ===== DAILY LOG MODE ===== */
            <div className="relative min-w-0 flex-1 flex flex-col">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-primary/12 via-primary/12 to-transparent" />
              <div className="relative flex-1 px-2 pt-2 pb-1.5 sm:px-3 sm:pt-2.5 sm:pb-2.5 flex flex-col gap-2">
                {goals.length === 0 ? (
                  <div className="flex items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/12 px-3 py-4 text-center">
                    <p className="text-sm text-muted-foreground/75">
                      {t.noGoalsToLog}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5 max-h-[88px] overflow-y-auto scrollbar-thin">
                    {goals.map((goal) => {
                      const Icon = getIconComponent(goal.icon || "Target");
                      const currentPoints = goal.current_points ?? 0;
                      const targetPoints = goal.target_points ?? 0;
                      const progress = targetPoints > 0 ? Math.round((currentPoints / targetPoints) * 100) : 0;
                      const isSelected = selectedLogGoalId === goal.id;
                      return (
                        <button
                          key={goal.id}
                          type="button"
                          onClick={() => setSelectedLogGoalId(goal.id)}
                          aria-pressed={isSelected}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-semibold transition-all duration-200",
                            isSelected
                              ? "border-primary bg-primary/12 text-primary ring-1 ring-primary/25 shadow-[0_4px_14px_-4px_color-mix(in_oklch,var(--primary)_40%,transparent)]"
                              : "border-border bg-background text-muted-foreground hover:border-primary/25 hover:bg-primary/12 hover:text-foreground"
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border transition-all duration-200",
                              isSelected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-primary/25 bg-primary/12 text-primary"
                            )}
                          >
                            <Icon className="h-2.5 w-2.5" />
                          </span>
                          <span className="max-w-[130px] truncate">{goal.title}</span>
                          <span className={cn("tabular-nums text-[10px] font-bold transition-opacity", isSelected ? "opacity-80" : "opacity-50")}>
                            {progress}%
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="px-2 pb-2 pt-0 sm:px-3 sm:pb-3">
                <Button
                  type="button"
                  disabled={!selectedLogGoalId || logTasksLoading || goals.length === 0}
                  onClick={() => handleLogSubmit()}
                  className={cn(
                    "w-full h-10 rounded-xl px-4 text-sm font-bold transition-all duration-200",
                    !selectedLogGoalId || goals.length === 0
                      ? "bg-muted/60 text-muted-foreground/50 cursor-not-allowed shadow-none"
                      : "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
                  )}
                >
                  {logTasksLoading ? (
                    <Loader2 className="size-4 shrink-0 animate-spin" />
                  ) : (
                    <Zap className="size-4 shrink-0" />
                  )}
                  <span>{isArabic ? "تسجيل التقدّم اليوم" : "Log Today's Progress"}</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lower Section: Recent Goals Container (Sized for ~3.5 card rows) */}
      <div
        className="shrink-0 flex flex-col overflow-hidden"
        dir={isArabic ? "rtl" : "ltr"}
      >
        <div className="flex shrink-0 items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-2">
            <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary opacity-80" />
            <h2 className="text-xs sm:text-sm font-bold text-foreground">
              {isArabic ? "الأهداف الأخيرة" : "Recent Goals"}
            </h2>
            <span className="inline-flex h-4 sm:h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary/10 px-1.5 text-[10px] sm:text-[11px] font-bold text-primary tabular-nums">
              {recentGoals.length}
            </span>
          </div>
        </div>

        <div className="overflow-hidden flex flex-col">
          <div className={cn("h-[430px] overflow-y-auto overscroll-contain rounded-[18px] p-[10px] scrollbar-thin", WELL_SURFACE)}>
            {recentGoals.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                  {recentGoals.map((goal) => {
                    const currentPoints = goal.current_points ?? 0;
                    const targetPoints = goal.target_points ?? 0;
                    const progress = targetPoints > 0 ? Math.round((currentPoints / targetPoints) * 100) : 0;
                    const Icon = getIconComponent(goal.icon || "Target");
                    const goalIsRTL = isArabic || isRTLText(goal.title);
                    const daysChip = getGoalEndDaysChip(goal.estimated_completion_date, isArabic);
                    const stats = taskStatsMap[goal.id];
                    const hasStatsBadge = !!stats && stats.total > 0;
                    const hasGoalBadges = goal.is_pinned || !!daysChip || hasStatsBadge;

                    return (
                      <div
                        key={goal.id}
                        className="group relative w-full rounded-xl border border-border bg-card p-3 sm:p-3.5 shadow-xs transition-all duration-200 ease-out hover:border-primary/25 hover:shadow-md hover:-translate-y-px active:translate-y-0 dark:bg-card"
                      >
                        <button
                          onClick={() => onSelectGoal(goal.id)}
                          className="flex w-full cursor-pointer flex-col gap-2.5 rounded-xl text-start outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-1"
                          dir={goalIsRTL ? "rtl" : "ltr"}
                        >
                          <div className="flex w-full items-start justify-between gap-2 sm:gap-3">
                            <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary shadow-xs transition-colors duration-200 group-hover:border-primary/30 group-hover:bg-primary/15 sm:h-10 sm:w-10">
                                <Icon className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="block truncate text-sm sm:text-[15px] font-bold text-foreground transition-colors group-hover:text-primary">
                                  {goal.title}
                                </span>
                                {hasGoalBadges && (
                                  <div className="mt-1 flex flex-wrap items-center gap-1 sm:gap-1.5">
                                    {goal.is_pinned && (
                                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-1.5 py-0.2 text-[9px] sm:text-[10px] font-semibold text-primary">
                                        <Pin className="h-2.5 w-2.5" />
                                        {isArabic ? "مثبت" : "Pinned"}
                                      </span>
                                    )}
                                    {daysChip && (
                                      <span
                                        className={cn(
                                          "inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.2 text-[9px] sm:text-[10px] font-semibold",
                                          daysChip.tone === "late"
                                            ? "border-destructive/35 bg-destructive/10 text-destructive font-bold"
                                            : "border-border/70 bg-muted/60 text-muted-foreground/85"
                                        )}
                                      >
                                        <Clock className="h-2.5 w-2.5" />
                                        {daysChip.text}
                                      </span>
                                    )}
                                    {hasStatsBadge && (
                                      <span
                                        className={cn(
                                          "inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.2 text-[9px] sm:text-[10px] font-semibold tabular-nums",
                                          stats.completed >= stats.total
                                            ? "border-primary/25 bg-primary/10 text-primary font-bold"
                                            : "border-border/70 bg-muted/60 text-muted-foreground/85"
                                        )}
                                      >
                                        <ListChecks className="h-2.5 w-2.5" />
                                        <span dir="ltr">{stats.completed}/{stats.total}</span>
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <GoalProgressBar
                            currentPoints={currentPoints}
                            targetPoints={targetPoints}
                            progress={progress}
                            className="h-8 sm:h-9"
                            labelClassName="px-2.5 sm:px-3 text-[10px] sm:text-xs"
                            percentClassName="text-xs sm:text-sm"
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/12 p-8 sm:p-12 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-primary/15 bg-primary/12 text-primary/75">
                    <Target className="h-6 w-6" />
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                    {isArabic ? "لا توجد أهداف بعد" : "No goals yet"}
                  </h2>
                  <p className="mt-1.5 max-w-[16rem] text-sm text-muted-foreground/75 leading-relaxed">
                    {isArabic ? "ابدأ بإضافة هدفك الأول وسيظهر تقدمه هنا." : "Create your first goal and its progress will appear here."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Log Dialog (opened from daily-log mode) */}
      {showProgressDialog && selectedLogGoal && (
        <ProgressLogDialog
          goal={{
            id: selectedLogGoal.id,
            title: selectedLogGoal.title,
            ai_summary: selectedLogGoal.ai_summary || "",
            created_at: selectedLogGoal.created_at,
            estimated_completion_date: selectedLogGoal.estimated_completion_date,
            current_points: selectedLogGoal.current_points,
            target_points: selectedLogGoal.target_points,
          }}
          tasks={logTasks}
          onClose={handleProgressDialogClose}
          onSuccess={handleProgressDialogSuccess}
          language={language}
        />
      )}

    </div>
  );
}
