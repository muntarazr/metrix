import type { SupabaseClient } from "@supabase/supabase-js";
import type { Language } from "@/lib/translations";
import type { TaskRow } from "@/lib/task-hierarchy";
import {
  getLocalDateKey,
  getPeriodStart,
  getPeriodTypeFromFrequency,
} from "@/lib/task-periods";
import {
  buildDailyLogBreakdown,
  getAwardedPointsSoFar,
  parseDailyLogBreakdown,
  type DailyLogBreakdownItem,
  type DailyLogPerformanceMeta,
} from "@/lib/daily-log-feedback";
import type { ProgressUpdatesData } from "./ProgressUpdatesStep";
import { computeStreak, parseStreakFreezes } from "@/lib/streak";
import { calendarDaysUntilGoalEnd } from "@/lib/goal-dates";
import { apiUrl, getAuthHeaders } from "@/lib/api";
import {
  mergeDaySessionInput,
  type EvaluationApiResponse,
  type EvaluationResult,
  type TaskCheckinRow,
  type TodaySessionLogRow,
} from "./progress-log-helpers";

export async function calculateUpdatesSnapshot(
  supabase: SupabaseClient,
  goal: {
    id: string;
    estimated_completion_date?: string | null;
    current_points?: number;
    target_points?: number;
  },
  totalScorableTasks: number,
  deltaAwarded: number,
  completedInSessionTaskIds: string[],
  options?: {
    logType?: "daily" | "milestone";
    milestoneTitle?: string;
    milestoneTier?: "minor" | "major" | "legendary";
  },
): Promise<ProgressUpdatesData | null> {
  const [{ data: logsData }, { data: goalRow }] = await Promise.all([
    supabase
      .from("daily_logs")
      .select("created_at")
      .eq("goal_id", goal.id)
      .order("created_at", { ascending: false })
      .limit(365),
    supabase
      .from("goals")
      .select(
        "streak_freezes, estimated_completion_date, current_points, target_points",
      )
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

  const prevDateKeys = new Set(dateKeys);
  const todayKey = getLocalDateKey();
  prevDateKeys.delete(todayKey);
  const prevStreak = computeStreak(prevDateKeys, freezes);
  const newStreak = computeStreak(dateKeys, freezes);

  const estDate =
    goalRow?.estimated_completion_date || goal.estimated_completion_date;
  const currentDaysRemaining = calendarDaysUntilGoalEnd(estDate);
  const prevDaysRemaining =
    currentDaysRemaining !== null ? currentDaysRemaining + 1 : null;
  const newDaysRemaining = currentDaysRemaining;

  const totalTasks = totalScorableTasks;
  const newlyCompletedCount = completedInSessionTaskIds.length;
  const prevTasksDone = 0;
  const newTasksDone = Math.min(
    totalTasks,
    Math.max(prevTasksDone, newlyCompletedCount),
  );

  const prevPoints = Number(goal.current_points) || 0;
  const newPoints = prevPoints + deltaAwarded;
  const targetPoints =
    Number(goalRow?.target_points || goal.target_points) || 100;

  return {
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
  };
}

export async function syncTaskCheckins(
  supabase: SupabaseClient,
  targetGoalIds: string[],
  tasks: TaskRow[],
  defaultGoalId: string,
  taskIds: string[],
): Promise<void> {
  const uniqueTaskIds = Array.from(new Set(taskIds.filter(Boolean)));
  if (uniqueTaskIds.length === 0) return;

  const nowIso = new Date().toISOString();
  const todayKey = getPeriodStart("daily");
  const weekKey = getPeriodStart("weekly");

  const { data: existingRows, error: existingError } = await supabase
    .from("task_checkins")
    .select("id, task_id, period_type, period_start, completed, completed_at")
    .in("goal_id", targetGoalIds)
    .in("task_id", uniqueTaskIds)
    .in("period_start", [todayKey, weekKey]);

  if (existingError) {
    throw new Error(existingError.message || "Failed to fetch task checkins");
  }

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
      goal_id: task.goal_id || defaultGoalId,
      task_id: taskId,
      period_type: periodType,
      period_start: periodStart,
      completed: true,
      completed_at: nowIso,
    });
  });

  if (rowsToInsert.length > 0) {
    const { error } = await supabase.from("task_checkins").insert(rowsToInsert);
    if (error) {
      throw new Error(error.message || "Failed to insert task checkins");
    }
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
    if (failedUpdate?.error) {
      throw new Error(failedUpdate.error.message || "Failed to update task checkins");
    }
  }
}

export async function submitMultiGoalLog({
  supabase,
  goals,
  logText,
  language,
}: {
  supabase: SupabaseClient;
  goals: Array<{
    id: string;
    title: string;
    ai_summary?: string;
    current_points?: number;
    target_points?: number;
  }>;
  logText: string;
  language: Language;
}): Promise<
  | {
      evaluation: EvaluationResult;
      totalPointsAdded: number;
    }
  | {
      quotaExceeded: true;
      message: string;
    }
