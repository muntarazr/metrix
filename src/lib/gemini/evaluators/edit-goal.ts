/* eslint-disable @typescript-eslint/no-explicit-any */
import { callWithRetry } from "../gemini-client.ts";
import { extractJson } from "../extract-json.ts";
import { checkContentSafety, detectLanguage } from "../safety.ts";

/**
 * Drops any task operation the model invented: unknown ids, sub tasks pointing at
 * a non-existent parent, out-of-range weights. The model is asked to behave; this
 * makes sure a bad answer cannot reach the database.
 */
export function sanitizeGoalEdit(parsed: any, tasks: any[]) {
  if (!parsed || typeof parsed !== "object") return parsed;

  const byId = new Map(tasks.map((t) => [t.id, t]));
  const mainIds = new Set(
    tasks.filter((t) => (t?.task_type ?? "main") === "main").map((t) => t.id),
  );

  const clampWeight = (value: any) => {
    const n = Math.round(Number(value));
    if (!Number.isFinite(n)) return undefined;
    return Math.max(1, Math.min(5, n));
  };
  const clampMinutes = (value: any) => {
    const n = Math.round(Number(value));
    if (!Number.isFinite(n)) return undefined;
    return Math.max(0, Math.min(1440, n));
  };
  const freq = (value: any) =>
    value === "weekly" || value === "daily" ? value : undefined;

  const raw = Array.isArray(parsed.task_changes) ? parsed.task_changes : [];
  const dropped: string[] = [];

  const changes = raw.flatMap((change: any) => {
    if (!change || typeof change !== "object") return [];
    const op = change.op;

    if (op === "update" || op === "remove") {
      if (!byId.has(change.id)) {
        dropped.push(`${op} referenced unknown task id ${String(change.id)}`);
        return [];
      }
    }

    if (op === "update") {
      const next: any = { op: "update", id: change.id };
      if (typeof change.task_description === "string" && change.task_description.trim()) {
        next.task_description = change.task_description.trim();
      }
      if (freq(change.frequency)) next.frequency = freq(change.frequency);
      if (clampWeight(change.impact_weight) !== undefined) {
        next.impact_weight = clampWeight(change.impact_weight);
      }
      if (clampMinutes(change.time_required_minutes) !== undefined) {
        next.time_required_minutes = clampMinutes(change.time_required_minutes);
      }
      if (typeof change.completion_criteria === "string") {
        next.completion_criteria = change.completion_criteria.trim();
      }
      // An update that changes nothing is noise.
      return Object.keys(next).length > 2 ? [next] : [];
    }

    if (op === "remove") {
      return [{ op: "remove", id: change.id, reason: String(change.reason ?? "") }];
    }

    if (op === "add") {
      const description = typeof change.task_description === "string"
        ? change.task_description.trim()
        : "";
      if (!description) {
        dropped.push("add without a task_description");
        return [];
      }
      const isSub = change.task_type === "sub";
      if (isSub && !mainIds.has(change.parent_task_id)) {
        dropped.push(`add "${description}" pointed at an unknown parent task`);
        return [];
      }
      return [{
        op: "add",
        task_type: isSub ? "sub" : "main",
        parent_task_id: isSub ? change.parent_task_id : null,
        task_description: description,
        frequency: freq(change.frequency) ?? "daily",
        impact_weight: clampWeight(change.impact_weight) ?? 1,
        time_required_minutes: clampMinutes(change.time_required_minutes) ?? 0,
        completion_criteria: typeof change.completion_criteria === "string"
          ? change.completion_criteria.trim()
          : "",
      }];
    }

    dropped.push(`unknown operation "${String(op)}"`);
    return [];
  });

  if (dropped.length) {
    console.warn("editGoalWithAI: dropped invalid task operations:", dropped);
  }

  return { ...parsed, task_changes: changes };
}

