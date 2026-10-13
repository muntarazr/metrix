/* eslint-disable @typescript-eslint/no-explicit-any */
import { callWithRetry } from "../gemini-client.ts";
import { extractJson } from "../extract-json.ts";
import { checkContentSafety } from "../safety.ts";
import type { TaskRow } from "@/lib/task-hierarchy";
import type {
  DailyFocusGoalContext,
  DailyFocusHistoryItem,
  DailyFocusLogContext,
  DailyFocusResult,
} from "@/lib/daily-focus";
import { DAILY_FOCUS_REQUIRED_DAYS } from "@/lib/daily-focus";

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export const DAILY_FOCUS_ANGLES = [
  {
    enLabel: "Method Fit",
    arLabel: "ملاءمة الطريقة",
    prompt:
      "Ask whether the current learning or work method truly fits the user's reality and strengths.",
  },
  {
    enLabel: "Yesterday Review",
    arLabel: "مراجعة الأمس",
    prompt:
      "Anchor the question in yesterday or the latest real execution, not abstract motivation.",
  },
  {
    enLabel: "Task Value",
    arLabel: "قيمة المهمة",
    prompt:
      "Check if the current tasks are actually moving the user closer to the goal or just keeping them busy.",
  },
  {
    enLabel: "Obstacle",
    arLabel: "العائق",
    prompt:
      "Surface the specific friction, blocker, or pattern that is slowing execution.",
  },
  {
    enLabel: "Evidence",
    arLabel: "الدليل",
    prompt:
      "Ask for real evidence that the current plan is producing progress toward the target.",
  },
  {
    enLabel: "Sustainability",
    arLabel: "الاستمرارية الواقعية",
    prompt:
      "Check whether the plan is sustainable day after day and what should change to keep it realistic.",
  },
];