> {
  const { data: allTasksData } = await supabase
    .from("sub_layers")
    .select("id, goal_id, task_description, impact_weight, frequency")
    .in(
      "goal_id",
      goals.map((g) => g.id),
    );

  const goalsPayload = goals.map((g) => ({
    id: g.id,
    title: g.title,
    description: g.ai_summary || "",
    current_points: g.current_points || 0,
    target_points: g.target_points || 0,
    tasks: (allTasksData || [])
      .filter((t) => t.goal_id === g.id)
      .map((t) => ({
        id: t.id,
        title: t.task_description,
        impact_weight: t.impact_weight,
      })),
  }));

  const persona =
    typeof window !== "undefined"
      ? localStorage.getItem("metrix:coach_persona") || "balanced"
      : "balanced";

  const res = await fetch(apiUrl("/api/goal/evaluate-multi"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({
      goals: goalsPayload,
      userInput: logText.trim(),
      language: language === "ar" ? "ar" : "en",
      coachPersona: persona,
    }),
  });

  const multiData = await res.json().catch(() => null);
  if (!res.ok) {
    if (multiData?.error === "quota_exceeded") {
      return {
        quotaExceeded: true,
        message:
          language === "ar"
            ? multiData.message_ar
            : multiData.message_en,
      };
    }
    throw new Error(multiData?.error || multiData?.message || `HTTP ${res.status}`);
  }

  const evaluatedGoals = multiData.goals || [];
  const nowIso = new Date().toISOString();
  let totalPointsAdded = 0;

  for (const item of evaluatedGoals) {
    const pointsToAward = Math.round(Number(item.points_to_award) || 0);
    if (item.mentioned || pointsToAward > 0) {
      totalPointsAdded += pointsToAward;
      const { error: insertError } = await supabase.from("daily_logs").insert({
        goal_id: item.goal_id,
        user_input: item.extracted_activity || logText,
        ai_score: pointsToAward,
        ai_feedback: item.feedback,
        coaching_message: item.feedback,
        breakdown: {
          source: "multi_goal_ai_log",
          extracted_activity: item.extracted_activity,
          completed_task_ids: item.completed_task_ids || [],
          full_session_log: logText,
          goal_title: item.goal_title,
        },
      });
      if (insertError) {
        throw new Error(insertError.message || "Failed to insert multi-goal daily log");
      }

      if (pointsToAward > 0) {
        const { error: rpcError } = await supabase.rpc("increment_goal_points", {
          goal_uuid: item.goal_id,
          points_to_add: pointsToAward,
        });
        if (rpcError) {
          throw new Error(rpcError.message || "Failed to increment goal points");
        }
      }
      if (item.completed_task_ids && item.completed_task_ids.length > 0) {
        const checkinRows = item.completed_task_ids.map((taskId: string) => {
          const task = (allTasksData || []).find((t) => t.id === taskId);
          const freq = (task?.frequency as "daily" | "weekly") || "daily";
          return {
            goal_id: item.goal_id,
            task_id: taskId,
            period_type: getPeriodTypeFromFrequency(freq),
            period_start: getPeriodStart(freq),
            completed: true,
            completed_at: nowIso,
          };
        });
        await supabase.from("task_checkins").upsert(checkinRows, {
          onConflict: "task_id,period_type,period_start",
        });
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("challenge-log-updated", {
            detail: { goalId: item.goal_id, createdAt: nowIso },
          }),
        );
      }
    }
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("metrix-refresh-goals"));
  }

  const breakdownItems: DailyLogBreakdownItem[] = evaluatedGoals.map(
    (eg: any) => ({
      task_id: eg.goal_id,
      task_description: `${eg.goal_title}: ${eg.extracted_activity}`,
      points: eg.points_to_award,
      status: eg.mentioned ? "done" : "skipped",
      evidence: eg.feedback,
    }),
  );

  return {
    totalPointsAdded,
    evaluation: {
      total_points_awarded: totalPointsAdded,
      base_points: totalPointsAdded,
      bonus_points: 0,
      coach_message:
        multiData.overall_summary ||
        (language === "ar"
          ? "تم تحليل وتوزيع إنجازاتك بنجاح!"
          : "Achievements evaluated successfully!"),
      subtask_breakdown: breakdownItems,
      task_breakdown: breakdownItems,
    },
  };
}

export async function submitSingleGoalDailyLog({
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
}: {
  supabase: SupabaseClient;
  goal: {
    id: string;
    title: string;
    ai_summary?: string;
    created_at?: string;
    current_points?: number;
    target_points?: number;
  };
  tasks: TaskRow[];
  logText: string;
  language: Language;
  previousLogs: Array<{
    created_at: string;
    ai_score: number | null;
    user_input: string;
  }>;
  todaySession: TodaySessionLogRow | null;
  dailyCap: number;
  maxBasePoints: number;
  totalScorableTasks: number;
}): Promise<
  | {
      evaluation: EvaluationResult;
      deltaAwarded: number;
      completedTaskIds: string[];
    }
  | {
      errorType: "quota" | "refused";
      message: string;
    }
