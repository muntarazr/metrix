"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { type Language } from "@/lib/translations";
import {
  calculateDailyCap,
  getScorableTasks,
} from "@/lib/task-hierarchy";
import { getLocalDayWindow, getLocalDateKey } from "@/lib/task-periods";
import { parseDailyLogBreakdown } from "@/lib/daily-log-feedback";
import ProgressUpdatesStep, {
  type ProgressUpdatesData,
} from "./ProgressUpdatesStep";
import {
  countDistinctLoggedDays,
  getErrorMessage,
  type EvaluationResult,
  type LogMode,
  type PendingMilestoneImage,
  type ProgressLogDialogProps,
  type TodaySessionLogRow,
} from "./progress-log-helpers";
import {
  calculateUpdatesSnapshot,
  syncTaskCheckins,
  submitMultiGoalLog,
  submitSingleGoalDailyLog,
  submitMilestoneLog,
} from "./progress-log-actions";
import LogModeSelectScreen from "./LogModeSelectScreen";
import AIDailyLogScreen from "./AIDailyLogScreen";
import MilestoneLogScreen from "./MilestoneLogScreen";
import EvaluationResultsModal from "./EvaluationResultsModal";

export default function ProgressLogDialog({
  goal,
  goals,
  tasks,
  initialMode = "select",
  onClose,
  onSuccess,
  language = "ar",
}: ProgressLogDialogProps) {
  const supabase = createClient();
  const isMultiGoal = Boolean(goals && goals.length > 1);
  const effectiveInitialMode = isMultiGoal ? "ai" : initialMode;
  const [mode, setMode] = useState<LogMode>(effectiveInitialMode);
  const [logText, setLogText] = useState("");
  const [loading, setLoading] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [notification, setNotification] = useState<{
    type: "error" | "warning";
    message: string;
  } | null>(null);
  const [loggedTodayTaskIds, setLoggedTodayTaskIds] = useState<Set<string>>(
    new Set(),
  );
  const submittedRef = useRef(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [updatesStepData, setUpdatesStepData] =
    useState<ProgressUpdatesData | null>(null);
  const [showUpdatesScreen, setShowUpdatesScreen] = useState(false);

  useEffect(() => {
    if (isMultiGoal && mode === "select") {
      setMode("ai");
    }
  }, [isMultiGoal, mode]);

  // Milestone specific state
  const [milestoneName, setMilestoneName] = useState("");
  const [pendingMilestoneImage, setPendingMilestoneImage] =
    useState<PendingMilestoneImage | null>(null);
  const [historyDays, setHistoryDays] = useState<number | null>(null);

  // Tasks already logged today
  useEffect(() => {
    let cancelled = false;
    const { start, end } = getLocalDayWindow();
    const todayKey = getLocalDateKey();

    async function loadLoggedToday() {
      try {
        const goalIds =
          goals && goals.length > 1 ? goals.map((g) => g.id) : [goal.id];
        const [{ data: logs }, { data: checkins }] = await Promise.all([
          supabase
            .from("daily_logs")
            .select("created_at, breakdown")
            .in("goal_id", goalIds)
            .gte("created_at", start.toISOString())
            .lt("created_at", end.toISOString())
            .not("breakdown", "is", null)
            .order("created_at", { ascending: false }),
          supabase
            .from("task_checkins")
            .select("task_id, completed, completed_at, period_start")
            .in("goal_id", goalIds)
            .eq("completed", true),
        ]);

        if (cancelled) return;

        const ids = new Set<string>();

        (logs as Array<{ breakdown: unknown }> | null | undefined)?.forEach(
          (log) => {
            parseDailyLogBreakdown(log.breakdown).items.forEach((item) => {
              if (
                (Number(item.points) || 0) > 0 ||
                item.status === "done" ||
                item.status === "partial"
              ) {
                ids.add(item.task_id);
              }
            });
          },
        );

        (
          checkins as
            | Array<{
                task_id: string;
                completed_at: string | null;
                period_start: string;
              }>
            | null
            | undefined
        )?.forEach((row) => {
          if (row.completed_at) {
            const completedDate = new Date(row.completed_at);
            if (completedDate >= start && completedDate < end) {
              ids.add(row.task_id);
            }
          } else if (row.period_start === todayKey) {
            ids.add(row.task_id);
          }
        });

        setLoggedTodayTaskIds(ids);
      } catch (err) {
        console.error("Failed to load today's logged tasks:", err);
      }
    }

    loadLoggedToday();

    return () => {
      cancelled = true;
    };
  }, [goal.id, goals, supabase]);

  const scorableTasks = getScorableTasks(tasks);
  const maxBasePoints = scorableTasks.reduce(
    (sum, task) => sum + (Number(task.impact_weight) || 0),
    0,
  );
  const dailyCap = calculateDailyCap(tasks);
  const totalScorableTasks = Math.max(scorableTasks.length, 1);

  const handleVoiceTranscript = useCallback((transcript: string) => {
    setLogText((prev) => (prev ? prev + " " + transcript : transcript));
  }, []);

  const fetchPreviousLogsForAnalysis = useCallback(async () => {
    const { start } = getLocalDayWindow();
    const { data, error } = await supabase
      .from("daily_logs")
      .select("created_at, ai_score, user_input")
      .eq("goal_id", goal.id)
      .lt("created_at", start.toISOString())
      .order("created_at", { ascending: false })
      .limit(21);

    if (error) {
      throw new Error(error.message || "Failed to fetch previous logs");
    }
    return data || [];
  }, [goal.id, supabase]);

  const fetchTodaySessionLog = useCallback(async () => {
    const { start, end } = getLocalDayWindow();
    const { data, error } = await supabase
      .from("daily_logs")
      .select("id, created_at, user_input, ai_score, breakdown")
      .eq("goal_id", goal.id)
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(error.message || "Failed to fetch today session log");
    }
    return (data as TodaySessionLogRow | null) || null;
  }, [goal.id, supabase]);

  const handleAISubmit = useCallback(async () => {
    if (!logText.trim() || submittedRef.current) return;
    submittedRef.current = true;
    setLoading(true);

    try {
      if (goals && goals.length > 1) {
        const result = await submitMultiGoalLog({
          supabase,
          goals,
          logText,
          language,
        });

        if ("quotaExceeded" in result) {
          submittedRef.current = false;
          setNotification({ type: "warning", message: result.message });
          return;
        }

        setEvaluation(result.evaluation);
        return;
      }

      const [previousLogs, todaySession] = await Promise.all([
        fetchPreviousLogsForAnalysis(),
        fetchTodaySessionLog(),
      ]);
      setHistoryDays(countDistinctLoggedDays(previousLogs));

      const result = await submitSingleGoalDailyLog({
        supabase,
        goal,
        tasks,
        logText,
        language,
        previousLogs,
        todaySession,
        dailyCap,
        maxBasePoints,
        totalScorableTasks,
      });

      if ("errorType" in result) {
        submittedRef.current = false;
        setNotification({
          type: result.errorType === "quota" ? "warning" : "error",
          message: result.message,
        });
        return;
      }

      setEvaluation(result.evaluation);

      try {
        const targetGoalIds =
          goals && goals.length > 1 ? goals.map((g) => g.id) : [goal.id];
        await syncTaskCheckins(
          supabase,
          targetGoalIds,
          tasks,
          goal.id,
          result.completedTaskIds,
        );
        const updatesSnapshot = await calculateUpdatesSnapshot(
          supabase,
          goal,
          totalScorableTasks,
          result.deltaAwarded,
          result.completedTaskIds,
        );
        if (updatesSnapshot) {
          setUpdatesStepData(updatesSnapshot);
        }
      } catch (syncError) {
        console.error("Failed to sync task checkins after AI log:", syncError);
      }

      const newPoints = (goal.current_points ?? 0) + result.deltaAwarded;
      if (goal.target_points && newPoints >= goal.target_points) {
        setShowCelebration(true);
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("challenge-log-updated", {
            detail: { goalId: goal.id, createdAt: new Date().toISOString() },
          }),
        );
      }
    } catch (error: unknown) {
      console.error("Failed to evaluate AI log:", error);
      submittedRef.current = false;
      const errorMsg =
        language === "ar"
          ? `فشل في تقييم السجل: ${getErrorMessage(error, "Unknown error")}`
          : `Failed to evaluate log: ${getErrorMessage(error, "Unknown error")}`;
      setNotification({ type: "error", message: errorMsg });
    } finally {
      setLoading(false);
    }
  }, [
    logText,
    goal,
    goals,
    tasks,
    language,
    supabase,
    fetchPreviousLogsForAnalysis,
    fetchTodaySessionLog,
    dailyCap,
    maxBasePoints,
    totalScorableTasks,
  ]);

  const handleMilestoneSubmit = async () => {
    if (!logText.trim() || !milestoneName.trim() || submittedRef.current)
      return;
    submittedRef.current = true;
    setLoading(true);
    setNotification(null);

    try {
      const result = await submitMilestoneLog({
        goal,
        tasks,
        logText,
        milestoneName,
        dailyCap,
        language,
      });

      if (result.status === "rejected") {
        submittedRef.current = false;
        setNotification({ type: "error", message: result.message });
        return;
      }

      const milestoneResult: EvaluationResult = {
        total_points_awarded: result.score,
        base_points: result.score,
        bonus_points: 0,
        coach_message: result.message,
      };

      setEvaluation(milestoneResult);
      if (typeof result.logId === "string" && result.logId.trim()) {
        setPendingMilestoneImage({
          logId: result.logId,
          score: result.score,
          message: result.message,
          imagePrompt:
            typeof result.imagePrompt === "string" ? result.imagePrompt : "",
        });
      }

      const updatesSnapshot = await calculateUpdatesSnapshot(
        supabase,
        goal,
        totalScorableTasks,
        result.score,
        [],
        {
          logType: "milestone",
          milestoneTitle: milestoneName,
          milestoneTier: result.tier,
        },
      );
      if (updatesSnapshot) {
        setUpdatesStepData(updatesSnapshot);
      }

      const currentPoints = (goal.current_points || 0) + result.score;
      if (goal.target_points && currentPoints >= goal.target_points) {
        setShowCelebration(true);
      } else {
        setMode("ai");
      }

      window.dispatchEvent(
        new CustomEvent("challenge-log-updated", {
          detail: { goalId: goal.id },
        }),
      );
    } catch (error: unknown) {
      submittedRef.current = false;
      console.error("Milestone submit error:", error);
      setNotification({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : language === "ar"
              ? "فشل إرسال الإنجاز"
              : "Failed to submit milestone.",
      });
    } finally {
      setLoading(false);
    }
  };

  // Updates Screen (Animated metrics)
  if (showUpdatesScreen && updatesStepData) {
    return (
      <div className="fixed inset-0 bg-black/65 backdrop-blur-md z-[80] flex items-center justify-center p-3.5 sm:p-4">
        <div className="relative bg-card/95 backdrop-blur-2xl rounded-2xl sm:rounded-3xl w-full max-w-lg max-h-[90dvh] overflow-y-auto overscroll-contain p-4 sm:p-6 border border-white/10 dark:border-white/[0.08] shadow-[0_25px_65px_-15px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.06)] animate-in fade-in zoom-in-95 duration-200">
          <ProgressUpdatesStep
            updates={updatesStepData}
            language={language}
            onDone={() => {
              onSuccess();
              onClose();
            }}
          />
        </div>
      </div>
    );
  }

  // Results screen
  if (evaluation) {
    return (
      <EvaluationResultsModal
        evaluation={evaluation}
        mode={mode}
        pendingMilestoneImage={pendingMilestoneImage}
        goal={goal}
        tasks={tasks}
        dailyCap={dailyCap}
        language={language}
        showCelebration={showCelebration}
        setShowCelebration={setShowCelebration}
        onNext={() => {
          if (updatesStepData) {
            setShowUpdatesScreen(true);
          } else {
            onSuccess();
            onClose();
          }
        }}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );
  }

  // Mode selection screen
  if (mode === "select") {
    return (
      <LogModeSelectScreen
        goalTitle={goal.title}
        language={language}
        onSelectMode={(selectedMode) => setMode(selectedMode)}
        onClose={onClose}
      />
    );
  }

  // AI mode screen
  if (mode === "ai") {
    return (
      <AIDailyLogScreen
        isMultiGoal={isMultiGoal}
        language={language}
        notification={notification}
        setNotification={setNotification}
        loading={loading}
        logText={logText}
        setLogText={setLogText}
        totalScorableTasks={totalScorableTasks}
        historyDays={historyDays}
        scorableTasks={scorableTasks}
        loggedTodayTaskIds={loggedTodayTaskIds}
        handleVoiceTranscript={handleVoiceTranscript}
        onSubmit={handleAISubmit}
        onBack={() => setMode("select")}
        onClose={onClose}
      />
    );
  }

  // Milestone mode screen
  if (mode === "milestone") {
    return (
      <MilestoneLogScreen
        goalTitle={goal.title}
        language={language}
        notification={notification}
        setNotification={setNotification}
        loading={loading}
        logText={logText}
        setLogText={setLogText}
        milestoneName={milestoneName}
        setMilestoneName={setMilestoneName}
        totalScorableTasks={totalScorableTasks}
        historyDays={historyDays}
        handleVoiceTranscript={handleVoiceTranscript}
        onSubmit={handleMilestoneSubmit}
        onBack={() => setMode("select")}
        onClose={onClose}
      />
    );
  }

  return null;
}
