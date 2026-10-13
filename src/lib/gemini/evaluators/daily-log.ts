/* eslint-disable @typescript-eslint/no-explicit-any */
import { callWithRetry } from "../gemini-client.ts";
import { extractJson } from "../extract-json.ts";
import { checkContentSafety, detectLanguage } from "../safety.ts";
import {
  buildTaskHierarchy,
  calculateDailyCap,
  deriveMainBreakdown,
  getScorableTasks,
  type TaskRow,
  type MainTask,
} from "@/lib/task-hierarchy";
import { analyzeDailyPerformance } from "@/lib/daily-log-feedback";

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

function normalizeFrequency(value: any): "daily" | "weekly" {
  return value === "weekly" ? "weekly" : "daily";
}

export function convertMainTasksToRows(mainTasksInput: any[]): TaskRow[] {
  if (!Array.isArray(mainTasksInput)) return [];
  const rows: TaskRow[] = [];

  for (const main of mainTasksInput) {
    const mainId = main.id || `m-${Math.random().toString(36).slice(2, 8)}`;
    rows.push({
      id: mainId,
      goal_id: main.goal_id || "virtual-goal",
      task_description: main.task_description || main.task || "Main Task",
      impact_weight: clamp(Number(main.impact_weight) || 5, 1, 10),
      frequency: normalizeFrequency(main.frequency),
      task_type: "main",
      parent_task_id: null,
      time_required_minutes: Number(main.time_required_minutes) || 0,
      completion_criteria: main.completion_criteria || "",
      sort_order: Number(main.sort_order) || 0,
    });

    const subtasks = Array.isArray(main.subtasks) ? main.subtasks : [];
    subtasks.forEach((sub: any, idx: number) => {
      rows.push({
        id: sub.id || `${mainId}-s${idx + 1}`,
        goal_id: main.goal_id || "virtual-goal",
        task_description: sub.task_description || sub.task || "Subtask",
        impact_weight: clamp(Number(sub.impact_weight) || 1, 1, 5),
        frequency: normalizeFrequency(sub.frequency),
        task_type: "sub",
        parent_task_id: mainId,
        time_required_minutes: Number(sub.time_required_minutes) || 0,
        completion_criteria: sub.completion_criteria || "",
        sort_order: Number(sub.sort_order) || idx,
      });
    });
  }

  return rows;
}

