"use client";

import { useState, useRef, useCallback } from "react";
import AnalyzingScreen from "./AnalyzingScreen";
import {
  X,
  Loader2,
  Send,
  Trophy,
  AlertCircle,
  ArrowUpRight,
  Bot,
  Hand,
  Check,
  Clock,
  ChevronDown,
  ImageIcon,
  Copy,
  Upload,
  Flame,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { translations, type Language } from "@/lib/translations";
import VoiceRecorder from "../shared/VoiceRecorder";
import {
  buildTaskHierarchy,
  calculateDailyCap,
  getScorableTasks,
  type MainBreakdownItem,
  type TaskRow,
} from "@/lib/task-hierarchy";
import { getPeriodStart, getPeriodTypeFromFrequency } from "@/lib/task-periods";
import {
  analyzeDailyPerformance,
  buildDailyLogBreakdown,
  getAwardedPointsSoFar,
  getDailyPerformanceLabel,
  parseDailyLogBreakdown,
  type DailyLogBreakdownItem,
  type DailyLogPerformanceMeta,
} from "@/lib/daily-log-feedback";
import GoalCompletionCelebration from "../goal/GoalCompletionCelebration";
import ProgressUpdatesStep, { type ProgressUpdatesData } from "./ProgressUpdatesStep";
import { computeStreak, parseStreakFreezes } from "@/lib/streak";
import { calendarDaysUntilGoalEnd } from "@/lib/goal-dates";
import { getLocalDateKey } from "@/lib/task-periods";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { apiUrl } from "@/lib/api";

interface ProgressLogDialogProps {
  goal: {
    id: string;
    title: string;
    ai_summary?: string;
    created_at?: string;
    estimated_completion_date?: string | null;
    current_points?: number;
    target_points?: number;
  };
  tasks: TaskRow[];
  onClose: () => void;
  onSuccess: () => void;
  language?: Language;
}

type LogMode = "select" | "ai" | "manual" | "milestone";

/** Distinct calendar days present in a set of logs. */
function countDistinctLoggedDays(
  logs: Array<{ created_at?: string | null }> | null | undefined,
): number {
  const days = new Set<string>();
  for (const log of logs || []) {
    if (typeof log.created_at === "string") {
      days.add(log.created_at.split("T")[0]);
    }
  }
  return days.size;
}
interface PendingMilestoneImage {
  logId: string;
  score: number;
  message: string;
  imagePrompt: string;
}

interface SelectedTask {
  taskId: string;
  timeSpentMinutes?: number;
}

interface EvaluationResult {
  total_points_awarded: number;
  base_points: number;
  bonus_points: number;
  session_total_points?: number;
  session_entries_count?: number;
  coach_message: string;
  full_feedback?: string;
  day_label?: string;
  comparison_message?: string | null;
  warning_message?: string | null;
  performance_meta?: DailyLogPerformanceMeta;
  main_breakdown?: MainBreakdownItem[];
  subtask_breakdown?: DailyLogBreakdownItem[];
  task_breakdown?: DailyLogBreakdownItem[];
  bonus?: {
    points: number;
    reason: string;
  };
}

interface EvaluationApiResponse extends EvaluationResult {
  error?: string;
  status?: "ok" | "refused";
  safe_redirection?: { message?: string };
  message?: string;
  message_ar?: string;
  message_en?: string;
}

interface TaskCheckinRow {
  id: string;
  task_id: string;
  period_type: string;
  period_start: string;
  completed: boolean;
  completed_at: string | null;
}

interface TodaySessionLogRow {
  id: string;
  created_at: string;
  user_input: string;
  ai_score: number | null;
  breakdown: unknown;
}

function getTodayStartIso() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start.toISOString();
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

function formatLocalizedNumber(value: number, language: Language) {
  return new Intl.NumberFormat(language === "ar" ? "ar-SA" : "en-US").format(
    value,
  );
}

function formatPointsDisplay(
  value: number,
  language: Language,
  unitLabel: string,
) {
  const formattedValue = formatLocalizedNumber(value, language);
  return language === "ar"
    ? `${formattedValue} ${unitLabel}+`
    : `+${formattedValue} ${unitLabel}`;
}

function splitResultText(text: string, language: Language) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  if (language !== "ar") {
    return normalized
      .split(/\.\s+/)
      .map((segment) => segment.trim())
      .filter(Boolean);
  }

  return normalized
    .replace(/\.\s+/g, "\n")
    .replace(
      /،\s*(لكن|وهذا|إذا|فأنت|مقارنة|لكن تحتاج|ولا يزال|وستتباطأ|وسيَتباطأ|وسيَتباطأ|وسيتباطأ)/g,
      "\n$1",
    )
    .split("\n")
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function mergeDaySessionInput(
  existingInput: string | null | undefined,
  nextInput: string,
  language: Language,
) {
  const current = (existingInput || "").trim();
  const addition = nextInput.trim();

  if (!current) return addition;
  if (!addition) return current;

  const marker = language === "ar" ? "تحديث إضافي:" : "Additional check-in:";
  return `${current}\n\n${marker}\n${addition}`;
}

function getStatusPriority(status?: DailyLogBreakdownItem["status"]) {
  if (status === "done") return 4;
  if (status === "partial") return 3;
  if (status === "missed") return 2;
  return 1;
}

function mergeDailyBreakdownItems(
  existingItems: DailyLogBreakdownItem[],
  nextItems: DailyLogBreakdownItem[],
) {
  const merged = new Map<string, DailyLogBreakdownItem>();

  [...existingItems, ...nextItems].forEach((item) => {
    const previous = merged.get(item.task_id);

    if (!previous) {
      merged.set(item.task_id, { ...item });
      return;
    }

    merged.set(item.task_id, {
      ...previous,
      ...item,
      points: Math.max(Number(previous.points) || 0, Number(item.points) || 0),
      time_bonus:
        Math.max(
          Number(previous.time_bonus) || 0,
          Number(item.time_bonus) || 0,
        ) || undefined,
      status:
        getStatusPriority(item.status) >= getStatusPriority(previous.status)
          ? item.status
          : previous.status,
      reason: item.reason || previous.reason,
    });
  });

  return Array.from(merged.values());
}

export default function ProgressLogDialog({
  goal,
  tasks,
  onClose,
  onSuccess,
  language = "ar",
}: ProgressLogDialogProps) {
  const t = translations[language];
  const supabase = createClient();
  const [mode, setMode] = useState<LogMode>("select");
  const [logText, setLogText] = useState("");
  const [loading, setLoading] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [notification, setNotification] = useState<{
    type: "error" | "warning";
    message: string;
  } | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<Map<string, SelectedTask>>(
    new Map(),
  );
  const submittedRef = useRef(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showTaskDetails, setShowTaskDetails] = useState(false);
  const [updatesStepData, setUpdatesStepData] = useState<ProgressUpdatesData | null>(null);
  const [showUpdatesScreen, setShowUpdatesScreen] = useState(false);

  // Milestone specific state
  const [milestoneName, setMilestoneName] = useState("");
  const [pendingMilestoneImage, setPendingMilestoneImage] =
    useState<PendingMilestoneImage | null>(null);
  const [imageUploadLoading, setImageUploadLoading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [uploadedMilestoneImageUrl, setUploadedMilestoneImageUrl] = useState<
    string | null
  >(null);
  const [promptCopied, setPromptCopied] = useState(false);
  // Distinct logged days, shown by AnalyzingScreen. Filled from the same fetch
  // the evaluation already makes — it costs nothing extra. Null until it lands,
  // so the screen shows a neutral line instead of guessing.
  const [historyDays, setHistoryDays] = useState<number | null>(null);

  const mainTasks = buildTaskHierarchy(tasks);
  const scorableTasks = getScorableTasks(tasks);
  const maxBasePoints = scorableTasks.reduce(
    (sum, task) => sum + (Number(task.impact_weight) || 0),
    0,
  );
  const dailyCap = calculateDailyCap(tasks);
  const totalScorableTasks = Math.max(scorableTasks.length, 1);
  const accountabilityCopy =
    language === "ar"
      ? {
          comparison: "مقارنة",
          warning: "تحذير",
          showTasks: "عرض تفاصيل المهام",
          hideTasks: "إخفاء تفاصيل المهام",
          detailsHint: "التفاصيل اختيارية وتظهر فقط عند الحاجة.",
          scoredTasks: "مهام مقيّمة",
          addedNow: "المضاف الآن",
          dayTotal: "إجمالي اليوم",
          checkins: "تحديثات",
          done: "مكتمل",
          partial: "جزئي",
          missed: "مفوّت",
          unknown: "غير واضح",
        }
      : {
          comparison: "Comparison",
          warning: "Warning",
          showTasks: "Show Task Details",
          hideTasks: "Hide Task Details",
          detailsHint: "Task scoring stays optional until you need it.",
          scoredTasks: "Scored tasks",
          addedNow: "Added now",
          dayTotal: "Day total",
          checkins: "check-ins",
          done: "Done",
          partial: "Partial",
          missed: "Missed",
          unknown: "Unclear",
        };

  const handleVoiceTranscript = useCallback((transcript: string) => {
    setLogText((prev) => (prev ? prev + " " + transcript : transcript));
  }, []);

  const fetchPreviousLogsForAnalysis = useCallback(async () => {
    const { data, error } = await supabase
      .from("daily_logs")
      .select("created_at, ai_score, user_input")
      .eq("goal_id", goal.id)
      .lt("created_at", getTodayStartIso())
      .order("created_at", { ascending: false })
      .limit(21);

    if (error) throw error;
    return data || [];
  }, [goal.id, supabase]);

  const fetchTodaySessionLog = useCallback(async () => {
    const { data, error } = await supabase
      .from("daily_logs")
      .select("id, created_at, user_input, ai_score, breakdown")
      .eq("goal_id", goal.id)
      .gte("created_at", getTodayStartIso())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return (data as TodaySessionLogRow | null) || null;
  }, [goal.id, supabase]);

  const syncTaskCheckins = useCallback(
    async (taskIds: string[]) => {
      const uniqueTaskIds = Array.from(new Set(taskIds.filter(Boolean)));
      if (uniqueTaskIds.length === 0) return;

      const nowIso = new Date().toISOString();
      const todayKey = getPeriodStart("daily");
      const weekKey = getPeriodStart("weekly");

      const { data: existingRows, error: existingError } = await supabase
        .from("task_checkins")
        .select(
          "id, task_id, period_type, period_start, completed, completed_at",
        )
        .eq("goal_id", goal.id)
        .in("task_id", uniqueTaskIds)
        .in("period_start", [todayKey, weekKey]);

      if (existingError) throw existingError;

      const existingMap = new Map(
        ((existingRows as TaskCheckinRow[] | null) || []).map((row) => [
          `${row.task_id}:${row.period_type}:${row.period_start}`,
          row,
        ]),
      );

      const rowsToInsert: Array<{
        goal_id: string;
        task_id: string;
        period_type: string;
        period_start: string;
        completed: boolean;
        completed_at: string;
      }> = [];
      const rowIdsToUpdate: string[] = [];

      uniqueTaskIds.forEach((taskId) => {
        const task = tasks.find((item) => item.id === taskId);
        if (!task) return;

        const periodType = getPeriodTypeFromFrequency(task.frequency);
        const periodStart = getPeriodStart(task.frequency);
        const key = `${taskId}:${periodType}:${periodStart}`;
        const existing = existingMap.get(key);

        if (existing) {
          rowIdsToUpdate.push(existing.id);
          return;
        }

        rowsToInsert.push({
          goal_id: goal.id,
          task_id: taskId,
          period_type: periodType,
          period_start: periodStart,
          completed: true,
          completed_at: nowIso,
        });
      });

      if (rowsToInsert.length > 0) {
        const { error } = await supabase
          .from("task_checkins")
          .insert(rowsToInsert);
        if (error) throw error;
      }

      if (rowIdsToUpdate.length > 0) {
        const updateResults = await Promise.all(
          rowIdsToUpdate.map((id) =>
            supabase
              .from("task_checkins")
              .update({ completed: true, completed_at: nowIso })
              .eq("id", id),
          ),
        );

        const failedUpdate = updateResults.find((result) => result.error);
        if (failedUpdate?.error) throw failedUpdate.error;
      }
    },
    [goal.id, supabase, tasks],
  );

  const calculateUpdatesSnapshot = useCallback(
    async (
      deltaAwarded: number,
      completedInSessionTaskIds: string[],
      options?: {
        logType?: "daily" | "milestone";
        milestoneTitle?: string;
        milestoneTier?: "minor" | "major" | "legendary";
      },
    ) => {
      try {
        const [{ data: logsData }, { data: goalRow }] = await Promise.all([
          supabase
            .from("daily_logs")
            .select("created_at")
            .eq("goal_id", goal.id)
            .order("created_at", { ascending: false })
            .limit(365),
          supabase
            .from("goals")
            .select("streak_freezes, estimated_completion_date, current_points, target_points")
            .eq("id", goal.id)
            .maybeSingle(),
        ]);

        const freezes = parseStreakFreezes(goalRow?.streak_freezes);
        const dateKeys = new Set<string>();
        for (const log of logsData || []) {
          if (log.created_at) {
            dateKeys.add(getLocalDateKey(new Date(log.created_at)));
          }
        }

        // Previous streak before today's log
        const prevDateKeys = new Set(dateKeys);
        const todayKey = getLocalDateKey();
        prevDateKeys.delete(todayKey);
        const prevStreak = computeStreak(prevDateKeys, freezes);
        const newStreak = computeStreak(dateKeys, freezes);

        // Days remaining
        const estDate = goalRow?.estimated_completion_date || goal.estimated_completion_date;
        const currentDaysRemaining = calendarDaysUntilGoalEnd(estDate);
        // The previous days remaining is currentDaysRemaining + 1 (since today's completion brings it 1 day closer)
        const prevDaysRemaining = currentDaysRemaining !== null ? currentDaysRemaining + 1 : null;
        const newDaysRemaining = currentDaysRemaining;

        // Tasks done today
        const totalTasks = totalScorableTasks;
        const newlyCompletedCount = completedInSessionTaskIds.length;
        const prevTasksDone = Math.max(0, 0); // initial baseline or prior
        const newTasksDone = Math.min(totalTasks, Math.max(prevTasksDone, newlyCompletedCount));

        const prevPoints = Number(goal.current_points) || 0;
        const newPoints = prevPoints + deltaAwarded;
        const targetPoints = Number(goalRow?.target_points || goal.target_points) || 100;

        setUpdatesStepData({
          logType: options?.logType ?? "daily",
          milestoneTitle: options?.milestoneTitle,
          milestoneTier: options?.milestoneTier,
          prevPoints,
          newPoints,
          targetPoints,
          deltaPoints: deltaAwarded,
          prevStreak,
          newStreak: Math.max(prevStreak, newStreak, 1),
          prevDaysRemaining,
          newDaysRemaining,
          prevTasksDone,
          newTasksDone: Math.max(1, newTasksDone),
          totalTasks,
        });
      } catch (e) {
        console.error("Failed to calculate updates snapshot:", e);
      }
    },
    [goal.id, goal.estimated_completion_date, goal.current_points, goal.target_points, supabase, totalScorableTasks],
  );



  const toggleTaskSelection = (taskId: string) => {
    setSelectedTasks((prev) => {
      const newMap = new Map(prev);
      if (newMap.has(taskId)) {
        newMap.delete(taskId);
      } else {
        newMap.set(taskId, { taskId });
      }
      return newMap;
    });
  };

  const updateTaskTime = (taskId: string, minutes: number) => {
    setSelectedTasks((prev) => {
      const newMap = new Map(prev);
      const existing = newMap.get(taskId);
      if (existing) {
        newMap.set(taskId, { ...existing, timeSpentMinutes: minutes });
      }
      return newMap;
    });
  };

  const handleManualSubmit = useCallback(async () => {
    if (selectedTasks.size === 0 || submittedRef.current) return;
    submittedRef.current = true;
    setLoading(true);

    try {
      const [previousLogs, todaySession] = await Promise.all([
        fetchPreviousLogsForAnalysis(),
        fetchTodaySessionLog(),
      ]);
      const breakdown: DailyLogBreakdownItem[] = [];

      // Calculate points for each selected task
      selectedTasks.forEach((selected, taskId) => {
        const task = tasks.find((t) => t.id === taskId);
        if (!task) return;

        const basePoints = task.impact_weight || 0;
        let taskBonus = 0;

        // Calculate bonus if time exceeded expected time
        if (selected.timeSpentMinutes && task.time_required_minutes) {
          if (selected.timeSpentMinutes > task.time_required_minutes) {
            const ratio =
              selected.timeSpentMinutes / task.time_required_minutes;
            taskBonus = Math.floor(basePoints * (ratio - 1) * 0.5); // 50% bonus for extra time
          }
        }

        breakdown.push({
          task_id: taskId,
          points: basePoints,
          status: "done",
          time_bonus: taskBonus > 0 ? taskBonus : undefined,
        });
      });

      const existingSessionBreakdown = todaySession
        ? parseDailyLogBreakdown(todaySession.breakdown)
        : null;
      const mergedBreakdown = mergeDailyBreakdownItems(
        existingSessionBreakdown?.items || [],
        breakdown,
      );
      const mergedBasePoints = mergedBreakdown.reduce(
        (sum, item) => sum + (Number(item.points) || 0),
        0,
      );
      const mergedBonusPoints = mergedBreakdown.reduce(
        (sum, item) => sum + (Number(item.time_bonus) || 0),
        0,
      );
      const previousAwarded = getAwardedPointsSoFar(
        existingSessionBreakdown?.meta,
        todaySession?.ai_score || 0,
      );
      const reevaluatedTotal = mergedBasePoints + mergedBonusPoints;
      const sessionTotalPoints = Math.max(previousAwarded, reevaluatedTotal);
      const deltaAwarded = Math.max(0, sessionTotalPoints - previousAwarded);
      const previousSessionBonus =
        Number(existingSessionBreakdown?.meta?.bonus_points) || 0;
      const deltaBonusPoints = Math.max(
        0,
        mergedBonusPoints - previousSessionBonus,
      );
      const deltaBasePoints = Math.max(0, deltaAwarded - deltaBonusPoints);
      const nextEntriesCount =
        (existingSessionBreakdown?.meta?.entries_count ??
          (todaySession ? 1 : 0)) + 1;
      const nowIso = new Date().toISOString();
      const combinedManualInput = mergeDaySessionInput(
        todaySession?.user_input,
        `Manual check-in: ${selectedTasks.size} task(s) completed`,
        language,
      );

      const performance = analyzeDailyPerformance({
        source: "manual",
        language,
        items: mergedBreakdown,
        totalPoints: sessionTotalPoints,
        basePoints: mergedBasePoints,
        bonusPoints: Math.max(0, sessionTotalPoints - mergedBasePoints),
        dailyCap,
        maxBasePoints,
        totalTasks: totalScorableTasks,
        previousLogs,
      });

      const sessionMeta: DailyLogPerformanceMeta = {
        ...performance.meta,
        session_state: "open",
        entries_count: nextEntriesCount,
        last_update_at: nowIso,
        last_evaluated_score: reevaluatedTotal,
        awarded_points_so_far: sessionTotalPoints,
        delta_awarded: deltaAwarded,
      };

      const result: EvaluationResult = {
        total_points_awarded: deltaAwarded,
        base_points: deltaBasePoints,
        bonus_points: deltaBonusPoints,
        session_total_points: sessionTotalPoints,
        session_entries_count: nextEntriesCount,
        coach_message: performance.copy.coach_message,
        full_feedback: performance.copy.full_feedback,
        day_label: performance.copy.day_label,
        comparison_message: performance.copy.comparison_message,
        warning_message: performance.copy.warning_message,
        performance_meta: sessionMeta,
        task_breakdown: mergedBreakdown,
        bonus:
          mergedBonusPoints > 0
            ? {
                points: mergedBonusPoints,
                reason: t.exceededTimeBonus,
              }
            : undefined,
      };

      setShowTaskDetails(false);
      setEvaluation(result);

      const logPayload = {
        goal_id: goal.id,
        user_input: combinedManualInput,
        ai_score: sessionTotalPoints,
        ai_feedback: result.full_feedback || result.coach_message,
        breakdown: buildDailyLogBreakdown(
          mergedBreakdown,
          result.performance_meta,
        ),
      };

      const logResponse = todaySession
        ? await supabase
            .from("daily_logs")
            .update(logPayload)
            .eq("id", todaySession.id)
        : await supabase.from("daily_logs").insert(logPayload);

      if (logResponse.error) throw logResponse.error;

      // Update goal points using only the real delta added in this check-in
      if (deltaAwarded > 0) {
        const { error: updateError } = await supabase.rpc(
          "increment_goal_points",
          {
            goal_uuid: goal.id,
            points_to_add: deltaAwarded,
          },
        );

        if (updateError) throw updateError;
      }

      try {
        const completedTaskIds = mergedBreakdown
          .filter(
            (item) =>
              (Number(item.points) || 0) > 0 ||
              item.status === "done" ||
              item.status === "partial",
          )
          .map((item) => item.task_id)
          .filter(Boolean);

        await syncTaskCheckins(completedTaskIds);
        await calculateUpdatesSnapshot(deltaAwarded, completedTaskIds);
      } catch (syncError) {
        console.error(
          "Failed to sync task checkins after manual log:",
          syncError,
        );
      }

      // Check if goal is now complete
      const newPoints = (goal.current_points ?? 0) + deltaAwarded;
      if (goal.target_points && newPoints >= goal.target_points) {
        setShowCelebration(true);
      }

      // Notify challenge listeners
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("challenge-log-updated", {
            detail: { goalId: goal.id, createdAt: new Date().toISOString() },
          }),
        );
      }

    } catch (error: unknown) {
      console.error(error);
      submittedRef.current = false;
      const errorMsg =
        language === "ar"
          ? `فشل في حفظ السجل: ${getErrorMessage(error, "Unknown error")}`
          : `Failed to save log: ${getErrorMessage(error, "Unknown error")}`;
      setNotification({ type: "error", message: errorMsg });
    } finally {
      setLoading(false);
    }
  }, [
    selectedTasks,
    tasks,
    goal.id,
    language,
    supabase,
    t,
    goal.current_points,
    goal.target_points,
    syncTaskCheckins,
    fetchPreviousLogsForAnalysis,
    fetchTodaySessionLog,
    dailyCap,
    maxBasePoints,
    totalScorableTasks,
  ]);

  const handleAISubmit = useCallback(async () => {
    if (!logText.trim() || submittedRef.current) return;
    submittedRef.current = true;
    setLoading(true);

    try {
      const [previousLogs, todaySession] = await Promise.all([
        fetchPreviousLogsForAnalysis(),
        fetchTodaySessionLog(),
      ]);
      setHistoryDays(countDistinctLoggedDays(previousLogs));
      const existingSessionBreakdown = todaySession
        ? parseDailyLogBreakdown(todaySession.breakdown)
        : null;
      const previousAwarded = getAwardedPointsSoFar(
        existingSessionBreakdown?.meta,
        todaySession?.ai_score || 0,
      );
      const nextEntriesCount =
        (existingSessionBreakdown?.meta?.entries_count ??
          (todaySession ? 1 : 0)) + 1;
      const combinedLogText = mergeDaySessionInput(
        todaySession?.user_input,
        logText,
        language,
      );

      const { count: totalLogCount } = await supabase
        .from("daily_logs")
        .select("*", { count: "exact", head: true })
        .eq("goal_id", goal.id);

      const daysSinceStart = goal.created_at
        ? Math.ceil(
            (Date.now() - new Date(goal.created_at).getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : 0;

      // Get AI evaluation with time-based bonus calculation
      const res = await fetch(apiUrl("/api/goal/evaluate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasks,
          log: combinedLogText,
          previousLogs: previousLogs || [],
          goalContext: {
            title: goal.title,
            ai_summary: goal.ai_summary || "",
            current_points: goal.current_points || 0,
            target_points: goal.target_points || 0,
            total_logs: totalLogCount || 0,
            days_since_start: daysSinceStart,
            open_day_session: Boolean(todaySession),
            session_entries_count: nextEntriesCount,
          },
          calculateTimeBonus: true, // New flag for time-based bonus
        }),
      });

      const data = (await res
        .json()
        .catch(() => null)) as EvaluationApiResponse | null;

      if (!res.ok) {
        if (data?.error === "quota_exceeded") {
          submittedRef.current = false;
          setNotification({
            type: "warning",
            message:
              language === "ar"
                ? data.message_ar ||
                  data.message ||
                  "تم تجاوز حد الاستخدام اليومي."
                : data.message_en ||
                  data.message ||
                  "Daily usage limit exceeded.",
          });
          return;
        }
        throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
      }

      if (!data) {
        throw new Error(
          language === "ar"
            ? "لم يتم استلام استجابة صالحة."
            : "No valid response was received.",
        );
      }

      if (data.error === "quota_exceeded") {
        submittedRef.current = false;
        setNotification({
          type: "warning",
          message:
            language === "ar"
              ? data.message_ar ||
                data.message ||
                "تم تجاوز حد الاستخدام اليومي."
              : data.message_en ||
                data.message ||
                "Daily usage limit exceeded.",
        });
        return;
      }

      if (data.status === "refused") {
        submittedRef.current = false;
        setNotification({
          type: "error",
          message:
            data.safe_redirection?.message || "لا يمكن معالجة هذا الطلب.",
        });
        return;
      }

      const reevaluatedTotal = data.total_points_awarded;
      const sessionTotalPoints = Math.max(previousAwarded, reevaluatedTotal);
      const deltaAwarded = Math.max(0, sessionTotalPoints - previousAwarded);
      const previousSessionBonus =
        Number(existingSessionBreakdown?.meta?.bonus_points) || 0;
      const deltaBonusPoints = Math.max(
        0,
        (Number(data.bonus_points) || 0) - previousSessionBonus,
      );
      const deltaBasePoints = Math.max(0, deltaAwarded - deltaBonusPoints);
      const nowIso = new Date().toISOString();
      const sessionMeta: DailyLogPerformanceMeta = {
        ...(data.performance_meta || {
          performance_tier: "average",
          trend: "no_history",
          badge: "none",
          warning_level: "none",
          evidence_level: "solid",
          total_points: sessionTotalPoints,
          base_points: Number(data.base_points) || 0,
          bonus_points: Number(data.bonus_points) || 0,
          daily_cap: dailyCap,
          max_base_points: maxBasePoints,
          score_ratio: 0,
          completion_ratio: 0,
          coverage_ratio: 0,
          completed_tasks: 0,
          partial_tasks: 0,
          missed_tasks: 0,
          total_tasks: totalScorableTasks,
          recent_average: null,
          compared_days: 0,
          delta_from_recent: null,
        }),
        total_points: sessionTotalPoints,
        session_state: "open",
        entries_count: nextEntriesCount,
        last_update_at: nowIso,
        last_evaluated_score: reevaluatedTotal,
        awarded_points_so_far: sessionTotalPoints,
        delta_awarded: deltaAwarded,
      };

      const sessionResult: EvaluationResult = {
        ...data,
        total_points_awarded: deltaAwarded,
        base_points: deltaBasePoints,
        bonus_points: deltaBonusPoints,
        session_total_points: sessionTotalPoints,
        session_entries_count: nextEntriesCount,
        performance_meta: sessionMeta,
      };

      setShowTaskDetails(false);
      setEvaluation(sessionResult);

      const logPayload = {
        goal_id: goal.id,
        user_input: combinedLogText,
        ai_score: sessionTotalPoints,
        ai_feedback: data.full_feedback || data.coach_message,
        breakdown: buildDailyLogBreakdown(
          (data.task_breakdown ||
            data.subtask_breakdown ||
            []) as DailyLogBreakdownItem[],
          sessionMeta,
        ),
      };

      const logResponse = todaySession
        ? await supabase
            .from("daily_logs")
            .update(logPayload)
            .eq("id", todaySession.id)
        : await supabase.from("daily_logs").insert(logPayload);

      if (logResponse.error) throw logResponse.error;

      // Update points only by the newly earned delta
      if (deltaAwarded > 0) {
        const { error: updateError } = await supabase.rpc(
          "increment_goal_points",
          {
            goal_uuid: goal.id,
            points_to_add: deltaAwarded,
          },
        );

        if (updateError) throw updateError;
      }

      try {
        const completedTaskIds = (
          sessionResult.subtask_breakdown ||
          sessionResult.task_breakdown ||
          []
        )
          .filter(
            (item: DailyLogBreakdownItem) =>
              (Number(item?.points) || 0) > 0 ||
              item?.status === "done" ||
              item?.status === "partial",
          )
          .map((item: DailyLogBreakdownItem) => String(item.task_id || ""))
          .filter(Boolean);

        await syncTaskCheckins(completedTaskIds);
        await calculateUpdatesSnapshot(deltaAwarded, completedTaskIds);
      } catch (syncError) {
        console.error("Failed to sync task checkins after AI log:", syncError);
      }

      // Check if goal is now complete
      const newPoints = (goal.current_points ?? 0) + deltaAwarded;
      if (goal.target_points && newPoints >= goal.target_points) {
        setShowCelebration(true);
      }

      // Notify listeners
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("challenge-log-updated", {
            detail: { goalId: goal.id, createdAt: new Date().toISOString() },
          }),
        );
      }

    } catch (error: unknown) {
      console.error(error);
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
    tasks,
    language,
    supabase,
    syncTaskCheckins,
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
      const res = await fetch(apiUrl("/api/goal/milestone"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goalId: goal.id,
          userInput: logText,
          milestoneName,
          targetPoints: goal.target_points || 0,
          dailyCap,
          tasksDescriptions: tasks.map((t) => t.task_description),
          goalContext: goal,
          language,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message || data.error || "Failed to evaluate milestone",
        );
      }

      if (data.status === "rejected") {
        submittedRef.current = false;
        setNotification({
          type: "error",
          message: data.message || "Milestone rejected",
        });
        return;
      }

      // Milestone accepted
      const milestoneResult: EvaluationResult = {
        total_points_awarded: data.score,
        base_points: data.score,
        bonus_points: 0,
        coach_message: data.message,
      };

      setEvaluation(milestoneResult);
      if (typeof data.logId === "string" && data.logId.trim()) {
        setPendingMilestoneImage({
          logId: data.logId,
          score: data.score,
          message: data.message,
          imagePrompt:
            typeof data.imagePrompt === "string" ? data.imagePrompt : "",
        });
        setUploadedMilestoneImageUrl(null);
        setImageUploadError(null);
        setPromptCopied(false);
      }

      const currentPoints = (goal.current_points || 0) + data.score;
      await calculateUpdatesSnapshot(data.score, [], {
        logType: "milestone",
        milestoneTitle: milestoneName,
        milestoneTier: data.tier || "major",
      });
      if (goal.target_points && currentPoints >= goal.target_points) {
        setShowCelebration(true);
      } else {
        setMode("ai"); // Switch to results view style (will use evaluation)
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

  const handleCopyMilestonePrompt = async () => {
    if (!pendingMilestoneImage?.imagePrompt?.trim()) return;
    try {
      await navigator.clipboard.writeText(pendingMilestoneImage.imagePrompt);
      setPromptCopied(true);
      window.setTimeout(() => setPromptCopied(false), 2200);
    } catch (error) {
      setImageUploadError(
        error instanceof Error
          ? error.message
          : language === "ar"
            ? "تعذر نسخ البرومبت"
            : "Could not copy prompt",
      );
    }
  };

  const handleMilestoneImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file || !pendingMilestoneImage || imageUploadLoading) return;

    setImageUploadLoading(true);
    setImageUploadError(null);
    try {
      const formData = new FormData();
      formData.append("goalId", goal.id);
      formData.append("logId", pendingMilestoneImage.logId);
      formData.append("image", file);

      const response = await fetch(apiUrl("/api/goal/milestone/image"), {
        method: "POST",
        body: formData,
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            (language === "ar"
              ? "تعذر رفع صورة الإنجاز"
              : "Could not upload milestone image"),
        );
      }

      setUploadedMilestoneImageUrl(data?.imageUrl || null);
      window.dispatchEvent(
        new CustomEvent("challenge-log-updated", {
          detail: { goalId: goal.id },
        }),
      );
    } catch (error) {
      setImageUploadError(
        error instanceof Error
          ? error.message
          : language === "ar"
            ? "تعذر رفع صورة الإنجاز"
            : "Could not upload milestone image",
      );
    } finally {
      setImageUploadLoading(false);
    }
  };

  // Results screen
  if (evaluation) {
    const isArabic = language === "ar";
    const performanceTier =
      evaluation.performance_meta?.performance_tier ?? "average";
    const performanceLabel =
      evaluation.day_label ||
      getDailyPerformanceLabel(evaluation.performance_meta, language) ||
      (language === "ar" ? "تقييم اليوم" : "Day Review");
    const isMilestoneEvaluation = Boolean(pendingMilestoneImage) || mode === "milestone";
    const performanceStyles = isMilestoneEvaluation
      ? {
          hero: "border-amber-500/30 bg-amber-500/15 text-amber-500 shadow-md shadow-amber-500/10",
          badge: "border-amber-500/30 bg-amber-500/15 text-amber-600 dark:text-amber-400 font-black",
          summary: "border-amber-500/20 bg-amber-500/5 text-foreground",
        }
      : performanceTier === "exceptional"
        ? {
            hero: "border-foreground/15 bg-foreground/12 text-foreground/75",
            badge:
              "border-foreground/15 bg-foreground/12 text-foreground/75",
            summary:
              "border-foreground/15 bg-foreground/12 text-foreground/75",
          }
        : performanceTier === "strong"
          ? {
              hero: "border-foreground/25 bg-foreground/12 text-foreground",
              badge:
                "border-foreground/25 bg-foreground/12 text-foreground",
              summary:
                "border-foreground/25 bg-foreground/12 text-foreground",
            }
          : performanceTier === "weak"
            ? {
                hero: "border-destructive/25 bg-destructive/12 text-destructive",
                badge:
                  "border-destructive/25 bg-destructive/12 text-destructive",
                summary:
                  "border-destructive/25 bg-destructive/12 text-destructive",
              }
            : {
                hero: "border-border bg-muted/60 text-muted-foreground",
                badge:
                  "border-border bg-muted/60 text-muted-foreground",
                summary:
                  "border-border bg-muted/60 text-muted-foreground",
              };
    const HeroIcon = isMilestoneEvaluation ? Trophy : performanceTier === "weak" ? AlertCircle : Flame;
    const finalPerformanceLabel = isMilestoneEvaluation
      ? (isArabic ? "إنجاز مرحلي استثنائي" : "Milestone Achievement")
      : performanceLabel;
    const scoreDisplay = formatPointsDisplay(
      evaluation.total_points_awarded,
      language,
      t.points,
    );
    const bonusDisplay = formatPointsDisplay(
      evaluation.bonus_points,
      language,
      t.points,
    );
    const messageLines = splitResultText(evaluation.coach_message, language);
    const comparisonLines = evaluation.comparison_message
      ? splitResultText(evaluation.comparison_message, language)
      : [];
    const warningLines = evaluation.warning_message
      ? splitResultText(evaluation.warning_message, language)
      : [];
    const sectionLabelClass = isArabic
      ? "text-[12px] font-semibold text-muted-foreground"
      : "text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground";
    const badgeTextClass = isArabic
      ? "text-[13px] font-semibold"
      : "text-[11px] font-bold uppercase tracking-[0.18em]";
    const detailItems = (
      evaluation.subtask_breakdown ||
      evaluation.task_breakdown ||
      []
    ).map((item) => {
      const points = Number(item.points) || 0;
      const status = item.status || "unknown";
      const taskLabel =
        tasks.find((tk: TaskRow) => tk.id === item.task_id)?.task_description ||
        t.generalProgress;
      const statusLabel =
        status === "done"
          ? accountabilityCopy.done
          : status === "partial"
            ? accountabilityCopy.partial
            : status === "missed"
              ? accountabilityCopy.missed
              : accountabilityCopy.unknown;
      const statusClass =
        status === "done"
          ? "border-foreground/25 bg-foreground/12 text-foreground"
          : status === "partial"
            ? "border-border bg-muted/60 text-muted-foreground"
            : status === "missed"
              ? "border-destructive/25 bg-destructive/12 text-destructive"
              : "border-border bg-muted/60 text-muted-foreground";

      return {
        key: `${item.task_id}-${status}`,
        label: taskLabel,
        points,
        timeBonus: item.time_bonus || 0,
        statusLabel,
        statusClass,
      };
    });
    const hasTaskDetails =
      detailItems.length > 0 || Boolean(evaluation.bonus?.points);
    const hasSessionProgress = Boolean(
      (evaluation.session_entries_count &&
        evaluation.session_entries_count > 1) ||
      (evaluation.session_total_points || 0) > evaluation.total_points_awarded,
    );
    const resultShellClass = isArabic ? "text-right" : "text-left";
    const dayTotalText = `${accountabilityCopy.dayTotal}: ${formatLocalizedNumber(evaluation.session_total_points || evaluation.total_points_awarded, language)} ${t.points}`;
    const checkinsText = `${accountabilityCopy.checkins}: ${formatLocalizedNumber(evaluation.session_entries_count || 1, language)}`;

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
        <div className="bg-card rounded-[22px] w-full max-w-md max-h-[88vh] overflow-hidden animate-in zoom-in-95 duration-300 border border-border shadow-sm">
          <div
            className={`p-5 sm:p-6 space-y-4 ${resultShellClass}`}
            dir={language === "ar" ? "rtl" : "ltr"}
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] border ${performanceStyles.hero}`}
              >
                <HeroIcon className="h-7 w-7" />
              </div>

              <div className="min-w-0 flex-1 space-y-2">
                <div
                  className={`inline-flex items-center rounded-full border px-3 py-1 ${badgeTextClass} ${performanceStyles.badge}`}
                >
                  {finalPerformanceLabel}
                </div>

                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <h3 className="text-[1.9rem] font-black leading-none text-foreground">
                    {scoreDisplay}
                  </h3>
                  <span className="text-sm font-medium text-muted-foreground">
                    {hasSessionProgress
                      ? accountabilityCopy.addedNow
                      : t.pointsAwarded}
                  </span>
                  {evaluation.bonus_points > 0 && (
                    <span className="inline-flex items-center rounded-full border border-foreground/15 bg-foreground/12 px-2.5 py-1 text-[11px] font-semibold text-foreground/75">
                      {bonusDisplay}
                    </span>
                  )}
                </div>

                {hasSessionProgress ? (
                  <div className="space-y-0.5 text-sm text-muted-foreground">
                    <p className="font-medium">{dayTotalText}</p>
                    <p className="font-medium">{checkinsText}</p>
                  </div>
                ) : (
                  <p className="text-sm font-medium text-muted-foreground">
                    {t.progressAdded}
                  </p>
                )}
              </div>
            </div>

            <div
              className={`rounded-[18px] border px-4 py-4 ${performanceStyles.summary}`}
            >
              <div className="space-y-1.5">
                {messageLines.map((line, index) => (
                  <p
                    key={`${line}-${index}`}
                    className={cn(
                      "font-semibold text-foreground",
                      isArabic ? "text-[15px] leading-8" : "text-sm leading-7",
                    )}
                  >
                    {line}
                  </p>
                ))}
              </div>
            </div>

            {pendingMilestoneImage && (
              <div className="rounded-[18px] border border-primary/25 bg-primary/12 p-4 text-primary">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/8 text-primary">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-sm font-black">
                      {isArabic
                        ? "أنشئ الصورة خارج التطبيق ثم ارفعها"
                        : "Generate it outside, then upload here"}
                    </p>
                    <p className="text-xs font-medium leading-6 text-primary/75">
                      {uploadedMilestoneImageUrl
                        ? isArabic
                          ? "تم رفع الصورة وربطها ببطاقة الإنجاز."
                          : "Image uploaded and attached to the milestone card."
                        : isArabic
                          ? "انسخ البرومبت، استخدم أي AI خارجي، ثم ارفع النتيجة."
                          : "Copy prompt, use any external AI, then upload the result."}
                    </p>
                    {imageUploadError && (
                      <p className="rounded-xl border border-destructive/25 bg-destructive/12 px-3 py-2 text-xs font-bold text-destructive">
                        {imageUploadError}
                      </p>
                    )}
                    {pendingMilestoneImage.imagePrompt.trim() && (
                      <div className="space-y-2">
                        <div className="rounded-xl border border-primary/25 bg-white/60 px-3 py-2 text-[11px] leading-5 text-primary dark:bg-black/15">
                          {pendingMilestoneImage.imagePrompt}
                        </div>
                        <button
                          type="button"
                          onClick={handleCopyMilestonePrompt}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-black text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90"
                        >
                          <Copy className="h-4 w-4" />
                          {promptCopied
                            ? isArabic
                              ? "تم النسخ"
                              : "Copied"
                            : isArabic
                              ? "نسخ البرومبت"
                              : "Copy prompt"}
                        </button>
                      </div>
                    )}
                    <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-primary/25 bg-primary/12 px-4 py-3 text-sm font-black text-primary transition hover:bg-primary/12">
                      {imageUploadLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      {imageUploadLoading
                        ? isArabic
                          ? "جاري رفع الصورة..."
                          : "Uploading image..."
                        : uploadedMilestoneImageUrl
                          ? isArabic
                            ? "استبدال الصورة"
                            : "Replace image"
                          : isArabic
                            ? "رفع الصورة"
                            : "Upload image"}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={handleMilestoneImageUpload}
                        disabled={imageUploadLoading}
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {evaluation.comparison_message && (
              <div className="rounded-[18px] border border-border bg-muted/12 px-4 py-3.5">
                <p className={sectionLabelClass}>
                  {accountabilityCopy.comparison}
                </p>
                <div className="mt-1.5 space-y-1">
                  {comparisonLines.map((line, index) => (
                    <p
                      key={`${line}-${index}`}
                      className={cn(
                        "text-foreground/90",
                        isArabic
                          ? "text-[14px] leading-7 font-medium"
                          : "text-sm leading-6 font-medium",
                      )}
                    >
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {evaluation.warning_message && (
              <div className="rounded-[18px] border border-destructive/25 bg-destructive/12 px-4 py-3.5 text-destructive">
                <p className={sectionLabelClass}>
                  {accountabilityCopy.warning}
                </p>
                <div className="mt-1.5 space-y-1">
                  {warningLines.map((line, index) => (
                    <p
                      key={`${line}-${index}`}
                      className={cn(
                        "font-semibold",
                        isArabic
                          ? "text-[14px] leading-7"
                          : "text-sm leading-6",
                      )}
                    >
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {hasTaskDetails && (
              <Collapsible
                open={showTaskDetails}
                onOpenChange={setShowTaskDetails}
              >
                <div className="rounded-[18px] border border-border bg-muted/12">
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-start transition-colors hover:bg-muted/20"
                      aria-expanded={showTaskDetails}
                    >
                      <div className="min-w-0">
                        <p
                          className={cn(
                            "font-semibold text-foreground",
                            isArabic ? "text-[15px]" : "text-sm",
                          )}
                        >
                          {showTaskDetails
                            ? accountabilityCopy.hideTasks
                            : accountabilityCopy.showTasks}
                        </p>
                        <p
                          className={cn(
                            "mt-0.5 text-muted-foreground",
                            isArabic ? "text-[13px] leading-6" : "text-xs",
                          )}
                        >
                          {formatLocalizedNumber(detailItems.length, language)}{" "}
                          {accountabilityCopy.scoredTasks}.{" "}
                          {accountabilityCopy.detailsHint}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                          {formatLocalizedNumber(detailItems.length, language)}
                        </span>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 text-muted-foreground transition-transform duration-300",
                            showTaskDetails && "rotate-180",
                          )}
                        />
                      </div>
                    </button>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                    <div className="border-t border-border px-3 pb-3 pt-2">
                      <div className="max-h-60 space-y-2 overflow-y-auto pe-1">
                        {detailItems.map((item) => (
                          <div
                            key={item.key}
                            className="flex items-center gap-3 rounded-[16px] border border-border bg-background px-3 py-2.5"
                          >
                            <div className="min-w-0 flex-1">
                              <p
                                className={cn(
                                  "truncate font-medium text-foreground",
                                  isArabic
                                    ? "text-[14px] leading-7"
                                    : "text-sm",
                                )}
                              >
                                {item.label}
                              </p>
                              <div className="mt-1 flex flex-wrap items-center gap-2">
                                <span
                                  className={cn(
                                    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                                    item.statusClass,
                                  )}
                                >
                                  {item.statusLabel}
                                </span>
                                {item.timeBonus > 0 && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground/75">
                                    <ArrowUpRight className="h-3 w-3" />
                                    {formatPointsDisplay(
                                      item.timeBonus,
                                      language,
                                      t.points,
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div
                              className={cn(
                                "shrink-0 font-black text-foreground",
                                isArabic ? "text-[15px]" : "text-sm",
                              )}
                            >
                              {formatPointsDisplay(
                                item.points,
                                language,
                                t.points,
                              )}
                            </div>
                          </div>
                        ))}

                        {evaluation.bonus && evaluation.bonus.points > 0 && (
                          <div className="flex items-center gap-3 rounded-[16px] border border-foreground/15 bg-foreground/12 px-3 py-2.5 text-foreground/75">
                            <div className="min-w-0 flex-1">
                              <p
                                className={cn(
                                  "font-semibold",
                                  isArabic
                                    ? "text-[14px] leading-7"
                                    : "text-sm",
                                )}
                              >
                                {t.bonus}: {evaluation.bonus.reason}
                              </p>
                            </div>
                            <div
                              className={cn(
                                "shrink-0 font-black",
                                isArabic ? "text-[15px]" : "text-sm",
                              )}
                            >
                              {formatPointsDisplay(
                                evaluation.bonus.points,
                                language,
                                t.points,
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            )}

            <button
              onClick={() => {
                if (updatesStepData) {
                  setShowUpdatesScreen(true);
                } else {
                  onSuccess();
                  onClose();
                }
              }}
              className="w-full py-3.5 bg-primary text-primary-foreground rounded-[18px] font-bold text-base hover:opacity-90 transition-all shadow-none flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{t.nextStep || (isArabic ? "التالي" : "Next")}</span>
              <span className="text-xs opacity-75">({t.continueJourney})</span>
            </button>

            {showCelebration && (
              <GoalCompletionCelebration
                goalTitle={goal.title}
                language={language}
                onClose={() => {
                  setShowCelebration(false);
                  onSuccess();
                  onClose();
                }}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  // Updates Screen (Animated metrics: tube progress, streak flame, days remaining, completed tasks)
  if (showUpdatesScreen && updatesStepData) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[80] flex items-center justify-center p-4">
        <div className="bg-card rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 sm:p-6 border border-border shadow-2xl animate-in zoom-in-95 duration-300">
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

  // Mode selection screen
  if (mode === "select") {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">

        <div className="bg-card rounded-t-[1.5rem] sm:rounded-3xl w-full max-w-lg overflow-hidden animate-in slide-in-from-bottom duration-300 border border-border shadow-2xl shadow-black/10 flex flex-col">
          <div className="p-6 border-b border-border/70 flex justify-between items-center shrink-0">
            <div className="flex-1" dir={language === "ar" ? "rtl" : "ltr"}>
              <h3 className="text-xl font-extrabold text-foreground tracking-tight">
                {t.logProgress}
              </h3>
              <p className="text-xs text-muted-foreground/75 font-semibold mt-1.5 uppercase tracking-wider">
                {goal.title}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 hover:bg-muted/60 rounded-xl transition-all duration-200 active:scale-95 shrink-0 border border-border/45 hover:border-border/70"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          <div
            className="px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-6 space-y-3"
            dir={language === "ar" ? "rtl" : "ltr"}
          >
            <p className="text-sm text-muted-foreground/75 font-semibold mb-5">
              {t.logProgressMode}
            </p>

            <button
              onClick={() => setMode("ai")}
              className="w-full p-5 bg-primary/12 border-2 border-primary/15 rounded-2xl hover:bg-primary/12 hover:border-primary/25 transition-all duration-200 active:scale-[0.98] group shadow-sm hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/12 rounded-xl flex items-center justify-center shrink-0 border border-primary/15 group-hover:border-primary/25 transition-colors">
                  <Bot className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 text-start">
                  <h4 className="font-bold text-foreground text-base mb-1">
                    {t.aiMode}
                  </h4>
                  <p className="text-sm text-muted-foreground/75 leading-relaxed">
                    {t.aiModeDesc}
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setMode("manual")}
              className="w-full p-5 bg-chart-2/[0.04] border-2 border-chart-2/15 rounded-2xl hover:bg-chart-2/[0.08] hover:border-chart-2/30 transition-all duration-200 active:scale-[0.98] group shadow-sm hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-chart-2/10 rounded-xl flex items-center justify-center shrink-0 border border-chart-2/10 group-hover:border-chart-2/20 transition-colors">
                  <Hand className="w-6 h-6 text-chart-2" />
                </div>
                <div className="flex-1 text-start">
                  <h4 className="font-bold text-foreground text-base mb-1">
                    {t.manualMode}
                  </h4>
                  <p className="text-sm text-muted-foreground/75 leading-relaxed">
                    {t.manualModeDesc}
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setMode("milestone")}
              className="w-full p-5 bg-primary/12 border-2 border-primary/15 rounded-2xl hover:bg-primary/12 hover:border-primary/25 transition-all duration-200 active:scale-[0.98] group shadow-sm hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/12 rounded-xl flex items-center justify-center shrink-0 border border-primary/15 group-hover:border-primary/25 transition-colors">
                  <Trophy className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 text-start">
                  <h4 className="font-bold text-foreground text-base mb-1">
                    {language === "ar"
                      ? "إنجاز كبير (Milestone)"
                      : "Major Milestone"}
                  </h4>
                  <p className="text-sm text-muted-foreground/75 leading-relaxed">
                    {language === "ar"
                      ? "سجل إنجازاً استثنائياً كبيراً لتحصل على مكافأة ضخمة"
                      : "Log an exceptional achievement for massive points"}
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>

      </div>
    );
  }

  // AI mode screen
  if (mode === "ai") {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="bg-card rounded-t-[1.5rem] sm:rounded-3xl w-full max-w-lg overflow-hidden animate-in slide-in-from-bottom duration-300 border border-border shadow-2xl shadow-black/10 flex flex-col">
          <div className="p-6 border-b border-border/70 flex justify-between items-center shrink-0">
            <div className="flex-1" dir={language === "ar" ? "rtl" : "ltr"}>
              <h3 className="text-xl font-extrabold text-foreground tracking-tight">{t.aiMode}</h3>
              <p className="text-xs text-muted-foreground/75 font-semibold mt-1.5 uppercase tracking-wider">
                {goal.title}
              </p>
            </div>
            <button
              onClick={() => setMode("select")}
              className="p-2.5 hover:bg-muted/60 rounded-xl transition-all duration-200 active:scale-95 border border-border/45 hover:border-border/70"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {notification && (
            <div
              className={`mx-6 mt-4 p-3.5 rounded-xl flex items-center gap-3 shadow-sm ${notification.type === "error" ? "bg-destructive/12 border border-destructive/15 text-destructive" : "bg-primary/12 border border-primary/15 text-primary"}`}
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-semibold flex-1">{notification.message}</p>
              <button
                onClick={() => setNotification(null)}
                className="p-1.5 hover:bg-muted/60 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {loading ? (
            <AnalyzingScreen
              language={language}
              logText={logText}
              taskCount={totalScorableTasks}
              historyDays={historyDays}
            />
          ) : (
          <div className="px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-6 space-y-6">
            <div className="space-y-2.5">
              <label className="text-sm font-bold text-muted-foreground/75 uppercase tracking-widest px-1">
                {t.describeWhatYouDid}
              </label>
              <div className="relative">
                <textarea
                  value={logText}
                  onChange={(e) => setLogText(e.target.value)}
                  placeholder={t.progressPlaceholder}
                  className="w-full h-48 p-4 border-2 rounded-2xl resize-none transition-all duration-200 placeholder:text-muted-foreground/50 bg-muted/20 text-foreground border-border/45 focus:border-primary/45 focus:bg-card focus:shadow-sm focus:shadow-primary/12"
                  dir={language === "ar" ? "rtl" : "ltr"}
                />
                <div className="absolute bottom-4 end-4">
                  <VoiceRecorder
                    onTranscript={handleVoiceTranscript}
                    language={language === "ar" ? "ar" : "en"}
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-primary/12 rounded-2xl flex gap-3 text-primary text-sm border border-primary/15 shadow-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p dir={language === "ar" ? "rtl" : "ltr"} className="font-medium leading-relaxed">{t.aiJudgeNote}</p>
            </div>

            <button
              onClick={handleAISubmit}
              disabled={!logText.trim()}
              className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-lg hover:opacity-90 hover:-translate-y-px transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:translate-y-0 shadow-lg shadow-primary/12 active:scale-[0.98]"
            >
              <Send className="w-5 h-5" /> {t.submitLog}
            </button>
          </div>
          )}
        </div>
      </div>
    );
  }

  // Milestone mode screen
  if (mode === "milestone") {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="bg-card rounded-t-[1.5rem] sm:rounded-3xl w-full max-w-lg overflow-hidden animate-in slide-in-from-bottom duration-300 border border-primary/25 shadow-2xl shadow-primary/12 flex flex-col">
          <div className="p-6 border-b border-border/70 flex justify-between items-center shrink-0 bg-primary/8">
            <div className="flex-1" dir={language === "ar" ? "rtl" : "ltr"}>
              <h3 className="text-xl font-extrabold text-primary flex items-center gap-2.5 tracking-tight">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/12 border border-primary/15">
                  <Trophy className="w-4 h-4" />
                </span>
                {language === "ar"
                  ? "إنجاز كبير (Milestone)"
                  : "Major Milestone"}
              </h3>
              <p className="text-xs text-muted-foreground/75 font-semibold uppercase tracking-wider mt-1.5 truncate">
                {goal.title}
              </p>
            </div>
            <button
              onClick={() => setMode("select")}
              className="p-2.5 hover:bg-muted/60 rounded-xl transition-all duration-200 active:scale-95 border border-border/45 hover:border-border/70 shrink-0"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {notification && (
            <div
              className={`mx-6 mt-4 p-3.5 rounded-xl flex items-center gap-3 shadow-sm ${notification.type === "error" ? "bg-destructive/12 border border-destructive/15 text-destructive" : "bg-primary/12 border border-primary/15 text-primary"}`}
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-semibold flex-1">{notification.message}</p>
              <button
                onClick={() => setNotification(null)}
                className="p-1.5 hover:bg-muted/60 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {loading ? (
            <AnalyzingScreen
              language={language}
              logText={logText}
              taskCount={totalScorableTasks}
              historyDays={historyDays}
              variant="milestone"
            />
          ) : (
          <div
            className="px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-5 space-y-5 flex-1 overflow-y-auto"
            dir={language === "ar" ? "rtl" : "ltr"}
          >
            <div className="p-4 bg-foreground/60/[0.06] border border-foreground/15 rounded-2xl flex gap-3 text-foreground/75 text-sm shadow-sm">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-foreground/60/10 border border-foreground/15">
                <AlertCircle className="w-4 h-4" />
              </span>
              <p className="font-medium leading-relaxed">
                {language === "ar"
                  ? "تحذير: الإنجازات يجب أن تكون قفزات هائلة مقارنة بالمهام العادية. إذا كان هذا مجرد إنجاز لمهامك المعتادة، سيتم رفضه من قبل الذكاء الاصطناعي ولن تحصل على أي نقاط!"
                  : "WARNING: Milestones must be massive leaps compared to normal tasks. If this is just a regular task, it will be rejected by AI and you will get NO points!"}
              </p>
            </div>

            <div className="space-y-2.5">
              <label className="text-sm font-bold text-muted-foreground/75 uppercase tracking-wider">
                {language === "ar" ? "اسم الإنجاز" : "Milestone Name"}
              </label>
              <input
                type="text"
                value={milestoneName}
                onChange={(e) => setMilestoneName(e.target.value)}
                placeholder={
                  language === "ar"
                    ? "مثال: إطلاق التطبيق، اجتياز الاختبار النهائي..."
                    : "e.g. Launched App, Passed Final Exam..."
                }
                className="w-full p-4 border-2 rounded-2xl transition-all duration-200 placeholder:text-muted-foreground/50 bg-muted/20 text-foreground border-border/45 focus:border-primary/45 focus:bg-card focus:shadow-sm focus:shadow-primary/12 font-bold text-[15px]"
              />
            </div>

            <div className="space-y-2.5">
              <label className="text-sm font-bold text-muted-foreground/75 uppercase tracking-wider">
                {t.describeWhatYouDid}
              </label>
              <div className="relative">
                <textarea
                  value={logText}
                  onChange={(e) => setLogText(e.target.value)}
                  placeholder={
                    language === "ar"
                      ? "اشرح بالتفصيل لماذا يعتبر هذا الإنجاز قفزة استثنائية في هدفك..."
                      : "Explain in detail why this is an exceptional leap in your goal..."
                  }
                  className="w-full h-36 p-4 border-2 rounded-2xl resize-none transition-all duration-200 placeholder:text-muted-foreground/50 bg-muted/20 text-foreground border-border/45 focus:border-primary/45 focus:bg-card focus:shadow-sm focus:shadow-primary/12 text-[15px] leading-relaxed"
                />
                <div className="absolute bottom-4 end-4">
                  <VoiceRecorder
                    onTranscript={handleVoiceTranscript}
                    language={language === "ar" ? "ar" : "en"}
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleMilestoneSubmit}
              disabled={!logText.trim() || !milestoneName.trim()}
              className="w-full py-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl font-extrabold text-lg transition-all duration-200 flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:hover:translate-y-0 hover:-translate-y-px shadow-lg shadow-primary/20 active:scale-[0.98]"
            >
              <Trophy className="w-5 h-5" />
              {language === "ar" ? "سجل الإنجاز الكبير" : "Log Major Milestone"}
            </button>
          </div>
          )}
        </div>
      </div>
    );
  }

  // Manual mode screen
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-card rounded-t-[1.5rem] sm:rounded-3xl w-full max-w-lg max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom duration-300 border border-border shadow-2xl shadow-black/10 flex flex-col">
        <div className="p-6 border-b border-border/70 flex justify-between items-center shrink-0">
          <div className="flex-1" dir={language === "ar" ? "rtl" : "ltr"}>
            <h3 className="text-xl font-extrabold text-foreground tracking-tight">
              {t.manualMode}
            </h3>
            <p className="text-xs text-muted-foreground/75 font-semibold uppercase tracking-wider mt-1.5">
              {goal.title}
            </p>
          </div>
          <button
            onClick={() => setMode("select")}
            className="p-2.5 hover:bg-muted/60 rounded-xl transition-all duration-200 active:scale-95 border border-border/45 hover:border-border/70 shrink-0"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {notification && (
          <div
            className={`mx-6 mt-4 p-3.5 rounded-xl flex items-center gap-3 shadow-sm ${notification.type === "error" ? "bg-destructive/12 border border-destructive/15 text-destructive" : "bg-primary/12 border border-primary/15 text-primary"}`}
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm flex-1">{notification.message}</p>
            <button
              onClick={() => setNotification(null)}
              className="p-1 hover:bg-muted rounded-full"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <p className="text-sm text-muted-foreground font-medium">
            {t.selectCompletedTasks}
          </p>

          {mainTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t.noTasksToSelect}
            </div>
          ) : (
            mainTasks.map((main) => {
              // If main task has subtasks, show them
              if (main.subtasks && main.subtasks.length > 0) {
                return (
                  <div key={main.id} className="space-y-2.5">
                    <div
                      className="font-extrabold text-sm text-foreground/75 px-1 flex items-center gap-2"
                      dir={language === "ar" ? "rtl" : "ltr"}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0" />
                      {main.task_description}
                    </div>
                    {main.subtasks.map((sub) => {
                      const isSelected = selectedTasks.has(sub.id);
                      const selectedData = selectedTasks.get(sub.id);

                      return (
                        <div
                          key={sub.id}
                          className={`rounded-2xl p-4 space-y-3 transition-all duration-200 cursor-pointer select-none active:scale-[0.99] ${isSelected ? "bg-primary/12 border-2 border-primary/25 shadow-md shadow-primary/12" : "bg-muted/12 border-2 border-border/45 hover:border-primary/25 hover:bg-muted/12 hover:shadow-sm"}`}
                          onClick={() => toggleTaskSelection(sub.id)}
                        >
                          <div
                            className="w-full flex items-center gap-3"
                            dir={language === "ar" ? "rtl" : "ltr"}
                          >
                            <div
                              className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all duration-200 shrink-0 shadow-sm ${isSelected ? "bg-primary border-primary scale-105 shadow-primary/20" : "border-border bg-card hover:border-primary/45"}`}
                            >
                              {isSelected && (
                                <Check className="w-5 h-5 text-primary-foreground stroke-[2.5]" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p
                                className="font-semibold text-[15px] text-foreground leading-snug"
                                dir={language === "ar" ? "rtl" : "ltr"}
                              >
                                {sub.task_description}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-[11px] font-bold text-muted-foreground/75 border border-border/45">
                                  {t.weight}: {sub.impact_weight}
                                </span>
                                {sub.time_required_minutes && (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-[11px] font-bold text-muted-foreground/75 border border-border/45">
                                    <Clock className="w-2.5 h-2.5" />
                                    {sub.time_required_minutes} {t.minutes}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {isSelected && sub.time_required_minutes && (
                            <div
                              className={`space-y-2.5 ${language === "ar" ? "pe-9" : "ps-9"}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <label
                                className="text-[11px] font-bold text-muted-foreground/75 uppercase tracking-wider flex items-center gap-2"
                                dir={language === "ar" ? "rtl" : "ltr"}
                              >
                                <Clock className="w-3.5 h-3.5 text-primary/75" />
                                {t.timeSpent}
                              </label>
                              <input
                                type="number"
                                min="0"
                                placeholder={`${t.expectedTime}: ${sub.time_required_minutes} ${t.minutes}`}
                                value={selectedData?.timeSpentMinutes || ""}
                                onChange={(e) =>
                                  updateTaskTime(
                                    sub.id,
                                    parseInt(e.target.value) || 0,
                                  )
                                }
                                className="w-full px-4 py-2.5 bg-card border-2 border-border/70 rounded-xl text-sm focus:border-primary/45 focus:shadow-sm focus:shadow-primary/12 transition-all duration-200"
                                dir={language === "ar" ? "rtl" : "ltr"}
                              />
                              {selectedData?.timeSpentMinutes &&
                                selectedData.timeSpentMinutes >
                                  sub.time_required_minutes && (
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-chart-1 bg-chart-1/[0.08] px-3 py-1.5 rounded-lg border border-chart-1/15 w-fit">
                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                    +{Math.floor(
                                      (sub.impact_weight || 0) *
                                        (selectedData.timeSpentMinutes /
                                          sub.time_required_minutes -
                                          1) *
                                        0.5,
                                    )}{" "}
                                    {t.bonusPoints}
                                  </div>
                                )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              }

              // If no subtasks, show the main task itself as selectable
              const isSelected = selectedTasks.has(main.id);
              const selectedData = selectedTasks.get(main.id);

              return (
                <div
                  key={main.id}
                  className={`rounded-2xl p-4 space-y-3 transition-all duration-200 cursor-pointer select-none active:scale-[0.99] ${isSelected ? "bg-primary/12 border-2 border-primary/25 shadow-md shadow-primary/12" : "bg-muted/12 border-2 border-border/45 hover:border-primary/25 hover:bg-muted/12 hover:shadow-sm"}`}
                  onClick={() => toggleTaskSelection(main.id)}
                >
                  <div
                    className="w-full flex items-center gap-3"
                    dir={language === "ar" ? "rtl" : "ltr"}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all duration-200 shrink-0 shadow-sm ${isSelected ? "bg-primary border-primary scale-105 shadow-primary/20" : "border-border bg-card hover:border-primary/45"}`}
                    >
                      {isSelected && (
                        <Check className="w-5 h-5 text-primary-foreground stroke-[2.5]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="font-semibold text-[15px] text-foreground leading-snug"
                        dir={language === "ar" ? "rtl" : "ltr"}
                      >
                        {main.task_description}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-[11px] font-bold text-muted-foreground/75 border border-border/45">
                          {t.weight}: {main.impact_weight}
                        </span>
                        {main.time_required_minutes && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-[11px] font-bold text-muted-foreground/75 border border-border/45">
                            <Clock className="w-2.5 h-2.5" />
                            {main.time_required_minutes} {t.minutes}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {isSelected && main.time_required_minutes && (
                    <div
                      className={`space-y-2.5 ${language === "ar" ? "pe-9" : "ps-9"}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <label
                        className="text-[11px] font-bold text-muted-foreground/75 uppercase tracking-wider flex items-center gap-2"
                        dir={language === "ar" ? "rtl" : "ltr"}
                      >
                        <Clock className="w-3.5 h-3.5 text-primary/75" />
                        {t.timeSpent}
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder={`${t.expectedTime}: ${main.time_required_minutes} ${t.minutes}`}
                        value={selectedData?.timeSpentMinutes || ""}
                        onChange={(e) =>
                          updateTaskTime(main.id, parseInt(e.target.value) || 0)
                        }
                        className="w-full px-4 py-2.5 bg-card border-2 border-border/70 rounded-xl text-sm focus:border-primary/45 focus:shadow-sm focus:shadow-primary/12 transition-all duration-200"
                        dir={language === "ar" ? "rtl" : "ltr"}
                      />
                      {selectedData?.timeSpentMinutes &&
                        selectedData.timeSpentMinutes >
                          main.time_required_minutes && (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-chart-1 bg-chart-1/[0.08] px-3 py-1.5 rounded-lg border border-chart-1/15 w-fit">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            +{Math.floor(
                              (main.impact_weight || 0) *
                                (selectedData.timeSpentMinutes /
                                  main.time_required_minutes -
                                  1) *
                                0.5,
                            )}{" "}
                            {t.bonusPoints}
                          </div>
                        )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="border-t border-border/70 shrink-0 px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-6">
          <button
            onClick={handleManualSubmit}
            disabled={loading || selectedTasks.size === 0}
            className="w-full py-4 bg-foreground text-background rounded-2xl font-extrabold text-lg transition-all duration-200 flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:hover:translate-y-0 hover:-translate-y-px shadow-lg shadow-foreground/12 active:scale-[0.98]"
          >
            {loading ? (
              <Loader2 className="animate-spin w-5 h-5" />
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>{t.submitLog}</span>
                <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-white/20 text-xs font-black">
                  {selectedTasks.size}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
