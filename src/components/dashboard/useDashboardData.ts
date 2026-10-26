import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  getPeriodStart,
  getPeriodTypeFromFrequency,
  getLocalDateKey,
  getLocalDayWindow,
} from "@/lib/task-periods";
import {
  computeStreak,
  getFreezableDate,
  parseStreakFreezes,
} from "@/lib/streak";
import { parseDailyLogBreakdown } from "@/lib/daily-log-feedback";
import type { TaskRow } from "@/lib/task-hierarchy";
import type { TaskProgressInfo } from "./ReorderableTaskCards";
import {
  type ActivityLog,
  type DailyLogBreakdownRow,
  type TaskCheckin,
  normalizeBreakdown,
} from "./types";

interface UseDashboardDataOptions {
  goalId: string;
  isArabic: boolean;
  onGoalUpdated?: () => void;
  showSuccessToast?: (msg: string) => void;
}

export function useDashboardData({
  goalId,
  isArabic,
  onGoalUpdated,
  showSuccessToast,
}: UseDashboardDataOptions) {
  const supabase = useMemo(() => createClient(), []);

  // --- State ---
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [checkins, setCheckins] = useState<TaskCheckin[]>([]);
  const [todayLoggedTaskIds, setTodayLoggedTaskIds] = useState<string[]>([]);
  const [todayBreakdownMap, setTodayBreakdownMap] = useState<
    Map<string, { points: number; status?: string; reason?: string }>
  >(new Map());
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const previousCompletedTodayRef = useRef<Set<string>>(new Set<string>());
  const [freshlyCompletedTaskIds, setFreshlyCompletedTaskIds] = useState<
    Set<string>
  >(new Set<string>());
  const [streak, setStreak] = useState(0);
  const [loggedDateKeys, setLoggedDateKeys] = useState<Set<string>>(
    () => new Set<string>(),
  );
  const [streakFreezes, setStreakFreezes] = useState<string[]>([]);
  const [freezing, setFreezing] = useState(false);
  const [chartData, setChartData] = useState<
    { date: string; points: number }[]
  >([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [logsLoaded, setLogsLoaded] = useState(false);

  const [activeDateKey, setActiveDateKey] = useState(() => getLocalDateKey());
  const todayDateKey = activeDateKey;

  // Detect day rollover (e.g. crossing midnight while app is open, or resuming on a new day)
  useEffect(() => {
    const checkDayRollover = () => {
      const latestDateKey = getLocalDateKey();
      if (latestDateKey !== activeDateKey) {
        setActiveDateKey(latestDateKey);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkDayRollover();
      }
    };

    window.addEventListener("focus", checkDayRollover);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    const interval = window.setInterval(checkDayRollover, 30_000);

    return () => {
      window.removeEventListener("focus", checkDayRollover);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.clearInterval(interval);
    };
  }, [activeDateKey]);

  // --- Fetch methods ---
  const fetchTasks = useCallback(
    async (showSkeleton = false) => {
      if (showSkeleton) {
        setLoadingTasks(true);
      }
      if (!goalId) {
        setLoadingTasks(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("sub_layers")
          .select("*")
          .eq("goal_id", goalId)
          .order("sort_order", { ascending: true });

        if (error) {
          const errMsg =
            error.message ||
            error.details ||
            error.hint ||
            error.code ||
            (typeof error === "object" ? JSON.stringify(error) : String(error));
          console.error("fetchTasks error:", errMsg);
          setTasks((prev) => {
            if (prev.length === 0) {
              setFetchError(
                isArabic
                  ? "تعذر تحميل المهام. حاول مرة أخرى."
                  : "Could not load tasks. Please try again.",
              );
            }
            return prev;
          });
        } else if (Array.isArray(data)) {
          setFetchError(null);
          setTasks(
            data.map((row) => ({
              id: row.id,
              goal_id: row.goal_id,
              task_description: row.task_description,
              impact_weight: row.impact_weight,
              frequency: row.frequency,
              time_required_minutes: row.time_required_minutes,
              completion_criteria: row.completion_criteria,
              task_type: row.task_type || "main",
              parent_task_id: row.parent_task_id || null,
              sort_order: row.sort_order ?? 0,
              icon: row.icon || null,
              accent_color: row.accent_color || null,
              schedule_days: (() => {
                const dbVal = (row as any).schedule_days;
                if (dbVal !== undefined && dbVal !== null) return dbVal;
                try {
                  const raw =
                    typeof window !== "undefined"
                      ? localStorage.getItem(`metrix:task_schedule:${row.id}`)
                      : null;
                  if (raw) return JSON.parse(raw);
                } catch {}
                return null;
              })(),
              mini_version: row.mini_version ?? null,
            })),
          );
        }
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        console.error("fetchTasks error:", errMsg);
        setTasks((prev) => {
          if (prev.length === 0) {
            setFetchError(
              isArabic
                ? "تعذر تحميل المهام. حاول مرة أخرى."
                : "Could not load tasks. Please try again.",
            );
          }
          return prev;
        });
      } finally {
        setLoadingTasks(false);
      }
    },
    [goalId, supabase, isArabic],
  );

  const fetchCheckins = useCallback(async () => {
    const todayKey = getPeriodStart("daily");
    const weekKey = getPeriodStart("weekly");

    const { data, error } = await supabase
      .from("task_checkins")
      .select("*")
      .eq("goal_id", goalId)
      .in("period_start", [todayKey, weekKey]);

    if (!error && data) {
      setCheckins(data);
    }
  }, [goalId, supabase]);

  const fetchTodayLoggedTasks = useCallback(async () => {
    const { start, end } = getLocalDayWindow();
    const { data, error } = await supabase
      .from("daily_logs")
      .select("created_at, breakdown")
      .eq("goal_id", goalId)
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString())
      .not("breakdown", "is", null)
      .order("created_at", { ascending: false });

    if (error || !data) {
      setTodayLoggedTaskIds([]);
      setTodayBreakdownMap(new Map());
      return;
    }

    const bMap = new Map<
      string,
      { points: number; status?: string; reason?: string }
    >();
    const doneTaskIds = new Set<string>();

    (data as DailyLogBreakdownRow[]).forEach((log) => {
      normalizeBreakdown(log.breakdown).forEach((item) => {
        if (!bMap.has(item.task_id)) {
          bMap.set(item.task_id, {
            points: Number(item.points) || 0,
            status: item.status,
          });
        }
        if (item.status === "done") {
          doneTaskIds.add(item.task_id);
        }
      });
    });

    setTodayBreakdownMap(bMap);
    setTodayLoggedTaskIds(Array.from(doneTaskIds));
  }, [goalId, supabase]);

  const fetchStreak = useCallback(async () => {
    const [{ data }, { data: goalRow }] = await Promise.all([
      supabase
        .from("daily_logs")
        .select("created_at")
        .eq("goal_id", goalId)
        .order("created_at", { ascending: false })
        .limit(365),
      supabase
        .from("goals")
        .select("streak_freezes")
        .eq("id", goalId)
        .maybeSingle(),
    ]);

    const freezes = parseStreakFreezes(goalRow?.streak_freezes);
    setStreakFreezes(freezes);

    const dateKeys = new Set<string>();
    for (const log of data || []) {
      if (log.created_at) {
        dateKeys.add(getLocalDateKey(new Date(log.created_at)));
      }
    }

    setLoggedDateKeys(dateKeys);
    setStreak(computeStreak(dateKeys, freezes));
  }, [goalId, supabase]);

  const fetchChartData = useCallback(async () => {
    const [logsRes, checkinsRes, tasksRes] = await Promise.all([
      supabase
        .from("daily_logs")
        .select("created_at, ai_score, breakdown")
        .eq("goal_id", goalId)
        .order("created_at", { ascending: true }),
      supabase
        .from("task_checkins")
        .select("task_id, period_start, completed, completed_at")
        .eq("goal_id", goalId)
        .eq("completed", true),
      supabase
        .from("sub_layers")
        .select("id, impact_weight")
        .eq("goal_id", goalId),
    ]);

    const taskWeightMap = new Map<string, number>();
    if (tasksRes.data) {
      for (const t of tasksRes.data) {
        taskWeightMap.set(t.id, Number(t.impact_weight) || 1);
      }
    }

    const grouped = new Map<string, number>();
    const creditedTasksByDate = new Map<string, Set<string>>();

    if (logsRes.data) {
      for (const log of logsRes.data) {
        if (!log.created_at) continue;
        const dateKey = getLocalDateKey(new Date(log.created_at));
        grouped.set(
          dateKey,
          (grouped.get(dateKey) || 0) + (log.ai_score || 0),
        );

        let taskSet = creditedTasksByDate.get(dateKey);
        if (!taskSet) {
          taskSet = new Set<string>();
          creditedTasksByDate.set(dateKey, taskSet);
        }

        if (log.breakdown) {
          const breakdownItems = parseDailyLogBreakdown(log.breakdown).items;
          for (const item of breakdownItems) {
            if (
              (Number(item.points) || 0) > 0 ||
              item.status === "done" ||
              item.status === "partial"
            ) {
              taskSet.add(item.task_id);
            }
          }
        }
      }
    }

    if (checkinsRes.data) {
      for (const checkin of checkinsRes.data) {
        if (!checkin.completed) continue;
        const dateKey = checkin.completed_at
          ? getLocalDateKey(new Date(checkin.completed_at))
          : checkin.period_start;
        if (!dateKey) continue;

        let taskSet = creditedTasksByDate.get(dateKey);
        if (!taskSet) {
          taskSet = new Set<string>();
          creditedTasksByDate.set(dateKey, taskSet);
        }

        if (taskSet.has(checkin.task_id)) {
          continue;
        }

        taskSet.add(checkin.task_id);
        const weight = taskWeightMap.get(checkin.task_id) ?? 1;
        grouped.set(dateKey, (grouped.get(dateKey) || 0) + weight);
      }
    }

    setChartData(
      Array.from(grouped.entries()).map(([date, points]) => ({
        date,
        points,
      })),
    );
  }, [goalId, supabase]);

  const fetchLogs = useCallback(async () => {
    const { data } = await supabase
      .from("daily_logs")
      .select("id, created_at, user_input, ai_score, ai_feedback, breakdown")
      .eq("goal_id", goalId)
      .order("created_at", { ascending: false });

    if (data) setLogs(data as ActivityLog[]);
    setLogsLoaded(true);
  }, [goalId, supabase]);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      fetchTasks(),
      fetchChartData(),
      fetchLogs(),
      fetchCheckins(),
      fetchStreak(),
      fetchTodayLoggedTasks(),
    ]);
  }, [
    fetchTasks,
    fetchChartData,
    fetchLogs,
    fetchCheckins,
    fetchStreak,
    fetchTodayLoggedTasks,
  ]);

  // Initial and reactive fetches
  useEffect(() => {
    fetchTasks();
    fetchCheckins();
    fetchTodayLoggedTasks();
    fetchStreak();
    fetchChartData();
    fetchLogs();
  }, [
    activeDateKey,
    fetchTasks,
    fetchCheckins,
    fetchTodayLoggedTasks,
    fetchStreak,
    fetchChartData,
    fetchLogs,
  ]);

  useEffect(() => {
    const onChallengeLogUpdated = (event: Event) => {
      const custom = event as CustomEvent<{ goalId?: string }>;
      if (!custom.detail?.goalId || custom.detail.goalId === goalId) {
        void refreshAll();
        onGoalUpdated?.();
      }
    };

    window.addEventListener(
      "challenge-log-updated",
      onChallengeLogUpdated as EventListener,
    );
    return () => {
      window.removeEventListener(
        "challenge-log-updated",
        onChallengeLogUpdated as EventListener,
      );
    };
  }, [goalId, refreshAll, onGoalUpdated]);

  // Streak rest day
  const freezableDate = useMemo(
    () => getFreezableDate(loggedDateKeys, streakFreezes),
    [loggedDateKeys, streakFreezes],
  );

  const isSchemaOutdated = (error: { code?: string } | null) =>
    error?.code === "42703" || error?.code === "PGRST204";

  const handleUseStreakFreeze = async () => {
    if (!freezableDate || freezing) return;
    setFreezing(true);
    try {
      const next = [...streakFreezes, freezableDate];
      const { error } = await supabase
        .from("goals")
        .update({ streak_freezes: next })
        .eq("id", goalId);

      if (error) {
        if (isSchemaOutdated(error)) {
          showSuccessToast?.(
            isArabic
              ? "شغّل supabase/migrations/0006_adaptive.sql أول"
              : "Run supabase/migrations/0006_adaptive.sql first",
          );
        } else {
          showSuccessToast?.(
            isArabic ? "تعذر تسجيل يوم الراحة" : "Could not save the rest day",
          );
        }
        return;
      }

      setStreakFreezes(next);
      setStreak(computeStreak(loggedDateKeys, next));
      showSuccessToast?.(
        isArabic ? "❄️ يوم راحة — السلسلة مستمرة" : "❄️ Rest day — streak kept",
      );
    } finally {
      setFreezing(false);
    }
  };

  // Checkin & progress calculation helpers
  const isChecked = useCallback(
    (taskId: string, frequency: string): boolean => {
      const periodType = getPeriodTypeFromFrequency(frequency);
      const periodStart = getPeriodStart(frequency);
      const hasCheckin = checkins.some(
        (c) =>
          c.task_id === taskId &&
          c.period_type === periodType &&
          c.period_start === periodStart &&
          c.completed,
      );

      return hasCheckin || todayLoggedTaskIds.includes(taskId);
    },
    [checkins, todayLoggedTaskIds],
  );

  const getTaskProgress = useCallback(
    (taskId: string, frequency: string = "daily"): TaskProgressInfo => {
      const taskItem = tasks.find((t) => t.id === taskId);
      const maxPoints = Math.max(1, Number(taskItem?.impact_weight) || 1);

      const periodType = getPeriodTypeFromFrequency(frequency);
      const periodStart = getPeriodStart(frequency);
      const hasManualCheckin = checkins.some(
        (c) =>
          c.task_id === taskId &&
          c.period_type === periodType &&
          c.period_start === periodStart &&
          c.completed,
      );

      const breakdownItem = todayBreakdownMap.get(taskId);

      if (breakdownItem) {
        const pts = Math.max(0, Number(breakdownItem.points) || 0);
        const isDone =
          breakdownItem.status === "done" ||
          (pts >= maxPoints && maxPoints > 0);
        const isPartial =
          breakdownItem.status === "partial" || (!isDone && pts > 0);

        if (isDone) {
          const rawPct = Math.round((pts / maxPoints) * 100);
          return {
            points: pts,
            maxPoints,
            progress: Math.max(100, rawPct),
            isCompleted: true,
            status: "done",
          };
        }

        if (isPartial) {
          const rawPct = Math.min(
            99,
            Math.max(1, Math.round((pts / maxPoints) * 100)),
          );
          return {
            points: pts,
            maxPoints,
            progress: rawPct,
            isCompleted: false,
            status: "partial",
          };
        }

        if (hasManualCheckin) {
          return {
            points: maxPoints,
            maxPoints,
            progress: 100,
            isCompleted: true,
            status: "done",
          };
        }

        return {
          points: 0,
          maxPoints,
          progress: 0,
          isCompleted: false,
          status: breakdownItem.status === "missed" ? "missed" : "idle",
        };
      }

      if (hasManualCheckin) {
        return {
          points: maxPoints,
          maxPoints,
          progress: 100,
          isCompleted: true,
          status: "done",
        };
      }

      return {
        points: 0,
        maxPoints,
        progress: 0,
        isCompleted: false,
        status: "idle",
      };
    },
    [checkins, tasks, todayBreakdownMap],
  );

  const completedTodayTaskIds = useMemo(() => {
    const completedIds = new Set<string>(todayLoggedTaskIds);
    const { start, end } = getLocalDayWindow();

    checkins.forEach((checkin) => {
      if (!checkin.completed || !checkin.completed_at) return;

      const completedAt = new Date(checkin.completed_at);
      if (completedAt >= start && completedAt < end) {
        completedIds.add(checkin.task_id);
      }
    });

    return completedIds;
  }, [checkins, todayLoggedTaskIds]);

  const isCompletedToday = useCallback(
    (taskId: string) => completedTodayTaskIds.has(taskId),
    [completedTodayTaskIds],
  );

  const shouldAnimateTask = useCallback(
    (taskId: string) => freshlyCompletedTaskIds.has(taskId),
    [freshlyCompletedTaskIds],
  );

  // Freshly completed tasks animation timeout
  useEffect(() => {
    const nextFreshIds = Array.from(completedTodayTaskIds).filter(
      (taskId) => !previousCompletedTodayRef.current.has(taskId),
    );

    previousCompletedTodayRef.current = new Set(completedTodayTaskIds);

    if (nextFreshIds.length === 0) return;

    setFreshlyCompletedTaskIds((prev) => {
      const next = new Set(prev);
      nextFreshIds.forEach((taskId) => next.add(taskId));
      return next;
    });

    const timeout = window.setTimeout(() => {
      setFreshlyCompletedTaskIds((prev) => {
        const next = new Set(prev);
        nextFreshIds.forEach((taskId) => next.delete(taskId));
        return next;
      });
    }, 1800);

    return () => window.clearTimeout(timeout);
  }, [completedTodayTaskIds]);

  const findCheckin = useCallback(
    (taskId: string, frequency: string) => {
      const periodType = getPeriodTypeFromFrequency(frequency);
      const periodStart = getPeriodStart(frequency);
      return checkins.find(
        (c) =>
          c.task_id === taskId &&
          c.period_type === periodType &&
          c.period_start === periodStart,
      );
    },
    [checkins],
  );

  const getSkipReason = useCallback(
    (taskId: string, frequency: string): string | null =>
      findCheckin(taskId, frequency)?.skip_reason ?? null,
    [findCheckin],
  );

  return {
    supabase,
    tasks,
    setTasks,
    checkins,
    setCheckins,
    todayLoggedTaskIds,
    todayBreakdownMap,
    loadingTasks,
    fetchError,
    setFetchError,
    streak,
    setStreak,
    loggedDateKeys,
    streakFreezes,
    setStreakFreezes,
    freezing,
    freezableDate,
    chartData,
    logs,
    logsLoaded,
    activeDateKey,
    todayDateKey,
    completedTodayTaskIds,
    freshlyCompletedTaskIds,
    fetchTasks,
    fetchCheckins,
    fetchTodayLoggedTasks,
    fetchStreak,
    fetchChartData,
    fetchLogs,
    refreshAll,
    handleUseStreakFreeze,
    isChecked,
    getTaskProgress,
    isCompletedToday,
    shouldAnimateTask,
    findCheckin,
    getSkipReason,
  };
}