> {
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

  const res = await fetch(apiUrl("/api/goal/evaluate"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
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
        coach_persona:
          typeof window !== "undefined"
            ? localStorage.getItem("metrix:coach_persona") || "balanced"
            : "balanced",
      },
      calculateTimeBonus: true,
    }),
  });

  const data = (await res
    .json()
    .catch(() => null)) as EvaluationApiResponse | null;

  if (!res.ok) {
    if (data?.error === "quota_exceeded") {
      return {
        errorType: "quota",
        message:
          language === "ar"
            ? data.message_ar || data.message || "تم تجاوز حد الاستخدام اليومي."
            : data.message_en || data.message || "Daily usage limit exceeded.",
      };
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
    return {
      errorType: "quota",
      message:
        language === "ar"
          ? data.message_ar || data.message || "تم تجاوز حد الاستخدام اليومي."
          : data.message_en || data.message || "Daily usage limit exceeded.",
    };
  }

  if (data.status === "refused") {
    return {
      errorType: "refused",
      message: data.safe_redirection?.message || "لا يمكن معالجة هذا الطلب.",
    };
  }

  const reevaluatedTotal = Math.round(Number(data.total_points_awarded) || 0);
  const sessionTotalPoints = Math.round(Math.max(previousAwarded, reevaluatedTotal));
  const deltaAwarded = Math.round(Math.max(0, sessionTotalPoints - previousAwarded));
  const previousSessionBonus =
    Math.round(Number(existingSessionBreakdown?.meta?.bonus_points) || 0);
  const deltaBonusPoints = Math.round(Math.max(
    0,
    (Number(data.bonus_points) || 0) - previousSessionBonus,
  ));
  const deltaBasePoints = Math.round(Math.max(0, deltaAwarded - deltaBonusPoints));
  const nowIso = new Date().toISOString();
  const sessionMeta: DailyLogPerformanceMeta = {
    ...(data.performance_meta || {
      performance_tier: "average",
      trend: "no_history",
      badge: "none",
      warning_level: "none",
      evidence_level: "solid",
      total_points: sessionTotalPoints,
      base_points: Math.round(Number(data.base_points) || 0),
      bonus_points: Math.round(Number(data.bonus_points) || 0),
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
    base_points: deltaBasePoints,
    bonus_points: deltaBonusPoints,
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

  const rawBreakdownItems = (
    data.task_breakdown ||
    data.subtask_breakdown ||
    []
  ) as DailyLogBreakdownItem[];
  const roundedBreakdownItems = rawBreakdownItems.map((item) => ({
    ...item,
    points: Math.round(Number(item.points) || 0),
    time_bonus:
      item.time_bonus !== undefined
        ? Math.round(Number(item.time_bonus) || 0)
        : undefined,
  }));

  const logPayload = {
    goal_id: goal.id,
    user_input: combinedLogText,
    ai_score: Math.round(sessionTotalPoints),
    ai_feedback: data.full_feedback || data.coach_message,
    breakdown: buildDailyLogBreakdown(
      roundedBreakdownItems,
      sessionMeta,
    ),
  };

  const logResponse = todaySession
    ? await supabase
        .from("daily_logs")
        .update(logPayload)
        .eq("id", todaySession.id)
    : await supabase.from("daily_logs").insert(logPayload);

  if (logResponse.error) {
    throw new Error(logResponse.error.message || "Failed to save daily log");
  }

  if (deltaAwarded > 0) {
    const { error: updateError } = await supabase.rpc(
      "increment_goal_points",
      {
        goal_uuid: goal.id,
        points_to_add: Math.round(deltaAwarded),
      },
    );

    if (updateError) {
      throw new Error(updateError.message || "Failed to increment goal points");
    }
  }

  const completedTaskIds = roundedBreakdownItems
    .filter(
      (item: DailyLogBreakdownItem) =>
        (Number(item?.points) || 0) > 0 ||
        item?.status === "done" ||
        item?.status === "partial",
    )
    .map((item: DailyLogBreakdownItem) => String(item.task_id || ""))
    .filter(Boolean);

  return {
    evaluation: sessionResult,
    deltaAwarded,
    completedTaskIds,
  };
}

export async function submitMilestoneLog({
  goal,
  tasks,
  logText,
  milestoneName,
  dailyCap,
  language,
}: {
  goal: {
    id: string;
    target_points?: number;
  };
  tasks: TaskRow[];
  logText: string;
  milestoneName: string;
  dailyCap: number;
  language: Language;
}): Promise<
  | {
      status: "accepted";
      score: number;
      message: string;
      tier: "minor" | "major" | "legendary";
      logId?: string;
      imagePrompt?: string;
      imageUrl?: string;
    }
  | {
      status: "rejected";
      message: string;
    }
> {
  const res = await fetch(apiUrl("/api/goal/milestone"), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
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
    return {
      status: "rejected",
      message: data.message || "Milestone rejected",
    };
  }

  return {
    status: "accepted",
    score: data.score,
    message: data.message,
    tier: data.tier || "major",
    logId: data.logId,
    imagePrompt: data.imagePrompt,
    imageUrl: data.imageUrl,
  };
}