export function hashSeed(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function pickDailyFocusAngle(seed: string, language: "ar" | "en") {
  const angle = DAILY_FOCUS_ANGLES[hashSeed(seed) % DAILY_FOCUS_ANGLES.length];
  return {
    label: language === "ar" ? angle.arLabel : angle.enLabel,
    prompt: angle.prompt,
  };
}

export async function generateDailyFocus(
  goalContext: DailyFocusGoalContext,
  taskRows: TaskRow[],
  recentLogs: DailyFocusLogContext[] = [],
  options: {
    date?: string;
    answer?: string;
    existingQuestion?: string;
    history?: DailyFocusHistoryItem[];
    rejectedSuggestions?: Array<{ title?: string; reason?: string; action_summary?: string }>;
    language?: "ar" | "en";
  } = {},
): Promise<DailyFocusResult> {
  const safetySource = [
    goalContext.title,
    goalContext.ai_summary || "",
    options.answer || "",
  ]
    .join("\n")
    .trim();
  const safetyCheck = checkContentSafety(safetySource);
  if (!safetyCheck.isSafe) {
    return {
      status: "refused",
      date: options.date || new Date().toISOString().split("T")[0],
      angle_label: "",
      question: "",
      question_why: "",
      answer_coaching: "",
      suggestions: [],
      suggestions_unlocked: false,
      answered_days_count: 0,
      required_answer_days: DAILY_FOCUS_REQUIRED_DAYS,
      safe_redirection: {
        message: safetyCheck.reason,
        alternatives: [
          "Please reach out to professional support if you are in distress.",
        ],
      },
    };
  }

  const currentDate =
    options.date || new Date().toISOString().split("T")[0];
  const userLanguage =
    options.language || ((goalContext as any).language === "en" ? "en" : "ar");
  const isArabic = userLanguage === "ar";
  const userGoalCreatedDate =
    typeof goalContext.created_at === "string" &&
    goalContext.created_at.trim()
      ? goalContext.created_at.split("T")[0]
      : currentDate;

  const msPerDay = 1000 * 60 * 60 * 24;
  const createdDateObj = new Date(userGoalCreatedDate);
  const currentDateObj = new Date(currentDate);
  const diffDays = Math.max(
    0,
    Math.floor(
      (currentDateObj.getTime() - createdDateObj.getTime()) / msPerDay,
    ),
  );

  const answeredDaysCount = Math.max(
    0,
    Array.isArray(options.history) ? options.history.length : 0,
  );
  // Strict 5-day lock rule: only unlock suggestions once the goal is at least 5 days old
  const suggestionsUnlocked = diffDays >= DAILY_FOCUS_REQUIRED_DAYS;

  const activeTasks = taskRows.map((task) => ({
    id: task.id,
    task_type: task.task_type,
    parent_task_id: task.parent_task_id,
    task_description: task.task_description,
    frequency: task.frequency,
    impact_weight: task.impact_weight,
    time_required_minutes: task.time_required_minutes,
    completion_criteria: task.completion_criteria,
  }));

  const focusAngle = pickDailyFocusAngle(
    `${goalContext.id || goalContext.title}-${currentDate}`,
    userLanguage,
  );

  const systemPrompt = `
SYSTEM ROLE:
You are the "Daily Focus & Plan Adjustment Coach" inside METRIX.
Your job is not to deliver generic motivation. Your job is to inspect real progress, challenge the fit between the user and their current plan, and propose surgical changes when they are justified.

LANGUAGE REQUIREMENT:
- All output fields meant for the user must be in ${isArabic ? "Arabic" : "English"}.
- Sound grounded, analytical, concise, and direct. Avoid fluffy cheerleading.

CURRENT ANGLE OF INQUIRY:
- Angle Label: "${focusAngle.label}"
- Directive: ${focusAngle.prompt}

CONTEXT RULES:
1. QUESTION MODE (when no user answer is provided):
   - Formulate ONE sharp question anchored in the selected angle, the goal's recent logs, and the current task breakdown.
   - Explain why this question matters right now in "question_why" (1-2 sentences).
   - "answer_coaching" should be empty string "".
   - "suggestions" MUST be empty array [] because the user has not answered yet.

2. ANSWER MODE (when the user provides an answer):
   - Evaluate the user's answer against their goal context and recent logs.
   - Deliver "answer_coaching": 2-3 sentences of candid, actionable feedback that highlights whether their execution matches reality.
   - "suggestions":
     * If suggestions_unlocked is FALSE: MUST RETURN EMPTY ARRAY []. Do NOT invent suggestions early.
     * If suggestions_unlocked is TRUE: Provide 1 to 3 HIGH-VALUE adjustments. Each suggestion must address real friction or optimization.

CRITICAL SUGGESTION TYPES & RULES:
RULE A: MODIFY EXISTING TASK ("change_type": "modify_task")
- When the user struggles with or needs to tweak an existing task from ACTIVE TASKS (e.g., duration is too long, overwhelmed, inconsistent, unclear criteria):
  * NEVER invent an administrative verb title as a task name (e.g., NEVER say "تقليص مدة الكتابة" or "Reduce writing duration"). That is an action, NOT a task!
  * You MUST target the existing task from ACTIVE TASKS:
    - "target_task_id": Exact UUID of the task from ACTIVE TASKS.
    - "target_task_title": The exact existing task description.
    - "title": The exact existing task description (e.g., "ممارسة الكتابة").
    - "action_summary": A crisp 1-sentence headline describing the change in ${isArabic ? "Arabic" : "English"} (e.g., "تقليل وقت الكتابة من 45 إلى 20 دقيقة وتعديل معيار الإنجاز لمنع التراكم").
    - "reason": Analytical 1-2 sentences referencing the user's answer and logs explaining why this modification solves their friction.
    - "changes": An object containing the new proposed values (only include what changes):
      {
        "time_required_minutes": number or null,
        "completion_criteria": string or null,
        "frequency": "daily" or "weekly" or null,
        "schedule_days": [0,1,2,3,4,5,6] or null,
        "impact_weight": number or null
      }
    - "support_type": "task_adjustment"

RULE B: ADD NEW TASK ("change_type": "add_task")
- Only propose this if there is a genuinely missing habit or supportive action that doesn't exist in ACTIVE TASKS.
- "title": A clean, concrete task name (e.g., "قراءة 5 صفحات بالإنجليزية"), NEVER "إضافة مهمة كذا".
- "action_summary": Brief summary of the new habit.
- "completion_criteria", "time_required_minutes", "frequency", "impact_weight".
- "support_type": "goal_task"

CRITICAL GUARDRAILS:
- NEVER name a task "تقليص..." or "تعديل..." or "إضافة...". A task title must be a real actionable activity.
- For modifications, always preserve the existing task and provide "changes".
- Respect user history and rejections: if the user rejected an adjustment before, do NOT suggest it again.
- Output MUST be valid JSON only.

OUTPUT JSON FORMAT:
{
  "angle_label": "${focusAngle.label}",
  "question": "string",
  "question_why": "string",
  "answer_coaching": "string",
  "suggestions": [
    {
      "id": "sug-1",
      "change_type": "modify_task" | "add_task" | "remove_task",
      "title": "string",
      "target_task_id": "UUID from ACTIVE TASKS or null",
      "target_task_title": "string or null",
      "action_summary": "string",
      "reason": "string",
      "changes": {
        "time_required_minutes": number,
        "completion_criteria": "string",
        "frequency": "daily" | "weekly",
        "schedule_days": [number],
        "impact_weight": number
      },
      "impact_weight": number,
      "time_required_minutes": number,
      "frequency": "daily" | "weekly",
      "completion_criteria": "string",
      "target_type": "main" | "sub",
      "parent_task_id": "string or null",
      "support_type": "task_adjustment" | "goal_task"
    }
  ]
}
`;

  const userPrompt = `
GOAL CONTEXT:
- ID: ${goalContext.id}
- Title: ${goalContext.title}
- Summary: ${goalContext.ai_summary || "No summary provided"}
- Current Points: ${goalContext.current_points ?? 0}
- Target Points: ${goalContext.target_points ?? 0}
- Current Date: ${currentDate}
- Goal Created Date: ${userGoalCreatedDate}
- Days Since Goal Creation: ${diffDays}
- Suggestions Unlocked Status: ${suggestionsUnlocked ? "UNLOCKED (Goal is 5+ days old)" : "LOCKED (Goal is under 5 days old - suggestions strictly forbidden)"}

ACTIVE TASKS:
${JSON.stringify(activeTasks, null, 2)}

RECENT LOGS (Last ${recentLogs.length} entries):
${JSON.stringify(recentLogs, null, 2)}

DAILY FOCUS HISTORY (Past Q&A):
${JSON.stringify(options.history || [], null, 2)}

${
  options.rejectedSuggestions && options.rejectedSuggestions.length > 0
    ? `PREVIOUSLY REJECTED SUGGESTIONS BY USER (Do NOT repeat these or similar rejected recommendations):
${JSON.stringify(options.rejectedSuggestions, null, 2)}
`
    : ""
}
MODE:
${
  options.answer && options.answer.trim()
    ? `USER ANSWERED TODAY'S QUESTION:\nExisting Question: "${options.existingQuestion || ""}"\nUser Answer: "${options.answer}"\n\nPlease deliver coaching and (if unlocked) suggestions.`
    : `NEW QUESTION GENERATION MODE:\nNo answer yet. Formulate the single sharpest question for today.`
}
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

    return {
      status: "ok",
      date: currentDate,
      angle_label: parsed.angle_label || focusAngle.label,
      question: parsed.question || options.existingQuestion || "",
      question_why: parsed.question_why || "",
      answer_coaching: parsed.answer_coaching || "",
      suggestions_unlocked: suggestionsUnlocked,
      answered_days_count: answeredDaysCount,
      required_answer_days: DAILY_FOCUS_REQUIRED_DAYS,
      suggestions: !suggestionsUnlocked
        ? []
        : (Array.isArray(parsed.suggestions) ? parsed.suggestions : [])
            .map((item: any, idx: number) => {
              const targetTaskId =
                typeof item?.target_task_id === "string" && item.target_task_id.trim()
                  ? item.target_task_id.trim()
                  : null;

              const matchedTask = targetTaskId
                ? taskRows.find((t) => t.id === targetTaskId)
                : null;

              const changeType = [
                "add_task",
                "modify_task",
                "remove_task",
                "adjust_timeline",
              ].includes(item?.change_type)
                ? item.change_type
                : (matchedTask ? "modify_task" : "add_task");

              const targetType = [
                "main",
                "sub",
                "general",
              ].includes(item?.target_type)
                ? item.target_type
                : (matchedTask?.task_type === "main" ? "main" : "sub");

              const supportType =
                changeType === "modify_task"
                  ? "task_adjustment"
                  : item?.support_type === "system_support"
                    ? "system_support"
                    : "goal_task";

              const targetTaskTitle = matchedTask
                ? matchedTask.task_description
                : typeof item?.target_task_title === "string"
                  ? item.target_task_title.trim()
                  : null;

              const title =
                changeType === "modify_task" && matchedTask
                  ? matchedTask.task_description
                  : item?.title || "";

              const actionSummary =
                typeof item?.action_summary === "string" && item.action_summary.trim()
                  ? item.action_summary.trim()
                  : undefined;

              const rawChanges = item?.changes;
              const changes =
                rawChanges && typeof rawChanges === "object"
                  ? {
                      time_required_minutes:
                        typeof rawChanges.time_required_minutes === "number"
                          ? Math.max(0, rawChanges.time_required_minutes)
                          : (typeof item?.time_required_minutes === "number"
                              ? Math.max(0, item.time_required_minutes)
                              : null),
                      completion_criteria:
                        typeof rawChanges.completion_criteria === "string"
                          ? rawChanges.completion_criteria.trim()
                          : (typeof item?.completion_criteria === "string"
                              ? item.completion_criteria.trim()
                              : null),
                      frequency:
                        rawChanges.frequency === "weekly" || rawChanges.frequency === "daily"
                          ? rawChanges.frequency
                          : (item?.frequency === "weekly" || item?.frequency === "daily"
                              ? item.frequency
                              : null),
                      schedule_days: Array.isArray(rawChanges.schedule_days)
                        ? rawChanges.schedule_days.filter((d: any): d is number => typeof d === "number")
                        : null,
                      impact_weight:
                        typeof rawChanges.impact_weight === "number"
                          ? clamp(rawChanges.impact_weight, 1, targetType === "sub" ? 5 : 10)
                          : (typeof item?.impact_weight === "number"
                              ? clamp(item.impact_weight, 1, targetType === "sub" ? 5 : 10)
                              : null),
                    }
                  : undefined;

              const finalTime =
                changes?.time_required_minutes ??
                (typeof item?.time_required_minutes === "number"
                  ? Math.max(0, item.time_required_minutes)
                  : 0);

              return {
                id: item?.id || `sug-${idx + 1}`,
                change_type: changeType,
                title,
                action_summary: actionSummary,
                reason: item?.reason || "",
                frequency:
                  changes?.frequency ?? (item?.frequency === "weekly" ? "weekly" : "daily"),
                completion_criteria:
                  changes?.completion_criteria ?? item?.completion_criteria ?? "",
                time_required_minutes: finalTime,
                impact_weight:
                  changes?.impact_weight ??
                  clamp(
                    Number(item?.impact_weight) || 1,
                    1,
                    targetType === "sub" ? 5 : 10,
                  ),
                target_type: targetType,
                parent_task_id:
                  supportType === "goal_task" &&
                  targetType === "sub" &&
                  typeof item?.parent_task_id === "string"
                    ? item.parent_task_id
                    : null,
                target_task_id: targetTaskId,
                target_task_title: targetTaskTitle,
                support_type: supportType,
                adjusted_time_required: finalTime,
                changes,
                emoji: changeType === "modify_task" ? "🛠️" : "🎯",
                status: "pending" as const,
              };
            })
            .filter((item: any) => item.title),
      safe_redirection: parsed.safe_redirection,
    };
  } catch (error) {
    console.error("Gemini generateDailyFocus Error:", error);
    throw error;
  }
}