export async function editGoalWithAI(
  currentGoal: any,
  instruction: string,
  tasks: any[] = [],
) {
  const safetyCheck = checkContentSafety(instruction);
  if (!safetyCheck.isSafe) {
    return {
      status: "refused",
      explanation: safetyCheck.reason,
    };
  }

  const userLanguage = detectLanguage(instruction);
  const currentDate = new Date().toISOString().split("T")[0];

  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const mainTasks = safeTasks.filter((t) => (t?.task_type ?? "main") === "main");
  const subTasks = safeTasks.filter((t) => t?.task_type === "sub");

  const effectiveMains = mainTasks.length > 0 ? mainTasks : safeTasks;
  const taskContext = effectiveMains.map((main) => ({
    id: main.id,
    task_type: "main",
    task_description: main.task_description || main.task || "",
    frequency: main.frequency ?? "daily",
    impact_weight: main.impact_weight ?? 1,
    time_required_minutes: main.time_required_minutes ?? 0,
    completion_criteria: main.completion_criteria ?? "",
    subtasks: subTasks
      .filter((sub) => sub.parent_task_id === main.id)
      .map((sub) => ({
        id: sub.id,
        task_type: "sub",
        task_description: sub.task_description || sub.task || "",
        frequency: sub.frequency ?? "daily",
        impact_weight: sub.impact_weight ?? 1,
        time_required_minutes: sub.time_required_minutes ?? 0,
        completion_criteria: sub.completion_criteria ?? "",
      })),
  }));

  const systemPrompt = `
SYSTEM ROLE:
You are an expert "Goal Adjustment AI" for a habit-continuity app. You take an existing goal AND its task list, read the user's natural language instructions (Arabic or English), and adjust both so the user can keep going.

THE PRODUCT PRINCIPLE THAT OVERRIDES EVERYTHING ELSE:
The whole point of this app is CONTINUITY. A user who finds the plan too hard will abandon it. When the user signals the plan is too heavy ("صعبة", "ما أكدر ألتزم", "too hard", "too much", "I keep failing"), your job is to LOWER THE LOAD so they can stay consistent - never to tell them to try harder, and never to quietly delete their work.

PART A - GOAL PROPERTIES YOU MAY MODIFY:
1. "title"
2. "ai_summary" (the goal description)
3. "created_at" (YYYY-MM-DD)
4. "estimated_completion_date" (YYYY-MM-DD)
5. "current_points" (integer >= 0)
6. "target_points" (positive integer > 0)
7. "icon" (one of: "Target","Brain","Award","Flame","BookOpen","Laptop","Sparkles","Heart","Briefcase","DollarSign","Code","Calendar","Clock")

PART B - TASKS:
You are given CURRENT TASKS as a two-level tree. "main" tasks are top level; each may have "sub" tasks.
Return your task edits in "task_changes" as a list of operations:

  { "op": "update", "id": "<existing task id>", "task_description"?: string, "frequency"?: "daily"|"weekly", "impact_weight"?: 1-5, "time_required_minutes"?: number >= 0, "completion_criteria"?: string }
  { "op": "add", "task_type": "main"|"sub", "parent_task_id": "<existing main id>" | null, "task_description": string, "frequency": "daily"|"weekly", "impact_weight": 1-5, "time_required_minutes": number >= 0, "completion_criteria": string }
  { "op": "remove", "id": "<existing task id>", "reason": string }

TASK RULES - FOLLOW EXACTLY:
- HOW TO MAKE THINGS EASIER (in this order of preference):
  1. lower "time_required_minutes"
  2. change "frequency" from "daily" to "weekly"
  3. rewrite "task_description" into a smaller, concrete, obviously-doable action
  4. lower "impact_weight"
  Deleting a task is the LAST resort, never the first.
- PREFER "update" OVER "remove". Only use "remove" when the user EXPLICITLY names a task to delete or remove.
- NEVER drop or replace a task the user did not ask you to remove.
- Use ONLY ids that appear in CURRENT TASKS. Never invent, guess, or reuse an id.
- For "add" with task_type "sub", "parent_task_id" MUST be an existing main task id. For task_type "main", "parent_task_id" MUST be null.
- EVERY task must still serve the goal in "title". Never add a task unrelated to the goal.
- Only return tasks you are ACTUALLY CHANGING. Omit tasks you leave untouched.

CALENDAR / DEADLINE RULES:
- Today is ${currentDate}.
- An "estimated_completion_date" before today is invalid. If the user asks for a deadline in the past, or an impossibly short one (like today), set it to a realistic future date.
- "created_at" cannot be in the future.
- If duration increases or difficulty decreases, extend "estimated_completion_date" proportionally.

RESPONSE RULES:
- Output MUST be valid JSON only. No markdown fences, no preamble, no commentary.
- "explanation": one sentence in ${userLanguage === "ar" ? "Arabic" : "English"} explaining what changed and why, reassuring the user.
- If the instruction is completely irrelevant, harmful, or impossible, set "status": "refused", explain why in "explanation", and omit other fields.

OUTPUT JSON SCHEMA:
{
  "status": "ok" | "refused",
  "explanation": "string",
  "updated_goal": {
    "title"?: "string",
    "ai_summary"?: "string",
    "created_at"?: "YYYY-MM-DD",
    "estimated_completion_date"?: "YYYY-MM-DD",
    "current_points"?: number,
    "target_points"?: number,
    "icon"?: "string"
  },
  "task_changes"?: [
    {
      "op": "update" | "add" | "remove",
      "id"?: "string (for update/remove)",
      "task_type"?: "main" | "sub (for add)",
      "parent_task_id"?: "string | null (for add sub)",
      "task_description"?: "string",
      "frequency"?: "daily" | "weekly",
      "impact_weight"?: number (1-5),
      "time_required_minutes"?: number,
      "completion_criteria"?: "string",
      "reason"?: "string (for remove)"
    }
  ]
}
`;

  const userPrompt = `
CURRENT GOAL:
${JSON.stringify({
  title: currentGoal.title,
  ai_summary: currentGoal.ai_summary,
  created_at: currentGoal.created_at,
  estimated_completion_date: currentGoal.estimated_completion_date,
  current_points: currentGoal.current_points,
  target_points: currentGoal.target_points,
  icon: currentGoal.icon,
}, null, 2)}

CURRENT TASKS:
${JSON.stringify(taskContext, null, 2)}

USER INSTRUCTION:
<<<BEGIN_USER_INSTRUCTION>>>
${instruction}
<<<END_USER_INSTRUCTION>>>
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
    return sanitizeGoalEdit(parsed, safeTasks);
  } catch (error) {
    console.error("Gemini editGoalWithAI Error:", error);
    throw error;
  }
}