export async function evaluateDailyLog(
  planTasks: any[],
  userLog: string,
  previousLogs: any[] = [],
  goalContext: any = {},
  mainTasksInput: any[] = [],
  calculateTimeBonus: boolean = false,
) {
  const safetyCheck = checkContentSafety(userLog);
  if (!safetyCheck.isSafe) {
    return {
      status: "refused",
      safe_redirection: {
        message: safetyCheck.reason,
        alternatives: [
          "Please reach out to professional support if you are in distress.",
        ],
      },
    };
  }

  const userLanguage = detectLanguage(userLog);

  const sourceRows: TaskRow[] =
    Array.isArray(planTasks) && planTasks.length > 0
      ? planTasks
      : convertMainTasksToRows(mainTasksInput);

  const hierarchy = buildTaskHierarchy(sourceRows);
  const scorableTasks = getScorableTasks(sourceRows);
  const fallbackTasks =
    scorableTasks.length > 0
      ? scorableTasks
      : [
          {
            id: "general-progress",
            task_description: "General progress",
            impact_weight: 3,
            frequency: "daily" as const,
            parent_task_id: null,
          },
        ];

  const dynamicDailyCap = calculateDailyCap(sourceRows);
  const maxBasePoints = fallbackTasks.reduce(
    (sum, t) => sum + (t.impact_weight || 0),
    0,
  );

  const timeBonusInstruction = calculateTimeBonus
    ? `
TIME-BASED BONUS:
- If user mentions time spent on a task that exceeds the task's time_required_minutes, award bonus points.
- Bonus calculation: (actual_time / expected_time - 1) * base_points * 0.5
- Add time_bonus field to subtask_breakdown items when applicable.
- Include total time bonus in the main bonus.points field.
`
    : "";

  const coachPersona = goalContext?.coach_persona || "balanced";
  const coachPersonaInstruction =
    coachPersona === "strict"
      ? "COACH PERSONA: Strict & Uncompromising. Direct, highly rigorous, zero sugarcoating, focus on standard and discipline."
      : coachPersona === "analytical"
        ? "COACH PERSONA: Analytical & Pragmatic. Focus on exact numbers, percentages of criteria achieved, time spent, and tangible outputs."
        : "COACH PERSONA: Balanced & Encouraging. Positive yet honest, acknowledges genuine effort, reinforces momentum, and gently points out what remains.";

  const localTimeContext = goalContext?.local_time
    ? `CURRENT USER LOCAL TIME: ${goalContext.local_time}. If this is morning/afternoon, encourage the user to keep going for the rest of the day. If evening/night, summarize the day's total harvest.`
    : "";

  const systemPrompt = `
SYSTEM ROLE:
You are "Daily Judge & Accountability Coach" for METRIX.
${coachPersonaInstruction}
${localTimeContext}

LANGUAGE RULE:
- User language is ${userLanguage === "ar" ? "Arabic" : "English"}.
- Respond fully in ${userLanguage === "ar" ? "Arabic" : "English"}.

SCORING RULES:
- Score defined tasks against their "completion_criteria".
- Each task has impact_weight 1..5 which is the max points for that task.
- STATUS MAPPING:
  - done => 80%..100% of weight (if completed or substantially done e.g. 70%+ of criteria, reward encouragingly with ~80%-100% of weight, rounded to whole integer).
  - partial => 40%..75% of weight (honest progress made but noticeable part of criteria remains, rounded to whole integer).
  - missed/unknown => 0
- ALL points MUST be whole integer numbers (e.g. 1, 2, 3, 4, 5). Never output decimal numbers like 2.5 or 2.7.
- Bonus allowed only for extra verified work beyond defined tasks: 0..5 (whole integer)
- MAX BASE POINTS today = ${maxBasePoints}
- ABSOLUTE DAILY CAP = ${dynamicDailyCap}
- total_points_awarded = min(ABSOLUTE DAILY CAP, sum(task points) + bonus)
${timeBonusInstruction}
ANTI-GAMING & FAIRNESS:
- Repeated/copied logs => conservative score and warning in reason.
- If progress is weak, reasons should clearly state what was missing from the completion criteria.
- If the report is a partial daytime update, score what was accomplished so far. Subsequent reports on the same day accumulate towards the daily cap.

OUTPUT JSON ONLY:
{
  "status": "ok" | "refused",
  "date": "YYYY-MM-DD",
  "detected_language": "ar" | "en",
  "subtask_breakdown": [
    {
      "task_id": "string",
      "status": "done|partial|missed|unknown",
      "points": number,
      "reason": "string",
      "time_bonus": number (optional, if time exceeded)
    }
  ],
  "bonus": {"points": number, "reason": "string"},
  "total_points_awarded": number,
  "base_points": number,
  "bonus_points": number,
  "coach_message": "string",
  "comparison_with_previous": "string",
  "safe_redirection": {"message": "string", "alternatives": ["string"]}
}
`;

  const previousLogsContext =
    previousLogs.length > 0
      ? `\nPREVIOUS LOGS (for consistency):\n${JSON.stringify(
          previousLogs.slice(0, 5).map((log) => ({
            date: log.created_at,
            points_awarded: log.ai_score,
            what_user_reported: log.user_input?.substring(0, 150),
          })),
          null,
          2,
        )}`
      : "";

  const userPrompt = `
GOAL CONTEXT:
${JSON.stringify(goalContext || {}, null, 2)}

DEFINED SUBTASKS:
${JSON.stringify(
  fallbackTasks.map((t) => {
    const taskRow = sourceRows.find((row) => row.id === t.id);
    return {
      id: t.id,
      task_description: t.task_description,
      frequency: t.frequency,
      impact_weight: t.impact_weight,
      max_points_possible: t.impact_weight,
      time_required_minutes: taskRow?.time_required_minutes || null,
    };
  }),
  null,
  2,
)}

USER REPORT:
<<<BEGIN_USER_INPUT>>>
${userLog}
<<<END_USER_INPUT>>>

WORD COUNT: ${userLog.trim().split(/\s+/).length}
${previousLogsContext}
`;

  try {
    const response = await callWithRetry(
      {
        responseMimeType: "application/json",
        systemInstruction: {
          parts: [{ text: systemPrompt }],
          role: "system",
        },
      },
      { role: "user", parts: [{ text: userPrompt }] },
      (text: string) => extractJson(text),
    );

    const responseText = response.text || "";
    if (!responseText) throw new Error("Empty response from Gemini API");

    const parsed = extractJson(responseText);
    const aiBreakdown = Array.isArray(parsed.subtask_breakdown)
      ? parsed.subtask_breakdown
      : Array.isArray(parsed.task_breakdown)
        ? parsed.task_breakdown
        : [];

    const normalizedSubtaskBreakdown = aiBreakdown.map((item: any) => ({
      task_id: String(item.task_id || ""),
      status: (item.status || "unknown") as
        | "done"
        | "partial"
        | "missed"
        | "unknown",
      points: Math.round(Math.max(0, Number(item.points) || 0)),
      reason: item.reason || "",
      time_bonus: item.time_bonus
        ? Math.round(Math.max(0, Number(item.time_bonus)))
        : undefined,
    }));

    const bonusPoints = Math.round(clamp(Number(parsed?.bonus?.points) || 0, 0, 10));
    const sumSubtaskPoints = normalizedSubtaskBreakdown.reduce(
      (sum: number, item: any) => sum + (Number(item.points) || 0),
      0,
    );
    const totalAwarded = Math.round(
      clamp(sumSubtaskPoints + bonusPoints, 0, dynamicDailyCap),
    );
    const basePoints = Math.round(clamp(sumSubtaskPoints, 0, maxBasePoints));
    const responseBonusPoints = bonusPoints;

    const mainBreakdown = deriveMainBreakdown(
      hierarchy as MainTask[],
      normalizedSubtaskBreakdown,
    );

    const performance = analyzeDailyPerformance({
      source: "ai",
      language: userLanguage,
      logText: userLog,
      items: normalizedSubtaskBreakdown,
      totalPoints: totalAwarded,
      basePoints,
      bonusPoints: responseBonusPoints,
      dailyCap: dynamicDailyCap,
      maxBasePoints,
      totalTasks: fallbackTasks.length,
      previousLogs,
    });

    return {
      ...parsed,
      detected_language: parsed.detected_language || userLanguage,
      subtask_breakdown: normalizedSubtaskBreakdown,
      task_breakdown: normalizedSubtaskBreakdown, // backward compatibility alias
      main_breakdown: mainBreakdown,
      daily_cap: dynamicDailyCap,
      bonus: {
        points: bonusPoints,
        reason: parsed?.bonus?.reason || "",
      },
      base_points: basePoints,
      bonus_points: responseBonusPoints,
      total_points_awarded: totalAwarded,
      day_label: performance.copy.day_label,
      comparison_message: performance.copy.comparison_message,
      warning_message: performance.copy.warning_message,
      performance_meta: performance.meta,
      full_feedback:
        typeof parsed?.coach_message === "string" &&
        parsed.coach_message.trim()
          ? parsed.coach_message.trim()
          : performance.copy.full_feedback,
      coach_message:
        typeof parsed?.coach_message === "string" &&
        parsed.coach_message.trim()
          ? parsed.coach_message.trim()
          : performance.copy.coach_message,
      comparison_with_previous: performance.copy.comparison_message,
      score: totalAwarded,
    };
  } catch (error) {
    console.error("Gemini evaluateDailyLog Error:", error);
    throw error;
  }
}
