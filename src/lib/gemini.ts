/* eslint-disable @typescript-eslint/no-explicit-any */
import { GoogleGenAI } from "@google/genai";
import {
  buildTaskHierarchy,
  calculateDailyCap,
  deriveMainBreakdown,
  getScorableTasks,
  type TaskRow,
  type MainTask,
} from "@/lib/task-hierarchy";
import { analyzeDailyPerformance } from "@/lib/daily-log-feedback";
import type {
  DailyFocusGoalContext,
  DailyFocusHistoryItem,
  DailyFocusLogContext,
  DailyFocusResult,
} from "@/lib/daily-focus";
import { DAILY_FOCUS_REQUIRED_DAYS } from "@/lib/daily-focus";
let _ai: GoogleGenAI | null = null;
function getAi(): GoogleGenAI {
  if (!_ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }
    _ai = new GoogleGenAI({ apiKey });
  }
  return _ai;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class GeminiQuotaError extends Error {
  isQuotaExceeded = true;
  retryAfterSeconds: number;
  constructor(retryAfter: number) {
    super("Gemini API quota exceeded");
    this.name = "GeminiQuotaError";
    this.retryAfterSeconds = retryAfter;
  }
}

export class GeminiImageUnavailableError extends Error {
  constructor(message = "Image generation is not available for this API plan") {
    super(message);
    this.name = "GeminiImageUnavailableError";
  }
}

export interface MultiGoalItemContext {
  id: string;
  title: string;
  description?: string;
  current_points?: number;
  target_points?: number;
  tasks?: Array<{
    id: string;
    title: string;
    impact_weight?: number;
  }>;
}

export interface MultiGoalEvaluatedItem {
  goal_id: string;
  goal_title: string;
  mentioned: boolean;
  extracted_activity: string;
  points_to_award: number;
  feedback: string;
  completed_task_ids: string[];
}

export interface MultiGoalEvaluationResult {
  overall_summary: string;
  goals: MultiGoalEvaluatedItem[];
  status?: "ok" | "refused";
  safe_redirection?: { message: string; alternatives?: string[] };
}


function getApiErrorText(error: any) {
  if (typeof error?.message === "string") return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function parseApiErrorPayload(error: any) {
  const text = getApiErrorText(error);
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function getRetryDelaySeconds(error: any) {
  const payload = parseApiErrorPayload(error);
  const details = payload?.error?.details;
  if (Array.isArray(details)) {
    const retryInfo = details.find(
      (item: any) =>
        item?.["@type"] === "type.googleapis.com/google.rpc.RetryInfo",
    );
    const retryDelay = retryInfo?.retryDelay;
    if (typeof retryDelay === "string") {
      const seconds = Number(retryDelay.replace("s", ""));
      if (Number.isFinite(seconds) && seconds > 0) return Math.ceil(seconds);
    }
  }

  const match = getApiErrorText(error).match(/retry in\s+([\d.]+)s/i);
  if (match?.[1]) {
    const seconds = Number(match[1]);
    if (Number.isFinite(seconds) && seconds > 0) return Math.ceil(seconds);
  }

  return 60;
}

function isQuotaError(error: any) {
  const text = getApiErrorText(error).toLowerCase();
  return (
    error?.status === 429 ||
    text.includes("resource_exhausted") ||
    text.includes("quota exceeded") ||
    text.includes("rate-limits")
  );
}

function isImagePlanError(error: any) {
  const text = getApiErrorText(error).toLowerCase();
  return (
    text.includes("only available on paid plans") ||
    text.includes("upgrade your account")
  );
}

/**
 * Robustly extracts, repairs, and parses JSON from LLM output that might contain
 * extra text, markdown fences, single/multi-line comments, single quotes, unquoted keys,
 * trailing commas, unescaped control characters, or truncated structures.
 */
export function extractJson(text: string): any {
  if (typeof text !== "string") return text;

  // 1. Direct parse attempt
  try {
    return JSON.parse(text);
  } catch {}

  // 2. Strip markdown fences if present
  let str = text.trim();
  const fenceMatch = str.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch {}
    str = fenceMatch[1].trim();
  } else {
    str = str.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
  }

  // 3. Find opening `{` or `[`
  const firstBrace = str.indexOf("{");
  const firstBracket = str.indexOf("[");
  let startIdx = -1;
  if (firstBrace !== -1 && firstBracket !== -1) {
    startIdx = Math.min(firstBrace, firstBracket);
  } else {
    startIdx = firstBrace !== -1 ? firstBrace : firstBracket;
  }

  if (startIdx === -1) {
    throw new Error("No JSON object or array found in response");
  }

  str = str.substring(startIdx);

  // Try parsing from startIdx
  try {
    return JSON.parse(str);
  } catch {}

  // 4. Try from startIdx to last matching closing brace
  const lastBrace = str.lastIndexOf("}");
  const lastBracket = str.lastIndexOf("]");
  const endIdx = Math.max(lastBrace, lastBracket);
  if (endIdx > 0) {
    const sub = str.substring(0, endIdx + 1);
    try {
      return JSON.parse(sub);
    } catch {}
  }

  // 5. Strip single-line and multi-line comments outside of string literals
  let cleaned = "";
  let inStr = false;
  let quoteChar = "";
  let esc = false;
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    const next = str[i + 1];

    if (inStr) {
      if (esc) {
        cleaned += c;
        esc = false;
      } else if (c === "\\") {
        cleaned += c;
        esc = true;
      } else if (c === quoteChar) {
        cleaned += c;
        inStr = false;
        quoteChar = "";
      } else {
        cleaned += c;
      }
      continue;
    }

    if (c === '"' || c === "'") {
      inStr = true;
      quoteChar = c;
      cleaned += c;
      continue;
    }

    if (c === "/" && next === "/") {
      while (i < str.length && str[i] !== "\n") i++;
      cleaned += "\n";
      continue;
    }

    if (c === "/" && next === "*") {
      i += 2;
      while (i < str.length && !(str[i] === "*" && str[i + 1] === "/")) i++;
      i++;
      continue;
    }

    cleaned += c;
  }

  try {
    return JSON.parse(cleaned);
  } catch {}

  // 6. State-machine pass: normalize quotes, escape unescaped controls, remove trailing commas
  let normalized = "";
  inStr = false;
  quoteChar = "";
  esc = false;
  const stack: string[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const c = cleaned[i];

    if (inStr) {
      if (esc) {
        normalized += c;
        esc = false;
      } else if (c === "\\") {
        normalized += c;
        esc = true;
      } else if (c === quoteChar) {
        normalized += '"';
        inStr = false;
        quoteChar = "";
      } else if (c === '"') {
        normalized += '\\"';
      } else if (c === "\n") {
        normalized += "\\n";
      } else if (c === "\r") {
        // ignore
      } else if (c === "\t") {
        normalized += "\\t";
      } else {
        normalized += c;
      }
      continue;
    }

    if (c === '"' || c === "'") {
      inStr = true;
      quoteChar = c;
      normalized += '"';
      continue;
    }

    if (c === "{" || c === "[") {
      stack.push(c);
      normalized += c;
      continue;
    }

    if (c === "}" || c === "]") {
      let j = normalized.length - 1;
      while (j >= 0 && /\s/.test(normalized[j])) j--;
      if (j >= 0 && normalized[j] === ",") {
        normalized = normalized.substring(0, j) + normalized.substring(j + 1);
      }

      if (stack.length > 0) {
        const expected = stack[stack.length - 1] === "{" ? "}" : "]";
        if (c === expected) {
          stack.pop();
        }
      }
      normalized += c;
      continue;
    }

    if (c === ",") {
      let j = normalized.length - 1;
      while (j >= 0 && /\s/.test(normalized[j])) j--;
      if (j >= 0 && (normalized[j] === "{" || normalized[j] === "[" || normalized[j] === "," || normalized[j] === ":")) {
        continue;
      }
      normalized += c;
      continue;
    }

    normalized += c;
  }

  // Handle truncation
  if (inStr) normalized += '"';

  let k = normalized.length - 1;
  while (k >= 0 && /\s/.test(normalized[k])) k--;
  if (k >= 0 && normalized[k] === ":") normalized += "null";

  k = normalized.length - 1;
  while (k >= 0 && /\s/.test(normalized[k])) k--;
  if (k >= 0 && normalized[k] === ",") normalized = normalized.substring(0, k);

  // If in an object and ends with key without colon/value (e.g. `{"a": 1, "b"`), append `: null`
  if (stack.length > 0 && stack[stack.length - 1] === "{") {
    let p = normalized.length - 1;
    while (p >= 0 && /\s/.test(normalized[p])) p--;
    if (p >= 0 && normalized[p] === '"') {
      let q = p - 1;
      while (q >= 0 && normalized[q] !== '"') q--;
      if (q >= 0) {
        let beforeString = q - 1;
        while (beforeString >= 0 && /\s/.test(normalized[beforeString])) beforeString--;
        if (beforeString >= 0 && (normalized[beforeString] === "{" || normalized[beforeString] === ",")) {
          normalized += ": null";
        }
      }
    }
  }

  // Close remaining open brackets
  while (stack.length > 0) {
    const open = stack.pop();
    normalized += open === "{" ? "\n}" : "\n]";
  }

  // Final cleanup: remove trailing commas before closing braces/brackets
  normalized = normalized.replace(/,(\s*[}\]])/g, "$1");

  // Fix unquoted property names: e.g. { domain: "health" } -> { "domain": "health" }
  normalized = normalized.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_-]*)(\s*:)/g, '$1"$2"$3');

  try {
    return JSON.parse(normalized);
  } catch (e: any) {
    throw new Error(`Failed to parse extracted JSON: ${e.message || e}`);
  }
}

const DANGEROUS_KEYWORDS = [
  "suicide",
  "kill myself",
  "harm myself",
  "end my life",
  "bomb",
  "explosive",
  "detonate",
  "shrapnel",
  "murder",
  "assassinate",
  "kill people",
  "terrorist",
  "terrorism",
  "steal credit card",
  "carding",
  "fraud",
  "manufacture weapon",
  "build gun",
  "child porn",
  "abuse children",
  // Arabic safety keywords
  "انتحار",
  "قتل نفسي",
  "إيذاء نفسي",
  "إنهاء حياتي",
  "قنبلة",
  "متفجرات",
  "تفجير",
  "شظايا",
  "قتل",
  "اغتيال",
  "إرهاب",
  "سرقة بطاقة",
  "صنع سلاح",
  "سلاح",
  "أسلحة",
];

type SafetyCheck = { isSafe: boolean; reason?: string };

export interface WeeklyReviewPattern {
  label: string;
  detail: string;
}

export interface WeeklyReviewResult {
  summary: string;
  patterns: WeeklyReviewPattern[];
  suggestion: string;
}

// Verified against the project's own API key on 2026-08-22. The previous chain
// was all 2.x models, which Google now refuses for newer keys with
// 404 "no longer available to new users" — every entry failed, and because
// callWithRetry treats an exhausted chain as a quota problem, the app reported
// "daily limit exceeded" for what was really a retired model list.
// Re-check with: GET https://generativelanguage.googleapis.com/v1beta/models
const MODEL_FALLBACK_CHAIN = [
  "gemini-flash-lite-latest",
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-flash-latest",
];

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const DAILY_FOCUS_ANGLES = [
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

function normalizeFrequency(value: any): "daily" | "weekly" {
  return value === "weekly" ? "weekly" : "daily";
}

/**
 * Normalize an AI-provided weekday list into sorted unique ints in 0..6
 * (0 = Sunday … 6 = Saturday). Returns null when the task runs on every day
 * its frequency implies (no explicit schedule), or when the value is invalid.
 */
function normalizeScheduleDays(value: any): number[] | null {
  if (!Array.isArray(value)) return null;
  const days = Array.from(
    new Set(
      value
        .map((d: any) => Math.round(Number(d)))
        .filter((d: number) => Number.isFinite(d) && d >= 0 && d <= 6),
    ),
  ).sort((a: number, b: number) => a - b);
  if (days.length === 0 || days.length === 7) return null;
  return days;
}

function hashSeed(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function pickDailyFocusAngle(seed: string, language: "ar" | "en") {
  const angle = DAILY_FOCUS_ANGLES[hashSeed(seed) % DAILY_FOCUS_ANGLES.length];
  return {
    label: language === "ar" ? angle.arLabel : angle.enLabel,
    prompt: angle.prompt,
  };
}

function normalizePlanHierarchy(rawPlan: any) {
  const result = { ...rawPlan };
  if (!result.plan || typeof result.plan !== "object") {
    result.plan = {
      goal_summary: result.ai_summary || "خطة الهدف",
      estimated_total_days: 90,
      confidence: "medium",
    };
  }

  // Collect flat tasks from tasks[] or extract from main_tasks[]
  let flatTasks: any[] = [];
  if (Array.isArray(result.tasks) && result.tasks.length > 0) {
    flatTasks = result.tasks;
  } else if (Array.isArray(result.main_tasks) && result.main_tasks.length > 0) {
    for (const main of result.main_tasks) {
      const subs = Array.isArray(main.subtasks) ? main.subtasks : [];
      if (subs.length > 0) {
        flatTasks.push(...subs);
      } else {
        flatTasks.push(main);
      }
    }
  }

  if (flatTasks.length === 0) {
    flatTasks = [
      {
        id: "t1",
        task: result.plan?.goal_summary || "المسار التنفيذي للهدف",
        impact_weight: 4,
        frequency: "daily",
        completion_criteria: "إنجاز العمل المحدد لليوم وتأكيد النتيجة بموضوعية.",
        time_required_minutes: 30,
      },
    ];
  }

  const normalizedTasks = flatTasks.map((t: any, idx: number) => {
    const desc = t.task || t.task_description || `Task ${idx + 1}`;
    const criteria =
      typeof t.completion_criteria === "string" && t.completion_criteria.trim()
        ? t.completion_criteria.trim()
        : `إتمام "${desc}" بالكامل وتأكيد النتيجة بوضوح.`;

    return {
      id: t.id || `t${idx + 1}`,
      task: desc,
      frequency: normalizeFrequency(t.frequency),
      schedule_days: normalizeScheduleDays(t.schedule_days),
      impact_weight: clamp(Number(t.impact_weight) || 3, 1, 5),
      time_required_minutes: Math.max(0, Number(t.time_required_minutes) || 0),
      completion_criteria: criteria,
      notes: t.notes || "",
    };
  });

  result.tasks = normalizedTasks;
  // Also provide main_tasks where each item is a flat task for backwards-compatibility
  result.main_tasks = normalizedTasks.map((t: any) => ({
    id: t.id,
    task: t.task,
    frequency: t.frequency,
    schedule_days: t.schedule_days,
    impact_weight: t.impact_weight,
    time_required_minutes: t.time_required_minutes,
    completion_criteria: t.completion_criteria,
    notes: t.notes,
    subtasks: [],
  }));

  return result;
}

function convertMainTasksToRows(mainTasksInput: any[]): TaskRow[] {
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

export class GeminiService {
  static async callWithRetry(
    config: any,
    content: any,
    validateResponse?: (text: string) => any,
  ): Promise<any> {
    let lastError: any = null;

    const contents = Array.isArray(content) ? content : [content];

    for (const model of MODEL_FALLBACK_CHAIN) {
      try {
        const response = await getAi().models.generateContent({
          model,
          config,
          contents,
        });

        if (validateResponse) {
          const text = response.text || "";
          if (!text) {
            throw new Error("Empty response text from Gemini API");
          }
          validateResponse(text);
        }

        console.log(`Gemini call succeeded with model: ${model}`);
        return response;
      } catch (error: any) {
        lastError = error;
        const status = error?.status || error?.code;

        if (status === 429) {
          console.warn(
            `Model ${model} quota exhausted (429), trying next fallback...`,
          );
          continue;
        }

        if (status === 503) {
          console.warn(`Model ${model} returned 503, retrying once in 3s...`);
          await delay(3000);
          try {
            const retryResponse = await getAi().models.generateContent({
              model,
              config,
              contents,
            });

            if (validateResponse) {
              const text = retryResponse.text || "";
              if (!text) {
                throw new Error("Empty response text from Gemini API on 503 retry");
              }
              validateResponse(text);
            }

            console.log(`Gemini 503 retry succeeded with model: ${model}`);
            return retryResponse;
          } catch (retryError: any) {
            lastError = retryError;
            const retryStatus = retryError?.status || retryError?.code;
            if (retryStatus === 429) {
              console.warn(
                `Model ${model} hit 429 on 503 retry, trying next fallback...`,
              );
              continue;
            }
            console.warn(
              `Model ${model} failed on 503 retry, trying next fallback...`,
            );
            continue;
          }
        }

        if (status === 404) {
          console.warn(
            `Model ${model} not found (404), trying next fallback...`,
          );
          continue;
        }

        if (validateResponse) {
          console.warn(
            `Model ${model} output failed validation (${error?.message}), trying next fallback...`,
          );
          continue;
        }

        throw error;
      }
    }

    const errorMsg = lastError?.message || "";
    const lastStatus = lastError?.status || lastError?.code;

    // Only a real 429 is a quota problem. A chain that 404s is a stale model
    // list, and saying "quota exceeded" there sends everyone hunting the wrong
    // bug — surface the model error instead.
    if (lastStatus !== 429) {
      console.error(
        `Gemini fallback chain exhausted without a quota error (last status ${lastStatus}). ` +
          `The model list is probably stale: ${errorMsg}`,
      );
      throw lastError instanceof Error
        ? lastError
        : new Error(`Gemini call failed: ${errorMsg || "unknown error"}`);
    }

    console.error("All Gemini models exhausted their quotas.");
    const retryMatch = errorMsg.match(/retryDelay[":]\s*["']?(\d+)/i);
    const apiRetrySeconds = retryMatch ? parseInt(retryMatch[1]) : 60;
    throw new GeminiQuotaError(apiRetrySeconds);
  }

  static detectLanguage(text: string): "ar" | "en" {
    const arabicPattern = /[\u0600-\u06FF]/;
    return arabicPattern.test(text) ? "ar" : "en";
  }

  static checkContentSafety(text: string): SafetyCheck {
    const lower = text.toLowerCase();
    for (const kw of DANGEROUS_KEYWORDS) {
      if (lower.includes(kw)) {
        return {
          isSafe: false,
          reason:
            "Safety Policy Violation: Request contains prohibited content.",
        };
      }
    }
    return { isSafe: true };
  }

  // Phase 1: Investigate & Questioning
  static async investigateGoal(
    goalText: string,
    previousContext: any = {},
    structuredInput: any = null,
  ) {
    const safetyCheck = GeminiService.checkContentSafety(goalText);
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

    const userLanguage = GeminiService.detectLanguage(goalText);
    const contextEntries = Object.entries(previousContext || {});
    const formattedContext =
      contextEntries.length > 0
        ? contextEntries
            .map(
              ([question, answer], i) =>
                `${i + 1}. Question: "${question}"\n   Answer: "${answer}"`,
            )
            .join("\n")
        : "No previous answers yet.";

    const systemPrompt = `
SYSTEM ROLE:
You are an elite, world-class "Universal Goal Investigator & Execution Architect".
Your purpose is to deeply understand ANY goal in the world—from software development, artificial intelligence, and coding projects, to business startups, ecommerce, and freelancing, to fitness, calisthenics, weight loss, and athletics, to academic studies, languages, artistic crafts, and life transformations.

TOP PRIORITY: SAFETY
- If the goal involves violence, self-harm, illegal activities, weapons, fraud, or hacking:
  - REFUSE to help.
  - Output JSON with status="refused" and safe_redirection.

SECOND PRIORITY: MANDATORY MULTI-DIMENSIONAL INVESTIGATION (2 TO 4 SMART QUESTIONS IN ROUND 1)
- In the initial round (when no previous answers have been recorded yet):
  - You MUST ALWAYS generate 2 to 4 (up to 5 maximum) highly intelligent, domain-specific questions to calibrate the plan.
  - NEVER return an empty questions array and NEVER set readiness="ready_for_plan" in the first round!
  - Real execution always depends on deeper tactical dimensions that cannot be inferred from a single paragraph.
  - GOLDEN RULE: Do NOT re-ask details the user explicitly provided in their goal text (for example, if they already stated their weight, height, that they have 1 hour daily, and no equipment, DO NOT ask what equipment they have or how many minutes). Instead, identify the NEXT tactical layer of depth:
    * For Fitness & Health Goals:
      1) Target Timeline/Deadline: e.g. "كم شهراً تمنح نفسك للوصول إلى وزن 90-95 كغ بصورة صحية ومستدامة؟" (type: "number" with unit: "months" or "weeks", or "single_choice").
      2) Current physical baseline/capacity: e.g. "ما هو مستواك الحالي في تمارين وزن الجسم الأساسية (مثل تمرين الضغط Push-ups والسكوات)؟" (type: "single_choice": ["مبتدئ تماماً (أقل من 5 عدات)", "متوسط (بين 10 إلى 20 عدة)", "متقدم وعائد بعد انقطاع"]).
      3) Joint health & physical restrictions: e.g. "هل تعاني من أية آلام أو إصابات سابقة في الركبتين أو أسفل الظهر؟" (type: "boolean" with options: ["نعم", "لا"]).
      4) Weekly training frequency / rest days: e.g. "كم يوماً في الأسبوع تفضل تخصيصها للتمارين مع فترات راحة واستشفاء؟" (type: "single_choice": ["4 أيام أسبوعياً (مثالي ومستدام)", "5 أيام أسبوعياً", "6 أيام أسبوعياً"]).
      5) Meal portioning strategy: e.g. "كيف تفضل ضبط وجبات المنزل اليومية (الرز والخبز)؟" (type: "single_choice": ["تقليل حصة النشويات للنصف مع زيادة البيض المسلوق", "نظام الصيام المتقطع (16 ساعة صيام و8 أكل)", "تخفيف تدريجي دون حرمان"]).
    * For Programming, AI & Tech Goals:
      1) Tools & tech stack: (type: "multi_choice": e.g. ["Next.js / React", "Python / FastAPI", "Supabase / PostgreSQL", "أدوات ذكاء اصطناعي ونماذج Gemini/OpenAI", "Git / GitHub"]).
      2) Baseline programming level: (type: "single_choice": ["مبتدئ من الصفر", "أعرف الأساسيات فقط", "متوسط ولدي مشاريع سابقة", "مطور محترف"]).
      3) Target launch or completion timeframe: (type: "number" with unit: "weeks" or "months").
      4) Learning/building preference: (type: "single_choice": ["بناء مشروع عملي فوري والتعلم أثناء العمل", "دراسة منهجية ومسار تعليمي مكثف"]).
    * For Business, Startups & Ecommerce Goals:
      1) Business model/niche: (type: "single_choice" or "multi_choice").
      2) Target revenue or customer milestone: (type: "number" with unit: "usd" or "iqd").
      3) Marketing and acquisition channels: (type: "multi_choice": ["صناعة محتوى عضوي (تيك توك/إنستغرام)", "إعلانات ممولة", "شبكة علاقات وتواصل مباشر"]).
      4) Financial investment capability: (type: "single_choice": ["بدون ميزانية إضافية (اعتماد على الجهد الشخصي)", "ميزانية محدودة", "ميزانية مفتوحة"]).
    * For Languages, Skills & Academics:
      1) Current level: (type: "single_choice").
      2) Target milestone deadline: (type: "date" or "number" with unit: "months").
      3) Focus area: (type: "multi_choice": ["المحادثة والطلاقة", "القواعد والمفردات", "اجتياز اختبار معتمد"]).
    * For ANY other novel/specialized domain in the world:
      Identify the missing tactical pillars: Timeline, Baseline/Experience, Equipment/Tools, Constraints/Risks, and Strategy Preference.

THIRD PRIORITY: QUESTION TYPES & UI MATCHING
- "multi_choice": Multiple selections supported (chips) + custom text input. Perfect for tools, stacks, and resources.
- "single_choice": One option selected (chips) + custom note field underneath.
- "boolean": Exactly options: ["نعم", "لا"] (Arabic) or ["Yes", "No"] (English). The UI provides an automatic text explanation input.
- "number": With explicit "unit" ("minutes", "hours", "days", "weeks", "months", "times_per_week", "kg", "km", "usd", "iqd").
- "date": Calendar picker for specific target dates.
- All questions MUST be polite, intelligent, and written in natural, fluent ${userLanguage === "ar" ? "Arabic" : "English"}.

FOURTH PRIORITY: EXIT CONDITION — READINESS
- Initial Round (${contextEntries.length === 0} previous answers):
  - Set readiness="not_ready".
  - Always return between 2 to 4 (max 5) smart questions.
- Subsequent Rounds (${contextEntries.length > 0} previous answers):
  - If the previous answers provide sufficient clarity on baseline, timeline, tools, and constraints: set readiness="ready_for_plan" and return questions: [].
  - Only ask 1-2 follow-up questions if a critical blocker or ambiguity emerged from the previous answers.

OUTPUT JSON FORMAT ONLY:
{
  "status": "ok" | "needs_info" | "unrealistic" | "refused",
  "goal_understanding": {
    "goal_summary": "string",
    "domain": "health|money|skills|career|study|home|other",
    "goal_nature": "routine_habit|progressive_milestone",
    "risk_flags": ["none|self_harm_risk|violence|illegal|other"],
    "missing_info": ["list of what is missing from the pillars"],
    "readiness": "not_ready|ready_for_plan"
  },
  "questions": [
    {
      "id": "q1",
      "question": "string",
      "type": "single_choice|multi_choice|number|boolean|date|text",
      "options": ["relevant options for choice types; for boolean use ['نعم','لا'] (Arabic) or ['Yes','No'] (English)"],
      "unit": "minutes|hours|days|weeks|months|times|times_per_week|times_per_day|usd|iqd|kg|lbs|km|m2|other",
      "required": true
    }
  ],
  "realism_check": {
    "assessment": "plausible|uncertain|unrealistic",
    "reasons": ["string"],
    "suggested_adjustments": ["string"]
  },
  "safe_redirection": {
    "message": "string",
    "alternatives": ["string"]
  }
}`;

    const userPrompt = `
USER GOAL:
<<<BEGIN_USER_INPUT>>>
${goalText}
<<<END_USER_INPUT>>>

STRUCTURED_INPUT (optional):
${JSON.stringify(structuredInput || {}, null, 2)}

PREVIOUS_ANSWERS (${contextEntries.length} answers already collected):
${formattedContext}

ROUND STATUS: ${contextEntries.length === 0 ? "INITIAL ROUND (No previous answers yet)" : `FOLLOW-UP ROUND (${contextEntries.length} answers provided)`}

INSTRUCTION:
${
  contextEntries.length === 0
    ? `- This is the INITIAL ROUND. You MUST ask between 2 to 4 (up to 5) domain-specific questions to calibrate the plan.
- NEVER return empty questions or set readiness="ready_for_plan" in this round.
- Do NOT re-ask details already given in the goal text. Ask the next tactical layer (e.g. target timeline in months/weeks, baseline experience, constraints/injuries, weekly frequency, or specific strategy preferences).
- Set readiness="not_ready".`
    : `- The user has already provided answers to previous questions.
- If the answers give enough clarity to build a tailored plan, set readiness="ready_for_plan" and return questions: [].
- If a critical detail is still missing or contradictory, ask at most 1-2 focused questions.`
}
`;

    try {
      const response = await GeminiService.callWithRetry(
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
      return extractJson(responseText);
    } catch (error) {
      console.error("Gemini investigateGoal Error:", error);
      throw error;
    }
  }

  // Phase 2: Architect & Simulator
  static async createPlan(
    goal: string,
    answers: any,
    targetDeadline?: string,
    structuredInput: any = null,
  ) {
    const safetyCheck = GeminiService.checkContentSafety(goal);
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

    const userLanguage = GeminiService.detectLanguage(goal);
    const currentDate = new Date().toISOString().split("T")[0];

    let targetDeadlineInstruction = "";
    if (targetDeadline) {
      const diffMs = new Date(targetDeadline).getTime() - new Date(currentDate).getTime();
      const diffDays = Math.max(3, Math.round(diffMs / (1000 * 60 * 60 * 24)));
      targetDeadlineInstruction = `
- CRITICAL TIMELINE ADAPTATION & INTENSIFICATION:
  * The user explicitly configured the target deadline to: "${targetDeadline}" (exactly ${diffDays} days from today).
  * You MUST set "plan.estimated_total_days": ${diffDays} and "plan.estimated_completion_date": "${targetDeadline}".
  * If this deadline represents a shortened timeframe compared to standard (e.g. 60 days instead of 90/120 days):
    - Achieving the same goal in fewer days REQUIRES intensifying the plan!
    - Scale up the daily minutes/volume, AND ADD an explicit high-leverage acceleration sprint task (مهمة تحدٍّ مسرّعة) to make up for the shorter window (e.g. extra daily walking/steps target, extra sprint practice block, or weekly progress milestone challenge).
    - In "ai_summary", explain clearly how the plan and tasks were intensified to match this ${diffDays}-day accelerated timeframe.
`;
    }

    const systemPrompt = `
SYSTEM ROLE:
You are an elite "Universal Plan Architect & Execution Engine".
Your mission is to construct realistic, high-impact, directly actionable daily execution plans for ANY goal in the world—tech, programming, AI, business, ecommerce, bodybuilding, weight loss, athletics, languages, academic exams, or creative mastery.

HARD CONSTRAINTS:
- Output STRICTLY VALID JSON. Never include trailing commas, unescaped quotes inside strings, or comments.
- Never provide instructions for harm/illegal activity.
- Plan must be measurable, realistic, and executable.
- DIRECT FLAT ACTIONABLE TASKS:
  - Output a direct flat array "tasks": [ { id, task, frequency, schedule_days, impact_weight, time_required_minutes, completion_criteria, notes } ]
  - Do NOT output hierarchical subtasks or nested layers. All tasks must be directly actionable.
  - STRICT TASK COUNT: Provide 2 TO 3 actionable tasks daily (or up to 4 only if an acceleration sprint task is added for shortened deadlines). Never overload the user with busywork.
  - Task frequency must be strictly "daily" or "weekly". Do NOT use monthly or x_times_per_week.
  - "schedule_days": array of weekday numbers the user performs this task (0=Sunday, 1=Monday, ... 6=Saturday). Set it ONLY when appropriate (e.g., gym on Sunday/Tuesday/Thursday → [0,2,4], or 5 workout days [0,1,2,4,5] with 2 rest days). If every day, set to null.
  - impact_weight must be between 1 and 5.
  - Estimated time must be in minutes only ("time_required_minutes", e.g. 20, 30, 45). DO NOT assign rigid times-of-day (no morning/afternoon/evening slots), because the user executes whenever it fits their day.

DOMAINS REALISM & PRACTICAL ACCURACY (CRITICAL):
1) HEALTH, FITNESS & WEIGHT LOSS:
   - Respect human physiology! NEVER prescribe an arbitrary severe calorie deficit (e.g. 1500 kcal for a tall 105kg adult whose Basal Metabolic Rate BMR is >2100 kcal is dangerous and ruins muscle mass). Aim for a safe, sustainable deficit (300-500 kcal).
   - If the user relies on home cooking without a food scale or extra budget, NEVER prescribe counting grams/calories. Instead, prescribe tangible portion control rules (e.g., half-plate protein/eggs, one portion rice/bread, plentiful water).
   - NEVER prescribe 7 days/week of heavy joint-loading workouts for beginners or heavy individuals without rest. Prescribe 4 to 5 workout days with 2 active recovery days, and populate schedule_days accordingly.
2) PROGRAMMING, AI & TECH:
   - Focus on writing real code, building tangible features, committing to git, and shipping projects—NOT passive video tutorial consumption.
3) BUSINESS, COMMERCE & FREELANCING:
   - Focus on direct customer contact, outreach, offer validation, and sales actions over endless theoretical desk research.
4) ACADEMICS, MEDICINE & LANGUAGES:
   - Focus on active recall, spaced repetition, mock exams, and daily speaking/writing practice.
5) UNCONVENTIONAL & CREATIVE SKILLS:
   - Anchor the tasks in daily deliberate practice with the specific tools the user possesses.

STRICT ADHERENCE TO USER FEEDBACK & NOTES:
- Every note, constraint, tool limitation, or clarification provided in the answers MUST be treated as an absolute hard requirement. You must shape the tasks directly around the user's specific words.

DURATION TRUTH:
- If targetDeadline is passed, enforce the targetDeadline constraints below.
- Otherwise, if any answer states a duration (e.g. "3 أشهر", "90 يوم", "12 weeks"), convert deterministically: weeks×7, months×30, and set "plan.estimated_total_days" to EXACTLY that many days.
- "estimated_completion_date" = CURRENT DATE + estimated_total_days.
${targetDeadlineInstruction}

COMPLETION CRITERIA (معيار الإنجاز) IS MANDATORY:
- Every single task MUST have a concrete, measurable "completion_criteria" (Definition of Done) placed right with it.
- It must answer clearly: "How does the user know with 100% certainty that this task is finished today without self-deception?"
- Must include quantitative/tangible measures (e.g. "قراءة 15 صفحة وتدوين ملخص في سطرين", "إتمام 4 مجموعات ضغط وسكوات مع تسجيل العدات", "برمجة خاصية تسجيل الدخول واختبارها محلياً").
- NEVER output an empty completion_criteria or generic phrases like "finish the task".

GOAL TITLE CONSTRAINT ("plan.goal_summary" = the goal's NAME, not its description):
- Distill the goal to its essential short punchy name in AT MOST 10 words (aim for 2-6 words) like "الوصول لوزن 90 كغ مع بناء عضل" or "إطلاق متجر إلكتروني".

LANGUAGE: Respond entirely in ${userLanguage === "ar" ? "Arabic" : "English"}.
CURRENT DATE: ${currentDate}

REALISM:
- If unrealistic, return status="unrealistic" with best feasible alternative.

OUTPUT JSON FORMAT ONLY:
{
  "status": "ok" | "unrealistic" | "refused",
  "plan": {
    "goal_summary": "string",
    "success_metric": {"metric": "string", "target": "string"},
    "baseline_daily_time_minutes": number,
    "recommended_daily_time_minutes": number,
    "estimated_total_days": number,
    "estimated_completion_date": "YYYY-MM-DD",
    "confidence": "low|medium|high"
  },
  "tasks": [
    {
      "id": "t1",
      "task": "string",
      "frequency": "daily|weekly",
      "schedule_days": [0,1,2,4,5],
      "impact_weight": number,
      "time_required_minutes": number,
      "completion_criteria": "string",
      "notes": "string"
    }
  ],
  "realism_check": {
    "assessment": "plausible|unrealistic",
    "reasons": ["string"],
    "what_must_change": ["deadline|budget|scope|time|skills"]
  },
  "speedup": {
    "supported": boolean,
    "options": [
      {
        "label": "string",
        "target_days": number,
        "required_daily_time_minutes": number,
        "task_changes": ["string"],
        "tradeoffs": ["string"]
      }
    ],
    "user_warning": "string"
  },
  "ai_summary": "string"
}
`;

    const userPrompt = `
INPUT:
Current Date: ${currentDate}
Goal:
<<<BEGIN_USER_INPUT>>>
${goal}
<<<END_USER_INPUT>>>
Answers: ${JSON.stringify(answers)}
Structured Input: ${JSON.stringify(structuredInput || {})}
Target Deadline (Optional): ${targetDeadline || "None"}
`;

    try {
      const response = await GeminiService.callWithRetry(
        {
          responseMimeType: "application/json",
          maxOutputTokens: 8192,
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
      return normalizePlanHierarchy(parsed);
    } catch (error) {
      console.error("Gemini createPlan Error:", error);
      throw error;
    }
  }

  static async generateDailyFocus(
    goalContext: DailyFocusGoalContext,
    taskRows: TaskRow[],
    recentLogs: DailyFocusLogContext[] = [],
    options: {
      date?: string;
      answer?: string;
      existingQuestion?: string;
      history?: DailyFocusHistoryItem[];
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
    const safetyCheck = GeminiService.checkContentSafety(safetySource);
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

    const languageProbe = [
      options.answer || "",
      goalContext.title,
      goalContext.ai_summary || "",
      recentLogs.map((log) => log.user_input || "").join("\n"),
    ]
      .filter(Boolean)
      .join("\n");
    const requestedLanguage =
      options.language === "ar" || options.language === "en"
        ? options.language
        : undefined;
    const userLanguage =
      requestedLanguage ||
      GeminiService.detectLanguage(languageProbe || goalContext.title);
    const date = options.date || new Date().toISOString().split("T")[0];
    const hierarchy = buildTaskHierarchy(taskRows);
    const history = Array.isArray(options.history) ? options.history : [];
    const answeredDaysCount = history.length + (options.answer?.trim() ? 1 : 0);
    const suggestionsUnlocked = answeredDaysCount >= DAILY_FOCUS_REQUIRED_DAYS;
    const focusAngle = pickDailyFocusAngle(
      `${goalContext.id || goalContext.title}:${date}`,
      userLanguage,
    );

    const scopedMainTasks = hierarchy.map((main) => ({
      id: main.id,
      title: main.task_description,
      frequency: main.frequency,
      impact_weight: main.impact_weight,
      subtasks: main.subtasks.map((sub) => ({
        id: sub.id,
        title: sub.task_description,
        frequency: sub.frequency,
        impact_weight: sub.impact_weight,
      })),
    }));

    const existingSubtaskNames = hierarchy.flatMap((main) =>
      main.subtasks.map((sub) => sub.task_description),
    );

    const systemPrompt = `
SYSTEM ROLE:
أنت "المدرب النفسي والاستراتيجي العبقري" داخل تطبيق METRIX. دورك هو طرح سؤال تشخيصي عميق واحد يومياً يفكك عقلية المستخدم تجاه هدفه الحالي لاستخراج معلومات جوهرية تفيد في بناء اقتراحات وعبارات تحفيزية مخصصة له مستقبلاً.

📌 القواعد الصارمة للأسئلة:
1. ممنوع الأسئلة السطحية أو الجافة (مثل: هل أنجزت مهمة البارحة؟).
2. ركز على استخراج الدوافع العميقة (الـ Why)، العوائق النفسية (الخوف، المماطلة، تأثير المحيط/العائلة)، أو الدوافع المادية والعملية (المال، السفر، إثبات الذات).
3. اربط السؤال بذكاء بملخص الهدف الحالي واجعل التوجه يتغير يومياً بناءً على الزوايا الستة المتاحة (لكن بنظرة عميقة).
4. لغة السؤال: يجب أن تكون بلهجة عراقية شبابية، ذكية، ومباشرة جداً (بدون رسميات كليشيه)، تلمس الجرح وتحفز على التفكير.
5. التنسيق: سطر افتتاحي ذكي + (3-5 نقاط) مركزة تحت نفس الموضوع باستخدام رمز • لاستخراج تفاصيل دقيقة.

📌 الزوايا الستة بعد التطوير (تُحدد بناءً على الـ Angle Hint):
- [Meaning & Why]: ركز على السبب الحقيقي وراء رغبته في تحقيق هذا الهدف (مثلاً: ليش هذا الهدف بالذات هسة؟ شنو اللي يتغير بحياتك أو بوضعك المالي/العائلي إذا تحقق؟).
- [Mental Obstacles]: ركز على العوائق الداخلية (الخوف من الفشل، قلة الحماس، الضغط النفسي، المماطلة).
- [Environment Fit]: ركز على تأثير المحيط (هل العائلة أو الأصدقاء أو البيئة المحيطة دا تدعمك لو دا تحبطك وتعطلك؟ كيف دا تتعامل ويا هذا الشي؟).
- [Value & Leverage]: ركز على العائد الحقيقي للهدف (هل هذا الهدف هو اللي راح يفتح لك باب الشغل أو السفر أو الفلوس اللي تحتاجها؟ كيف تشوف تأثيره على مستقبلك؟).
- [Yesterday Honesty]: مواجهة صريحة مع النفس حول تقصير البارحة أو إنجازه بدون مجاملة، وبحث الأسباب النفسية وراء ذلك.
- [Sustainability]: هل نمط حياتك الحالي دا يساعدك تستمر بدون ما تحترق نفسياً؟ شنو الشيء اللي تحتاجه هسة عشان يطمن قلبك وتستمر بحماس؟

📌 قواعد عدم التكرار:
- لا تكرر سؤالاً سابقاً أو نفس الموضوع من الإجابات السابقة.
- قبل كتابة السؤال، استنتج 5-8 كلمات مفتاحية من السؤال المرشح وقارنها ذهنياً بالأسئلة السابقة. إذا كان التشابه عالياً، اختر زاوية جديدة.
- إذا تعارضت زاوية اليوم مع قاعدة عدم التكرار، وسّع الزاوية لكن اسأل عن مهمة أو نمط أو عائق مختلف.
- لا تطلب من المستخدم إعادة إجابة معلومات موجودة أصلاً في الهدف أو المهام أو السجلات أو الإجابات السابقة.

📌 مخرجات الـ Quick Options (خيارات سريعة ذكية):
- قم بتوليد من 3 إلى 5 خيارات سريعة ديناميكية (quick_options) مخصصة لسؤال اليوم وسياق المستخدم.
- الخيارات يجب أن تكون مشتقة بعناية من السؤال الحالي + المهام الحالية للمستخدم + سجل إنجازه الأخير (وليست خيارات عامة ولا مكررة).
- اكتبها بلهجة عراقية طبيعية ذكية وموجزة جداً (سطر واحد قصير لكل خيار) بحيث يضغط عليها المستخدم بلمسة واحدة ليجيب عن حالته أو عائقه اليوم.

📌 القواعد الصارمة للـ Suggestions (إلغاء التوليد العشوائي، والتركيز على تعديل المهام عند التعثر):
- ⚠️ القاعدة الأولى والأساسية: في الأيام الطبيعية أو عندما يكون أداء المستخدم مستمراً ولا يعاني من انقطاع، يجب أن تكون قائمة الاقتراحات فارغة تماماً: "suggestions": []! لا تخلق مهام جديدة تزيد من عبء وقت المستخدم وتشتت تركيزه (المهام تأخذ وقتاً بشرياً حقيقياً من 15 دقيقة إلى ساعات، وإضافة مهام إضافية يسبب الإحباط).
- متى تولد اقتراحات؟ فقط عند وجود "تعثر حقيقي" (Stall / Bottleneck):
  1) إذا أظهرت السجلات الأخيرة انقطاعاً أو تراجعاً ملحوظاً (توقف يومين أو أكثر أو إنجاز منخفض جداً).
  2) أو إذا كانت إجابة المستخدم (USER_ANSWER) توضح عائقاً صريحاً أو اختناقاً في مهمة معينة.
- 🎯 طبيعة الاقتراح عند التعثر:
  - لا تقم باختراع مهام جديدة عشوائية تستهلك وقتاً إضافياً!
  - بدلاً من ذلك، اقترح **تعديلاً ذكياً على مهمة قائمة بالفعل** (support_type: "task_adjustment"):
    - حدد target_task_id من معرفات المهام الموجودة.
    - Title: اكتب الصياغة الجديدة للمهمة بعد التعديل والتخفيف لكسر الجمود.
    - completion_criteria: معيار إنجاز مخفف ومحدد وقابل للتنفيذ السريع.
    - reason: اشرح للمستخدم بوضوح كيف يساعده هذا التعديل على تجاوز العائق الحالي.
  - 🛡️ شرط جوهري للتعديل: يجب أن يحافظ التعديل على جوهر الهدف الأساسي (Goal Core Essence) ولا يقلل من قيمته، بل ينسجم ويتناسق مع باقي مهام الخطة لضمان استمرارية الزخم بدلاً من الانقطاع التام.
  - الحد الأقصى: اقتراح واحد فقط (أو 2 على الأكثر إذا لزم الأمر).

📌 معالجة الإجابة:
- اذا كان USER_ANSWER موجود، خلي نفس السؤال ونقّح الـ suggestions بناءً على الإجابة (إذا كان فيها عائق يستوجب تعديل مهمة).
- answer_coaching تصير رسالة مدرب قصيرة تتفاعل مع الإجابة (تحفيزية، كاشفة، أو تتحدى تفكيره).
- اذا USER_ANSWER فاضي، answer_coaching تبقى نص فارغ.

📌 question_why:
- اشرح بالضبط ليش هذا السؤال مهم اليوم بناءً على بيانات المستخدم الفعلية — مو شرح عام. ارجع لمهام محددة، سجلات، أو أنماط.

LANGUAGE:
- Respond fully in ${userLanguage === "ar" ? "Iraqi Arabic dialect" : "English"}.
- If Arabic is used, use natural Iraqi dialect only. Avoid formal Modern Standard Arabic wording where possible.
- In English, keep the question psychologically probing, direct, and conversational — not corporate or generic.

OUTPUT JSON ONLY:
{
  "status": "ok" | "refused",
  "date": "YYYY-MM-DD",
  "angle_label": "string",
  "question": "string",
  "question_why": "string",
  "quick_options": ["خيار سريع 1", "خيار سريع 2", "خيار سريع 3"],
  "answer_coaching": "string",
  "suggestions_unlocked": boolean,
  "answered_days_count": number,
  "required_answer_days": number,
  "suggestions": [
    {
      "id": "s1",
      "emoji": "🛠️",
      "title": "string",
      "reason": "string",
      "completion_criteria": "string (معيار إنجاز ملموس ومحدد وقابل للقياس يوضح متى تعتبر المهمة منجزة اليوم)",
      "frequency": "daily|weekly",
      "impact_weight": number,
      "target_type": "main|sub",
      "parent_task_id": "string or null",
      "target_task_id": "string or null",
      "support_type": "task_adjustment|goal_task|external_booster"
    }
  ],
  "safe_redirection": {
    "message": "string",
    "alternatives": ["string"]
  }
}`;

    const userPrompt = `
DATE:
${date}

ANGLE HINT:
${focusAngle.label} - ${focusAngle.prompt}

ANSWER HISTORY COUNT:
${history.length}

REQUIRED ANSWER DAYS BEFORE SUGGESTIONS:
${DAILY_FOCUS_REQUIRED_DAYS}

GOAL:
${JSON.stringify(goalContext, null, 2)}

MAIN TASK OPTIONS FOR parent_task_id:
${JSON.stringify(
  scopedMainTasks.map((main) => ({
    id: main.id,
    title: main.title,
    frequency: main.frequency,
  })),
  null,
  2,
)}

CURRENT TASK MAP:
${JSON.stringify(scopedMainTasks, null, 2)}

EXISTING SUBTASK TITLES:
${JSON.stringify(existingSubtaskNames, null, 2)}

RECENT LOGS:
${JSON.stringify(
  recentLogs.slice(0, 8).map((log) => ({
    created_at: log.created_at,
    ai_score: log.ai_score ?? null,
    ai_feedback: log.ai_feedback ?? "",
    user_input: log.user_input ?? "",
  })),
  null,
  2,
)}

PREVIOUS DAILY FEEDBACK ANSWERS:
${JSON.stringify(history.slice(0, 12), null, 2)}

PREVIOUS QUESTION TEXTS TO AVOID REPEATING:
${JSON.stringify(
  history.slice(0, 12).map((item) => item.question),
  null,
  2,
)}

EXISTING QUESTION TO KEEP:
${options.existingQuestion || ""}

USER_ANSWER:
${options.answer || ""}
`;

    try {
      const response = await GeminiService.callWithRetry(
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
      const suggestions = Array.isArray(parsed.suggestions)
        ? parsed.suggestions
        : [];

      const rawQuickOptions = Array.isArray(parsed.quick_options)
        ? parsed.quick_options
        : Array.isArray(parsed.options)
          ? parsed.options
          : [];
      const quick_options = rawQuickOptions
        .filter(
          (opt: unknown): opt is string =>
            typeof opt === "string" && opt.trim().length > 0,
        )
        .map((opt: string) => opt.trim());

      return {
        status: parsed.status === "refused" ? "refused" : "ok",
        date: typeof parsed.date === "string" ? parsed.date : date,
        angle_label:
          typeof parsed.angle_label === "string" && parsed.angle_label.trim()
            ? parsed.angle_label.trim()
            : focusAngle.label,
        question:
          typeof parsed.question === "string" && parsed.question.trim()
            ? parsed.question.trim()
            : options.existingQuestion?.trim() || "",
        question_why:
          typeof parsed.question_why === "string"
            ? parsed.question_why.trim()
            : "",
        quick_options,
        answer_coaching:
          typeof parsed.answer_coaching === "string"
            ? parsed.answer_coaching.trim()
            : "",
        suggestions_unlocked: suggestionsUnlocked,
        answered_days_count: answeredDaysCount,
        required_answer_days: DAILY_FOCUS_REQUIRED_DAYS,
        suggestions: suggestions
          .map((item: any, index: number) => {
            const supportType =
              item?.support_type === "task_adjustment"
                ? "task_adjustment"
                : item?.support_type === "external_booster"
                  ? "external_booster"
                  : "goal_task";
            const rawTargetType = item?.target_type === "sub" ? "sub" : "main";
            const targetType =
              supportType === "external_booster" ? "main" : rawTargetType;
            const targetTaskId =
              typeof item?.target_task_id === "string" && item.target_task_id.trim()
                ? item.target_task_id.trim()
                : null;

            return {
              id:
                typeof item?.id === "string"
                  ? item.id
                  : `daily-focus-${index + 1}`,
              title: typeof item?.title === "string" ? item.title.trim() : "",
              reason:
                typeof item?.reason === "string" ? item.reason.trim() : "",
              completion_criteria:
                typeof item?.completion_criteria === "string" && item.completion_criteria.trim()
                  ? item.completion_criteria.trim()
                  : typeof item?.reason === "string" && item.reason.trim()
                    ? item.reason.trim()
                    : "",
              emoji:
                typeof item?.emoji === "string" && item.emoji.trim()
                  ? item.emoji.trim()
                  : supportType === "task_adjustment"
                    ? "🛠️"
                    : supportType === "external_booster"
                      ? "⚡"
                      : "🎯",
              frequency: normalizeFrequency(item?.frequency),
              impact_weight: clamp(
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
              support_type: supportType,
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

  // Phase 3: Daily Judge
  static async evaluateDailyLog(
    planTasks: any[],
    userLog: string,
    previousLogs: any[] = [],
    goalContext: any = {},
    mainTasksInput: any[] = [],
    calculateTimeBonus: boolean = false,
  ) {
    const safetyCheck = GeminiService.checkContentSafety(userLog);
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

    const userLanguage = GeminiService.detectLanguage(userLog);

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
  - done => 80%..100% of weight (if completed or substantially done e.g. 70%+ of criteria, reward encouragingly with ~80%-100% of weight).
  - partial => 40%..75% of weight (honest progress made but noticeable part of criteria remains).
  - missed/unknown => 0
- Bonus allowed only for extra verified work beyond defined tasks: 0..5
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
      const response = await GeminiService.callWithRetry(
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
        points: Math.max(0, Number(item.points) || 0),
        reason: item.reason || "",
        time_bonus: item.time_bonus
          ? Math.max(0, Number(item.time_bonus))
          : undefined,
      }));

      const bonusPoints = clamp(Number(parsed?.bonus?.points) || 0, 0, 10);
      const sumSubtaskPoints = normalizedSubtaskBreakdown.reduce(
        (sum: number, item: any) => sum + (Number(item.points) || 0),
        0,
      );
      const totalAwarded = clamp(
        sumSubtaskPoints + bonusPoints,
        0,
        dynamicDailyCap,
      );
      const basePoints = clamp(sumSubtaskPoints, 0, maxBasePoints);
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

  static async evaluateMultiGoalDailyLog(
    goals: MultiGoalItemContext[],
    userInput: string,
    language: "ar" | "en" = "ar",
    coachPersona: "strict" | "balanced" | "analytical" = "balanced",
  ): Promise<MultiGoalEvaluationResult> {
    const safetyCheck = GeminiService.checkContentSafety(userInput);
    if (!safetyCheck.isSafe) {
      const reason = safetyCheck.reason || "Safety check triggered";
      return {
        status: "refused",
        overall_summary: reason,
        goals: [],
        safe_redirection: {
          message: reason,
          alternatives: [
            "Please reach out to professional support if you are in distress.",
          ],
        },
      };
    }

    const isArabic =
      language === "ar" || GeminiService.detectLanguage(userInput) === "ar";

    const coachPersonaInstruction =
      coachPersona === "strict"
        ? "COACH PERSONA: Strict & Uncompromising. Direct, highly rigorous, zero sugarcoating, focus on standard and discipline."
        : coachPersona === "analytical"
          ? "COACH PERSONA: Analytical & Pragmatic. Focus on exact numbers, percentages of criteria achieved, time spent, and tangible outputs."
          : "COACH PERSONA: Balanced & Encouraging. Positive yet honest, acknowledges genuine effort, reinforces momentum, and gently points out what remains.";

    const systemPrompt = `
SYSTEM ROLE:
You are the "Multi-Goal Disentanglement & Daily Accountability Evaluator" for METRIX.
${coachPersonaInstruction}

CONTEXT:
The user is pursuing multiple active goals (which may be sub-goals or mini-goals).
The user provides an informal, free-form text or spoken voice transcript describing what they accomplished today.
Crucially, the user's input often intermingles, combines, or merges several goals together in one rambling or colloquial narrative (e.g. Iraqi, Gulf, Egyptian, Levantine, or MSA Arabic, or English). Words may be disorganized ("مشبوش ومدموج").

YOUR TASK:
1. DISENTANGLE & MAP:
   Carefully examine the user's narrative against the list of provided goals.
   For EACH provided goal:
   - Determine if the user's text genuinely mentions, references, or describes any activity or milestone related to this goal (set "mentioned": true or false).
   - If mentioned, EXTRACT and ISOLATE only the specific accomplishments that belong to this goal ("extracted_activity"). Discard parts belonging to other goals. Formulate a crisp, clear statement of what was actually achieved (in the user's language).
   - If NOT mentioned or no progress was made on this goal, set:
     - "mentioned": false
     - "extracted_activity": "${isArabic ? "لم يتم ذكر نشاط لهذا الهدف اليوم" : "No activity mentioned for this goal today"}"
     - "points_to_award": 0
     - "feedback": "${isArabic ? "لا بأس، التركيز غداً يعيد الزخم المطلوب." : "No worries, tomorrow is a fresh opportunity to regain momentum."}"

2. RIGOROUS & FAIR SCORING:
   - For each goal where progress was actually made ("mentioned": true):
     - Calculate "points_to_award" (integer).
     - Standard scoring guidelines:
       - Minor / small effort: 5 - 10 points
       - Moderate / solid effort: 12 - 20 points
       - High / substantial effort: 25 - 35 points
       - Cap per goal: 40 points maximum.
     - If the goal has subtasks listed in its context, inspect if any specific subtasks were fulfilled and list their IDs in "completed_task_ids".

3. COACHING FEEDBACK:
   - For each goal with progress, write a sharp, personalized 1-2 sentence coaching evaluation ("feedback") in the user's language, strictly adopting the tone and style of the COACH PERSONA above.

4. OVERALL SUMMARY:
   - Write a 1-2 sentence executive summary of the user's total day ("overall_summary") reflecting the COACH PERSONA tone.

STRICT JSON OUTPUT:
Return ONLY a valid JSON object matching this schema:
{
  "overall_summary": "string",
  "goals": [
    {
      "goal_id": "string",
      "goal_title": "string",
      "mentioned": boolean,
      "extracted_activity": "string",
      "points_to_award": number,
      "feedback": "string",
      "completed_task_ids": ["string"]
    }
  ]
}
`;

    const userPrompt = `
ACTIVE GOALS CONTEXT:
${JSON.stringify(
  goals.map((g) => ({
    goal_id: g.id,
    title: g.title,
    description: g.description,
    current_points: g.current_points,
    target_points: g.target_points,
    available_tasks: g.tasks?.map((t) => ({
      task_id: t.id,
      title: t.title,
      weight: t.impact_weight,
    })),
  })),
  null,
  2,
)}

USER'S COMBINED DAILY LOG:
"""
${userInput}
"""

Language to reply in: ${isArabic ? "Arabic" : "English"}
`;

    try {
      const response = await GeminiService.callWithRetry(
        {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
        [{ text: systemPrompt }, { text: userPrompt }],
        (text) => extractJson(text),
      );

      const parsed = extractJson(response.text || "{}");
      const overall_summary =
        typeof parsed?.overall_summary === "string"
          ? parsed.overall_summary
          : "";
      const rawGoals = Array.isArray(parsed?.goals) ? parsed.goals : [];

      const evaluatedGoals: MultiGoalEvaluatedItem[] = goals.map(
        (inputGoal) => {
          const found = rawGoals.find(
            (r: any) =>
              r.goal_id === inputGoal.id ||
              r.goal_title?.trim().toLowerCase() ===
                inputGoal.title.trim().toLowerCase(),
          );
          if (found && Boolean(found.mentioned)) {
            return {
              goal_id: inputGoal.id,
              goal_title: inputGoal.title,
              mentioned: true,
              extracted_activity:
                typeof found.extracted_activity === "string" &&
                found.extracted_activity.trim().length > 0
                  ? found.extracted_activity.trim()
                  : isArabic
                    ? "إنجاز مهام مرتبطة بالهدف"
                    : "Progress achieved on goal tasks",
              points_to_award: Math.min(
                40,
                Math.max(1, Math.round(Number(found.points_to_award) || 10)),
              ),
              feedback:
                typeof found.feedback === "string" &&
                found.feedback.trim().length > 0
                  ? found.feedback.trim()
                  : isArabic
                    ? "استمرارية رائعة تدعم تقدمك المستمر."
                    : "Great consistency supporting your ongoing momentum.",
              completed_task_ids: Array.isArray(found.completed_task_ids)
                ? found.completed_task_ids.map(String)
                : [],
            };
          }
          return {
            goal_id: inputGoal.id,
            goal_title: inputGoal.title,
            mentioned: false,
            extracted_activity: isArabic
              ? "لم يتم ذكر نشاط لهذا الهدف اليوم"
              : "No activity mentioned for this goal today",
            points_to_award: 0,
            feedback: isArabic
              ? "لا بأس، التركيز غداً يعيد الزخم المطلوب."
              : "No worries, tomorrow is a fresh opportunity to regain momentum.",
            completed_task_ids: [],
          };
        },
      );

      return {
        status: "ok",
        overall_summary:
          overall_summary ||
          (isArabic
            ? "تم تحليل وتوزيع إنجازاتك اليومية بنجاح."
            : "Your daily accomplishments have been successfully analyzed and distributed."),
        goals: evaluatedGoals,
      };
    } catch (error) {
      console.error("Gemini evaluateMultiGoalDailyLog Error:", error);
      throw error;
    }
  }

  static async evaluateMilestone(
    goalContext: any,
    tasksDescriptions: string[],
    userInput: string,
    language: "ar" | "en",
  ) {
    const safetyCheck = GeminiService.checkContentSafety(userInput);
    if (!safetyCheck.isSafe) {
      return {
        is_milestone_accepted: false,
        rejection_reason: safetyCheck.reason,
        milestone_tier: "minor",
        suggested_base_points_multiplier: 1,
        coaching_message: safetyCheck.reason,
        safe_redirection: {
          message: safetyCheck.reason,
          alternatives: [
            "Please reach out to professional support if you are in distress.",
          ],
        },
      };
    }

    const systemPrompt = `
SYSTEM ROLE:
You are the "Milestone Evaluator" for a goal-tracking app.

Your job:
1. STRICT MATH EVALUATION (IGNORE HYPERBOLE): The user's Goal Title or Description might use extreme, hyperbolic, or metaphorical language for personal motivation (e.g., 'Becoming a machine'). DO NOT use the Goal Title to judge the validity of the milestone.
You MUST base your decision SOLELY on comparing the 'User Claimed Achievement' against their 'Regular Tasks'.
- If the claimed effort is >= 3x the normal task effort, you MUST ACCEPT it.
- If it's < 3x, REJECT it.
2. TONE & MESSAGING: Use the Goal Title and Description ONLY to set the tone, vocabulary, and theme of the \`coaching_message\`. Make it match their specific ambition.
3. NAME GENERATION: Generate a short, epic name for the milestone based on the action performed.
4. CLASSIFY TIER:
   - 'minor' (3x-4x effort)
   - 'major' (5x-9x effort)
   - 'legendary' (10x+ effort)
5. SHORT DESCRIPTION: Generate a concise summary of the user's milestone description in ONE clear sentence (max 18 words). It must capture the core achievement, not motivation.

Respond entirely in ${language === "ar" ? "Arabic" : "English"}.

OUTPUT JSON ONLY:
{
  "is_milestone_accepted": boolean,
  "rejection_reason": "string (if rejected, explain why based on effort comparison)",
  "milestone_tier": "minor" | "major" | "legendary",
  "suggested_base_points_multiplier": number,
  "generated_name": "string (short epic name)",
  "short_description": "string (one-sentence summary of the achievement, max 18 words)",
  "coaching_message": "string (encouraging message if accepted, or explanation if rejected. Match the hyperbole tone)"
}
`;

    const userPrompt = `
GOAL CONTEXT:
${JSON.stringify(goalContext, null, 2)}

REGULAR TASKS:
${JSON.stringify(tasksDescriptions, null, 2)}

USER MILESTONE CLAIM:
<<<BEGIN_USER_INPUT>>>
${userInput}
<<<END_USER_INPUT>>>
`;

    try {
      const response = await GeminiService.callWithRetry(
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

      return extractJson(responseText);
    } catch (error) {
      console.error("Gemini evaluateMilestone Error:", error);
      throw error;
    }
  }

  static async chatAboutGoal(
    goal: {
      title: string;
      ai_summary?: string;
      created_at?: string;
      current_points?: number;
      target_points?: number;
    },
    userLanguage: 'ar' | 'en',
    messages: { role: 'user' | 'assistant'; content: string }[],
    userMessage: string,
  ): Promise<string> {
    const safetyCheck = GeminiService.checkContentSafety(userMessage);
    if (!safetyCheck.isSafe) {
      return userLanguage === 'ar'
        ? 'عذراً، لا يمكنني الرد على هذا. دعنا نرجع لهدفك.'
        : 'Sorry, I cannot respond to that. Let\'s get back to your goal.';
    }

    const todayStr = new Date().toISOString().split('T')[0];

    let daysSinceStart = 0;
    if (goal.created_at) {
      const start = new Date(goal.created_at);
      const now = new Date();
      daysSinceStart = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    }

    const systemPrompt = userLanguage === 'ar'
      ? `أنت مدرب شخصي ذكي داخل تطبيق METRIX. دورك الوحيد هو مساعدة المستخدم في التحدث عن هدفه الحالي ومتابعة تقدمه.

📌 معلومات الهدف الحالي:
- عنوان الهدف: ${goal.title}
- تاريخ البدء: ${goal.created_at || 'غير محدد'} (تاريخ اليوم هو ${todayStr})
- النقاط الحالية: ${goal.current_points || 0} من أصل ${goal.target_points || 0}
- عدد الأيام منذ البدء: ${daysSinceStart} يوماً
- ملخص الهدف: ${goal.ai_summary || 'لا يوجد ملخص'}

🛑 قواعد صارمة جداً:
1. أجب فقط على الأسئلة المتعلقة بـ "${goal.title}".
2. قدم معلومات ونصائح وتوجيهات تخص هذا الهدف وحالته فقط.
3. إذا سألك المستخدم عن أي موضوع خارجي، اعتذر بلطف: "أنا هنا فقط لمساعدتك في هدفك [${goal.title}]، دعنا نعود للتركيز عليه 🙌"
4. اجعل إجاباتك قصيرة، محفزة، ومباشرة (2-4 جمل).
5. يمكنك حساب كم يوم/شهر مضى على الهدف بناءً على dates أعلاه.`
      : `You are a smart personal coach inside METRIX. Your only role is to help the user talk about their current goal and track progress.

📌 Current Goal Info:
- Goal Title: ${goal.title}
- Start Date: ${goal.created_at || 'Not set'} (Today is ${todayStr})
- Current Points: ${goal.current_points || 0} out of ${goal.target_points || 0}
- Days Since Start: ${daysSinceStart} days
- Goal Summary: ${goal.ai_summary || 'No summary available'}

🛑 Strict Rules:
1. Only answer questions related to "${goal.title}".
2. Provide tips, insights, and guidance specific to this goal only.
3. If the user asks about anything outside the goal: "I'm here only to help you with your goal [${goal.title}], let's stay focused on it 🙌"
4. Keep responses short, motivating, and direct (2-4 sentences).
5. You can calculate how many days/months have passed since the goal started.`;

    const safeMessages = Array.isArray(messages) ? messages : [];
    const history = safeMessages.slice(-6).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    try {
      const response = await GeminiService.callWithRetry(
        {
          systemInstruction: {
            parts: [{ text: systemPrompt }],
            role: 'system',
          },
        },
        [
          ...history,
          { role: 'user', parts: [{ text: userMessage }] },
        ],
      );

      const responseText = response.text || '';
      if (!responseText) throw new Error('Empty response from Gemini API');

      return responseText;
    } catch (error) {
      console.error('Gemini chatAboutGoal Error:', error);
      if (error instanceof GeminiQuotaError) {
        return userLanguage === 'ar'
          ? 'عذراً، وصلت للحد الأقصى للاستخدام حالياً. حاول بعد شوي.'
          : 'Sorry, I\'ve reached the usage limit. Try again in a bit.';
      }
      return userLanguage === 'ar'
        ? 'عذراً، صار خطأ. حاول مرة ثانية.'
        : 'Sorry, something went wrong. Please try again.';
    }
  }

  static async generateMilestoneImage(
    userInput: string,
    goalDomain: string,
    milestoneTier: "minor" | "major" | "legendary",
    aspectRatio: "1:1" | "4:3" | "16:9" | "9:16" | "3:4" = "4:3",
    style: "matrix" | "cinematic" | "poster" | "minimal" = "matrix",
  ) {
    const stylePrompts = {
      matrix:
        "Matrix-inspired cyberpunk, emerald code energy, futuristic neon glow, abstract but premium, heroic atmosphere, 4:3 aspect ratio",
      cinematic:
        "cinematic achievement poster, dramatic volumetric lighting, epic depth, high-end movie key art, premium composition, 4:3 aspect ratio",
      poster:
        "modern social media achievement poster, bold central composition, luxury digital art, clean negative space, 4:3 aspect ratio",
      minimal:
        "minimal premium abstract achievement artwork, elegant geometry, soft gradients, luxury editorial design, 4:3 aspect ratio",
    };

    const prompt = `A premium 4:3 visual milestone artwork.
Style: ${stylePrompts[style]}.
Tier: ${milestoneTier}.
Goal domain: ${goalDomain}.
Achievement context: ${userInput}.
Visual concept: Depict the RESULT, the TOOL, the ENVIRONMENT, or the ABSTRACT CONCEPT using objects, atmospheric effects, architectural elements, textures, light, and metaphor. The scene must embody the accomplishment through things and atmosphere — never through a person or character.
Composition: Centered focal subject, balanced visual weight, generous negative space at top or center for text overlay, clear foreground / middle ground / background separation.
Strict content rules: ABSOLUTELY NO humans, NO people, NO faces, NO bodies, NO hands, NO silhouettes of people, NO characters, NO figurines, NO portraits, NO anatomy of any kind. Only objects, environments, architecture, textures, light, and symbolic elements. NO readable text, NO letters, NO numbers, NO logos, NO watermarks, NO UI elements, NO interface screenshots, NO charts, NO graphs, NO progress bars.`;

    try {
      console.log(
        `Generating milestone image with imagen-4.0-generate-001, aspect ${aspectRatio}, style ${style}`,
      );
      const response = await getAi().models.generateImages({
        model: "imagen-4.0-generate-001",
        prompt,
        config: {
          numberOfImages: 1,
          aspectRatio,
        } as any,
      });

      const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
      if (imageBytes) return imageBytes;

      throw new Error("No image bytes returned from imagen-4.0-generate-001");
    } catch (imagenError: any) {
      const imagenPlanUnavailable = isImagePlanError(imagenError);
      if (isQuotaError(imagenError) && !imagenPlanUnavailable) {
        throw new GeminiQuotaError(getRetryDelaySeconds(imagenError));
      }

      console.warn(
        "Imagen milestone image generation failed; falling back to gemini-2.5-flash-image:",
        imagenPlanUnavailable
          ? "Imagen requires a paid Google AI plan for this project."
          : imagenError?.message || imagenError,
      );

      try {
        const response = await getAi().models.generateContent({
          model: "gemini-2.5-flash-image",
          contents: prompt,
          config: {
            responseModalities: ["Image"],
            imageConfig: { aspectRatio },
          } as any,
        });

        const parts = response.candidates?.[0]?.content?.parts ?? [];
        for (const part of parts) {
          if (part.inlineData?.data) {
            console.log(
              `Fallback image generated, mimeType: ${part.inlineData.mimeType}`,
            );
            return part.inlineData.data;
          }
        }

        throw new Error("No image bytes returned from fallback image model");
      } catch (error: any) {
        if (isQuotaError(error)) {
          throw new GeminiQuotaError(getRetryDelaySeconds(error));
        }

        if (imagenPlanUnavailable || isImagePlanError(error)) {
          throw new GeminiImageUnavailableError();
        }

        console.error(
          "Gemini generateMilestoneImage Error:",
          error?.message || error,
        );
        throw error;
      }
    }
  }

  static async editGoalWithAI(
    currentGoal: any,
    instruction: string,
    tasks: any[] = [],
  ) {
    const safetyCheck = GeminiService.checkContentSafety(instruction);
    if (!safetyCheck.isSafe) {
      return {
        status: "refused",
        explanation: safetyCheck.reason,
      };
    }

    const userLanguage = GeminiService.detectLanguage(instruction);
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
6. "target_points" (integer >= 1000)
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
- If the user asks for something that does not belong to this goal, do NOT add it. Say so in "explanation".
- If no task should change, return "task_changes": [].

NEVER CLAIM SOMETHING YOU DID NOT DO:
- "explanation" must describe ONLY the changes actually present in "goal" and "task_changes".
- If you could not do part of what the user asked, say that plainly in "explanation".

BE SMART AT PARSING COMMANDS & DATES:
- "extend it by 3 months" / "add a month" -> compute a new "estimated_completion_date" from the existing one or from the current date (Current Date: ${currentDate}).
- Convert spoken numbers ("2.5 million", "مليونين ونص") to integers.
- Preserve every property that the user did not ask to change.
- "estimated_completion_date" must be after "created_at".

OUTPUT LANGUAGE:
- Write "explanation", any new "task_description" and "completion_criteria" in the user's language: ${userLanguage === "ar" ? "Arabic" : "English"}.

OUTPUT JSON FORMAT ONLY:
{
  "status": "ok" | "refused",
  "goal": {
    "title": "string",
    "ai_summary": "string",
    "created_at": "YYYY-MM-DD",
    "estimated_completion_date": "YYYY-MM-DD",
    "current_points": number,
    "target_points": number,
    "icon": "string"
  },
  "task_changes": [],
  "explanation": "Brief description of what actually changed, in the user's language."
}
`;

    const userPrompt = `
CURRENT DATE: ${currentDate}

CURRENT GOAL:
${JSON.stringify({
  title: currentGoal.title,
  ai_summary: currentGoal.ai_summary || currentGoal.description || "",
  created_at: currentGoal.created_at,
  estimated_completion_date: currentGoal.estimated_completion_date,
  current_points: currentGoal.current_points,
  target_points: currentGoal.target_points,
  icon: currentGoal.icon || "Target"
}, null, 2)}

CURRENT TASKS (${safeTasks.length} total):
${taskContext.length ? JSON.stringify(taskContext, null, 2) : "[]  // this goal has no tasks yet"}

USER INSTRUCTIONS:
<<<BEGIN_USER_INPUT>>>
${instruction}
<<<END_USER_INPUT>>>
`;

    try {
      const response = await GeminiService.callWithRetry(
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
      return GeminiService.sanitizeGoalEdit(parsed, safeTasks);
    } catch (error) {
      console.error("Gemini editGoalWithAI Error:", error);
      throw error;
    }
  }

  /**
   * Specifically replaces a single task with an alternative that STRICTLY honors
   * the user's explicit replacement reason and custom note (e.g. specific calories, tools, preferences).
   */
  static async replaceTaskWithAI(params: {
    goalTitle: string;
    currentTask: {
      id: string;
      task: string;
      frequency?: string;
      impact_weight?: number;
      time_required_minutes?: number;
      completion_criteria?: string;
    };
    reason: string;
    userNote?: string;
    otherTasks?: string[];
  }) {
    const { goalTitle, currentTask, reason, userNote = "", otherTasks = [] } = params;
    const combinedInput = `${reason} ${userNote}`.trim();
    const safetyCheck = GeminiService.checkContentSafety(combinedInput);
    if (!safetyCheck.isSafe) {
      return {
        status: "refused",
        explanation: safetyCheck.reason,
      };
    }

    const userLanguage = GeminiService.detectLanguage(`${goalTitle} ${combinedInput}`);

    const systemPrompt = `
SYSTEM ROLE:
You are an expert "Task Replacement Specialist". The user is reviewing their action plan for a goal and wants to REPLACE one specific task with an alternative that directly addresses their feedback and constraints.

CORE DIRECTIVE - STRICT ADHERENCE TO USER'S NOTE:
1. If the user provided a specific note or instruction (e.g. specific calories, alternative workout method, home equipment, or time limitations):
   - You MUST STRICTLY AND FAITHFULLY honor the user's note as the primary specification for the replacement task!
   - Do NOT ignore what the user specifically asked for. If they say "I want to commit to 1500 or 1000 calories", the new task MUST be about committing to and tracking those calories!
2. If the user mentioned a reason like "not fitting schedule" or "too hard" without specific note:
   - Provide a genuinely lighter, more accessible alternative that still advances the goal.
3. Distinctness:
   - The new task must be distinct from the OTHER TASKS in the plan. Do not duplicate existing tasks.
4. Output Language:
   - Must be in ${userLanguage === "ar" ? "Arabic" : "English"}.

OUTPUT JSON FORMAT ONLY:
{
  "task": "Clean, concise, actionable task description",
  "completion_criteria": "Clear verifiable completion criteria proving the task was accomplished today",
  "time_required_minutes": number between 5 and 180,
  "frequency": "daily" | "weekly",
  "impact_weight": number between 1 and 5,
  "explanation": "Brief 1-sentence explanation of why this replacement fits the user's note"
}`;

    const userPrompt = `
GOAL TITLE: ${goalTitle}

TASK TO REPLACE:
- Task: "${currentTask.task}"
- Frequency: ${currentTask.frequency || "daily"}
- Time required: ${currentTask.time_required_minutes || 20} minutes
- Criteria: "${currentTask.completion_criteria || ""}"

REASON FOR REPLACEMENT:
${reason}

USER'S SPECIFIC NOTE & DETAIL (CRITICAL REQUIREMENT):
<<<BEGIN_USER_NOTE>>>
${userNote || "No specific extra note provided. Suggest the best alternative for the stated reason."}
<<<END_USER_NOTE>>>

OTHER TASKS IN THIS PLAN (DO NOT DUPLICATE THESE):
${JSON.stringify(otherTasks, null, 2)}
`;

    try {
      const response = await GeminiService.callWithRetry(
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
        task: String(parsed.task || "").trim() || currentTask.task,
        completion_criteria: String(parsed.completion_criteria || "").trim() || currentTask.completion_criteria,
        time_required_minutes: Math.max(5, Math.min(300, Number(parsed.time_required_minutes) || currentTask.time_required_minutes || 20)),
        frequency: parsed.frequency === "weekly" ? "weekly" : "daily",
        impact_weight: Math.max(1, Math.min(5, Number(parsed.impact_weight) || currentTask.impact_weight || 3)),
        explanation: parsed.explanation || "",
      };
    } catch (error) {
      console.error("Gemini replaceTaskWithAI Error:", error);
      throw error;
    }
  }

  /**
   * Drops any task operation the model invented: unknown ids, sub tasks pointing at
   * a non-existent parent, out-of-range weights. The model is asked to behave; this
   * makes sure a bad answer cannot reach the database.
   */
  private static sanitizeGoalEdit(parsed: any, tasks: any[]) {
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

  /**
   * Intelligently audits and rebalances a plan when the user adjusts
   * timeline duration, difficulty tier, or target points. Recalibrates
   * completion criteria, time required, and impact weights.
   */
  static async rebalancePlan(params: {
    goalTitle: string;
    aiSummary?: string;
    targetDurationDays: number;
    previousDurationDays?: number;
    initialPlanDays?: number;
    difficulty: "easy" | "medium" | "hard" | "expert" | "legendary";
    targetPoints: number;
    dailyRate?: number;
    tasks: Array<{
      id: string;
      task: string;
      frequency?: "daily" | "weekly";
      impact_weight?: number;
      completion_criteria?: string;
      subtasks?: Array<{
        id: string;
        task: string;
        frequency?: "daily" | "weekly";
        impact_weight?: number;
        time_required_minutes?: number;
        completion_criteria?: string;
      }>;
    }>;
    language?: "ar" | "en";
  }) {
    const userLanguage = params.language || GeminiService.detectLanguage(params.goalTitle);
    const currentDate = new Date().toISOString().split("T")[0];

    const safeTasks = Array.isArray(params.tasks) ? params.tasks : [];
    if (safeTasks.length === 0) {
      return GeminiService.rebalancePlanLocally(params);
    }

    const systemPrompt = `
SYSTEM ROLE:
You are an expert "Goal & Plan Rebalancer & Feasibility Auditor" (مراجع وموازن الخطط الذكية) for a habit-tracking app.

CONTEXT:
The user has updated their parameters:
- Goal: "${params.goalTitle}"
- Goal Summary/Context: "${params.aiSummary || ""}"
- New Duration: ${params.targetDurationDays} days (previously ${params.previousDurationDays || params.targetDurationDays} days, initial plan was ${params.initialPlanDays || params.previousDurationDays || params.targetDurationDays} days)
- Commitment Tier: ${params.difficulty} (target rate: ${params.dailyRate || 100} pts/day)
- Target Points: ${params.targetPoints} points
- Language: ${userLanguage === "ar" ? "Arabic" : "English"}
- Current Date: ${currentDate}

CRITICAL OBJECTIVES:

1. REALISM & SCIENTIFIC FEASIBILITY CHECK (فحص الواقعية والاستحالة العلمية/العملية):
   - You MUST critically audit whether the goal "${params.goalTitle}" is physically, biologically, logically, and practically possible within ${params.targetDurationDays} days.
   - EXAMPLES OF IMPOSSIBLE OR DANGEROUS TIMELINES:
     * Weight loss goals: e.g. losing 10kg, 20kg in 7 days or 30 days is biologically impossible and life-threatening. Safe medical loss is 0.5 - 1 kg/week, requiring at least ~7 days per 1 kg lost (e.g. 20kg requires minimum ~140 days).
     * Language acquisition: achieving fluency or comprehensive mastery in 7-14 days is impossible.
     * Technical skills: mastering full-stack programming or complex professional domains from scratch in 7-14 days is impossible.
     * Major physical transformations compressed into a few days.
   - IF THE TIMELINE IS IMPOSSIBLE OR UNREALISTIC:
     * "realism_check.is_realistic": false
     * "realism_check.severity": "impossible" (if physically/biologically impossible or hazardous) or "warning" (if extremely compressed/unrealistic)
     * "realism_check.warning_message": A very clear, compassionate, and precise Arabic (or English) message explaining directly WHY this goal cannot be achieved in ${params.targetDurationDays} days, stating the scientific/logical reason (e.g. "لا يمكنك تحقيق هذا الهدف خلال ${params.targetDurationDays} أيام بسبب: خسارة 20 كجم تتطلب عجزاً حرارياً يفوق 154,000 سعرة حرارية، وهو مستحيل بيولوجياً ويشكل خطراً جسيماً على الصحة. المعدل العلمي الآمن هو 0.5 - 1 كجم أسبوعياً.").
     * "realism_check.recommended_min_days": number (e.g. 140 for 20kg loss, 90 for a language, etc.)
   - IF THE TIMELINE IS REALISTIC:
     * "realism_check.is_realistic": true
     * "realism_check.severity": "realistic"
     * "realism_check.warning_message": ""
     * "realism_check.recommended_min_days": ${params.targetDurationDays}

2. COMPLETION CRITERIA (معيار الإنجاز):
   - Every main task and every subtask MUST have a concrete, measurable "completion_criteria".
   - Scale this criteria according to the new timeframe and commitment level:
     * If duration decreased or difficulty increased: increase daily intensity/output volume (e.g. read more pages, write more code, practice longer).
     * If duration increased or difficulty decreased: adjust criteria to be sustainable and consistent over the longer timeframe without burnout.
     * Keep criteria practical, unambiguous, and directly verifiable.

3. TIME REQUIRED (time_required_minutes):
   - Adjust "time_required_minutes" for each subtask to match the difficulty tier:
     * easy: 10-25 minutes
     * medium: 25-45 minutes
     * hard: 45-75 minutes
     * expert: 60-100 minutes
     * legendary: 90-150 minutes

4. IMPACT WEIGHTS (impact_weight 1..5 for subtasks, 1..10 for main tasks):
   - Recalibrate weights so the daily subtasks sum up in balance with the difficulty level and target daily rate.

5. TASKS PRESERVATION & GRANULARITY:
   - Preserve existing tasks and their IDs.
   - If the higher commitment or longer duration requires additional structure, you MAY add 1-2 new relevant subtasks or milestone tasks with new unique IDs (e.g. "s_new_1").

6. AUDIT SUMMARY (مراجعة منطقية للأمر):
   - In "audit_summary", provide a clear, logical, reassuring audit review in ${userLanguage === "ar" ? "Arabic" : "English"} explaining what changed in the timeline and criteria, how daily time and weights were rebalanced, or highlighting the realism assessment.

OUTPUT JSON FORMAT ONLY:
{
  "status": "ok",
  "audit_summary": "string",
  "recommended_daily_time_minutes": number,
  "realism_check": {
    "is_realistic": boolean,
    "severity": "realistic" | "warning" | "impossible",
    "warning_message": "string",
    "recommended_min_days": number
  },
  "main_tasks": [
    {
      "id": "string",
      "task": "string",
      "frequency": "daily" | "weekly",
      "impact_weight": number,
      "completion_criteria": "string",
      "subtasks": [
        {
          "id": "string",
          "task": "string",
          "frequency": "daily" | "weekly",
          "impact_weight": number,
          "time_required_minutes": number,
          "completion_criteria": "string"
        }
      ]
    }
  ]
}
`;

    const userPrompt = `
CURRENT TASKS TO REBALANCE:
${JSON.stringify(safeTasks, null, 2)}
`;

    try {
      const response = await GeminiService.callWithRetry(
        {
          responseMimeType: "application/json",
          systemInstruction: { parts: [{ text: systemPrompt }], role: "system" },
        },
        { role: "user", parts: [{ text: userPrompt }] },
        (text: string) => extractJson(text),
      );

      const responseText = response.text || "";
      if (!responseText) throw new Error("Empty response from Gemini API");

      const parsed = extractJson(responseText);
      if (parsed && Array.isArray(parsed.main_tasks) && parsed.main_tasks.length > 0) {
        const localCheck = GeminiService.evaluateRealismLocally(params);
        // If local check detects an impossible timeline, ensure warning is prominent even if AI was overly lenient
        const realismCheck = parsed.realism_check?.is_realistic === false
          ? parsed.realism_check
          : (!localCheck.is_realistic ? localCheck : (parsed.realism_check || localCheck));

        return {
          status: "ok",
          audit_summary: parsed.audit_summary || (userLanguage === "ar" ? "تمت مراجعة الخطة وإعادة موازنتها بنجاح لتلائم المعايير الجديدة." : "Plan audited and rebalanced successfully."),
          recommended_daily_time_minutes: Number(parsed.recommended_daily_time_minutes) || 30,
          realism_check: realismCheck,
          main_tasks: parsed.main_tasks.map((main: any, mIdx: number) => ({
            id: main.id || `m_${mIdx + 1}`,
            task: main.task || `Main Task ${mIdx + 1}`,
            frequency: main.frequency === "weekly" ? "weekly" : "daily",
            impact_weight: Math.max(1, Math.min(10, Number(main.impact_weight) || 5)),
            completion_criteria: main.completion_criteria || "",
            subtasks: Array.isArray(main.subtasks)
              ? main.subtasks.map((sub: any, sIdx: number) => ({
                  id: sub.id || `s_${mIdx + 1}_${sIdx + 1}`,
                  task: sub.task || `Subtask ${sIdx + 1}`,
                  frequency: sub.frequency === "weekly" ? "weekly" : "daily",
                  impact_weight: Math.max(1, Math.min(5, Number(sub.impact_weight) || 2)),
                  time_required_minutes: Math.max(5, Number(sub.time_required_minutes) || 20),
                  completion_criteria: sub.completion_criteria || "",
                }))
              : [],
          })),
        };
      }
      return GeminiService.rebalancePlanLocally(params);
    } catch (error) {
      console.warn("Gemini rebalancePlan failed, using local rebalance engine:", error);
      return GeminiService.rebalancePlanLocally(params);
    }
  }

  /**
   * Deterministic local evaluation of goal feasibility and realistic timeline.
   */
  static evaluateRealismLocally(params: {
    goalTitle: string;
    aiSummary?: string;
    targetDurationDays: number;
    previousDurationDays?: number;
    initialPlanDays?: number;
    language?: "ar" | "en";
  }): {
    is_realistic: boolean;
    severity: "realistic" | "warning" | "impossible";
    warning_message: string;
    recommended_min_days: number;
  } {
    const isAr = (params.language || "ar") === "ar";
    const fullGoalText = `${params.goalTitle} ${params.aiSummary || ""}`.toLowerCase();

    // 1. Weight loss pattern check (e.g. "التحول من ال 105 إلى ال 85", "خسارة 20 كجم", "lose 20 kg")
    const weightLossRegex = /(?:خسارة|فقدان|إنقاص|انقاص|تخفيض|تنزيل|نزول|نقص|خساره|lose|loss|dropping)\s*(\d+)\s*(?:كجم|كيلو|كيلوغرام|كغ|kg|kilos|pounds|رطل)/i;
    const weightTransformRegex = /(?:(?:التحول|تغيير|نزول|إنقاص|انقاص|فقدان|خسارة)\s+)?من\s+(?:ال\s*)?(\d+)\s*(?:كجم|كيلو|كيلوغرام|كغ|kg)?\s+(?:إلى|الى|لـ|ل)\s+(?:ال\s*)?(\d+)|from\s+(\d+)\s+to\s+(\d+)/i;

    let kgToLose = 0;
    const matchLoss = fullGoalText.match(weightLossRegex);
    if (matchLoss) {
      kgToLose = Number(matchLoss[1]);
    } else {
      const matchTrans = fullGoalText.match(weightTransformRegex);
      if (matchTrans) {
        const fromVal = Number(matchTrans[1] || matchTrans[3]);
        const toVal = Number(matchTrans[2] || matchTrans[4]);
        if (fromVal > toVal) {
          kgToLose = fromVal - toVal;
        }
      }
    }

    if (kgToLose > 0) {
      // Safe maximum weight loss is ~1 kg per week (7 days)
      const safeMinDays = Math.max(14, Math.round(kgToLose * 7));
      const totalDeficit = kgToLose * 7700;
      const dailyDeficit = Math.round(totalDeficit / Math.max(1, params.targetDurationDays));

      if (params.targetDurationDays < safeMinDays * 0.4) {
        return {
          is_realistic: false,
          severity: "impossible",
          recommended_min_days: safeMinDays,
          warning_message: isAr
            ? `لا يمكنك تحقيق هدف خسارة ${kgToLose} كجم خلال ${params.targetDurationDays} أيام فقط؛ لأن هذا يتطلب عجزاً حرارياً يفوق ${dailyDeficit.toLocaleString()} سعرة حرارية يومياً (إجمالي ${totalDeficit.toLocaleString()} سعرة)، وهو أمر مستحيل بيولوجياً ويشكل خطراً صحياً بالغاً. الحد الأدنى الآمن علمياً هو ${safeMinDays} يوماً (بمعدل 0.5 إلى 1 كجم أسبوعياً).`
            : `You cannot lose ${kgToLose} kg in ${params.targetDurationDays} days; this requires an impossible daily deficit of ${dailyDeficit.toLocaleString()} kcal (${totalDeficit.toLocaleString()} kcal total), which is biologically unachievable and dangerous. The recommended safe minimum is ${safeMinDays} days.`,
        };
      }
      if (params.targetDurationDays < safeMinDays * 0.75) {
        return {
          is_realistic: false,
          severity: "warning",
          recommended_min_days: safeMinDays,
          warning_message: isAr
            ? `المدة المحددة (${params.targetDurationDays} يوماً) مضغوطة جداً وغير واقعية لخسارة ${kgToLose} كجم، وقد تسبب إجهاداً شديداً وفقداناً للكتلة العضلية. يُنصح بمدة لا تقل عن ${safeMinDays} يوماً لضمان استدامة النتائج وصحتك.`
            : `The selected timeline (${params.targetDurationDays} days) is overly aggressive for losing ${kgToLose} kg and may cause muscle loss and burnout. A sustainable timeline is at least ${safeMinDays} days.`,
        };
      }
    }

    // 2. High ratio compression vs initial plan days (e.g. originally 90-120 days, pulled down to <= 14 days)
    const benchmarkInitialDays = params.initialPlanDays || params.previousDurationDays || 90;
    if (benchmarkInitialDays >= 45 && params.targetDurationDays <= 14) {
      const minRecommended = Math.max(30, Math.round(benchmarkInitialDays * 0.5));
      return {
        is_realistic: false,
        severity: "impossible",
        recommended_min_days: minRecommended,
        warning_message: isAr
          ? `لا يمكنك تحقيق هذا الهدف خلال ${params.targetDurationDays} أيام؛ لأن هذا المسار تم تصميمه كرحلة تراكمية (${benchmarkInitialDays} يوماً). ضغطه في ${params.targetDurationDays} أيام فقط غير قابل للتنفيذ عملياً وسيؤدي إلى الإحباط والانقطاع.`
          : `This goal was designed as a ${benchmarkInitialDays}-day journey. Compressing it into ${params.targetDurationDays} days is unfeasible and leads to quick burnout.`,
      };
    }

    return {
      is_realistic: true,
      severity: "realistic",
      warning_message: "",
      recommended_min_days: params.targetDurationDays,
    };
  }

  /**
   * Deterministic local fallback rebalance algorithm. Ensures that plan rebalance
   * works 100% reliably even when AI is unavailable or quotas are met.
   */
  static rebalancePlanLocally(params: {
    goalTitle: string;
    aiSummary?: string;
    targetDurationDays: number;
    previousDurationDays?: number;
    initialPlanDays?: number;
    difficulty: "easy" | "medium" | "hard" | "expert" | "legendary";
    targetPoints: number;
    tasks: Array<any>;
    language?: "ar" | "en";
  }) {
    const isAr = (params.language || "ar") === "ar";
    const tierDailyMinutes: Record<string, number> = {
      easy: 20,
      medium: 35,
      hard: 60,
      expert: 90,
      legendary: 120,
    };
    const tierWeightRange: Record<string, number> = {
      easy: 1,
      medium: 2,
      hard: 3,
      expert: 4,
      legendary: 5,
    };
    const tierNamesAr: Record<string, string> = {
      easy: "سهل",
      medium: "متوسط",
      hard: "صعب",
      expert: "خبير",
      legendary: "أسطوري",
    };

    const realismCheck = GeminiService.evaluateRealismLocally(params);

    const targetMinutes = tierDailyMinutes[params.difficulty] || 35;
    const baseWeight = tierWeightRange[params.difficulty] || 2;
    const prevDays = params.previousDurationDays || params.targetDurationDays;
    const ratio = prevDays > 0 ? prevDays / params.targetDurationDays : 1;

    const updatedMains = (params.tasks || []).map((main: any, mIdx: number) => {
      const subs = Array.isArray(main.subtasks) ? main.subtasks : [];
      const subCount = Math.max(1, subs.length);
      const allocatedMinutesPerSub = Math.max(5, Math.round(targetMinutes / subCount));

      const updatedSubs = subs.map((sub: any, sIdx: number) => {
        const currentMins = Number(sub.time_required_minutes) || allocatedMinutesPerSub;
        const adjustedMins = Math.max(5, Math.min(180, Math.round(currentMins * (ratio > 1 ? Math.min(1.5, ratio) : Math.max(0.7, ratio)))));
        const finalMins = params.difficulty === "easy" ? Math.min(25, adjustedMins) : Math.max(allocatedMinutesPerSub, adjustedMins);

        let criteria = (sub.completion_criteria || "").trim();
        if (!criteria) {
          criteria = isAr
            ? (ratio >= 1.4 ? `إنجاز مكثف لمتطلبات الخطوة بتركيز لمدة لا تقل عن ${finalMins} دقيقة لمواكبة المدة المضغوطة (${params.targetDurationDays} يوم).` : `إتمام متطلبات الخطوة بتركيز لمدة لا تقل عن ${finalMins} دقيقة.`)
            : (ratio >= 1.4 ? `Intensive execution of subtask requirements with focus for at least ${finalMins} minutes (${params.targetDurationDays}-day pace).` : `Complete subtask requirements with focus for at least ${finalMins} minutes.`);
        } else if (ratio >= 1.4 && !criteria.includes("مكثف") && !criteria.includes("intensive")) {
          criteria = isAr
            ? `${criteria} (إنجاز مكثف لمواكبة المدة المضغوطة ${params.targetDurationDays} يوم)`
            : `${criteria} (intensive pace for ${params.targetDurationDays}-day target)`;
        }

        return {
          id: sub.id || `s_${mIdx + 1}_${sIdx + 1}`,
          task: sub.task || `Subtask ${sIdx + 1}`,
          frequency: sub.frequency === "weekly" ? "weekly" : "daily",
          impact_weight: Math.max(1, Math.min(5, baseWeight + (sIdx % 2))),
          time_required_minutes: finalMins,
          completion_criteria: criteria,
        };
      });

      return {
        id: main.id || `m_${mIdx + 1}`,
        task: main.task || `Main Task ${mIdx + 1}`,
        frequency: main.frequency === "weekly" ? "weekly" : "daily",
        impact_weight: Math.max(2, Math.min(10, baseWeight * 2)),
        completion_criteria: main.completion_criteria || (isAr ? `التحقق من إتمام كافة الخطوات بدقة لضمان التقدم نحو مستهدف ${params.targetPoints} نقطة.` : `Verify completion of all subtasks toward target ${params.targetPoints} points.`),
        subtasks: updatedSubs,
      };
    });

    const diffAr = tierNamesAr[params.difficulty] || params.difficulty;
    const auditSummary = !realismCheck.is_realistic
      ? realismCheck.warning_message
      : isAr
        ? `تمت المراجعة المنطقية وإعادة الموازنة بنجاح: تم ضبط معايير الإنجاز اليومية لتلائم مدة ${params.targetDurationDays} يوماً بمستوى "${diffAr}"، وإعادة معايرة الأوقات المطلوبة (${targetMinutes} دقيقة يومياً) وتوزيع أوزان النقاط لتحقيق مستهدف ${params.targetPoints.toLocaleString()} نقطة بواقعية واستدامة.`
        : `Logical plan audit & rebalance complete: Daily completion criteria updated for ${params.targetDurationDays} days at "${params.difficulty}" tier. Calibrated required daily time (~${targetMinutes} mins/day) and impact weights to realistically achieve ${params.targetPoints.toLocaleString()} points.`;

    return {
      status: "ok" as const,
      audit_summary: auditSummary,
      recommended_daily_time_minutes: targetMinutes,
      realism_check: realismCheck,
      main_tasks: updatedMains,
    };
  }

  /**
   * The two-minute version of a task: the smallest act that still counts as
   * showing up. Used on days the full task is not going to happen — keeping the
   * chain alive costs less than rebuilding it.
   */
  static async generateMiniVersion(
    taskDescription: string,
    goalTitle: string,
    language: "ar" | "en" = "ar",
  ): Promise<string> {
    const safetyCheck = GeminiService.checkContentSafety(
      `${taskDescription}\n${goalTitle}`,
    );
    if (!safetyCheck.isSafe) return "";

    const systemPrompt = `
SYSTEM ROLE:
You shrink a daily task down to a version that takes about two minutes.

RULES:
- The mini version must be a real, honest step toward the same task, never a
  placeholder like "think about it" or "plan to do it later".
- It must be finishable in roughly two minutes by someone with no energy left.
- One sentence. No preamble, no explanation, no quotes, no markdown.
- Answer in ${language === "ar" ? "Arabic" : "English"} only.

EXAMPLES:
- "Write 3 JavaScript functions" -> "Read one function's code and understand it"
- "Run 5 km" -> "Put your shoes on and walk to the end of the street"
`;

    const userPrompt = `GOAL: ${goalTitle}\nTASK: ${taskDescription}`;

    try {
      const response = await GeminiService.callWithRetry(
        {
          systemInstruction: { parts: [{ text: systemPrompt }], role: "system" },
        },
        { role: "user", parts: [{ text: userPrompt }] },
      );

      return (response.text || "").trim().replace(/^["'\u201c\u201d]|["'\u201c\u201d]$/g, "");
    } catch (error) {
      console.error("Gemini generateMiniVersion Error:", error);
      throw error;
    }
  }

  /**
   * Generates a concrete, measurable definition of done (معيار الإنجاز)
   * for a task based on its context and goal.
   */
  static async generateCompletionCriteria(
    taskDescription: string,
    goalTitle: string,
    taskType: "main" | "sub" = "sub",
    language: "ar" | "en" = "ar",
  ): Promise<string> {
    const safetyCheck = GeminiService.checkContentSafety(
      `${taskDescription}\n${goalTitle}`,
    );
    if (!safetyCheck.isSafe) return "";

    const isArabic = language === "ar";
    const systemPrompt = isArabic
      ? `أنت خبير صياغة "معايير الإنجاز" (Definition of Done) في تطبيق METRIX.
دورك: كتابة معيار إنجاز ملموس، ذكي، ومحدد جداً لهذه المهمة بحيث يعرف المستخدم بالضبط وبدون تردد متى يعتبر المهمة منجزة اليوم.

القواعد الصارمة:
1. معيار الإنجاز يجب أن يكون واضحاً وقابلاً للقياس (مثال: عدد صفحات، دقائق، ناتج ملموس ككود أو تسجيل صوتي أو حل مسائل).
2. ابتعد تماماً عن الكليشيهات والعموميات مثل "إكمال المهمة بنجاح" أو "القيام بالواجب".
3. يجب أن تكون الصياغة موجزة ودقيقة في جملة واحدة واضحة ومباشرة (10 إلى 25 كلمة).
4. أجب بالنص المباشر فقط لمعيار الإنجاز دون أي مقدمات أو علامات تنصيص أو شروحات إضافية.`
      : `You are an expert at writing concrete, measurable "Definitions of Done" / Completion Criteria in METRIX.
Your role: Write a crisp, tangible, measurable completion criteria for this task so the user knows with 100% clarity when the task is done today.

Strict rules:
1. Must be measurable and concrete (e.g. quantity, specific output, minutes, deliverable).
2. Avoid vague statements like "finish successfully" or "do the task".
3. Keep it brief: a single clear, actionable sentence (10-25 words).
4. Output ONLY the criteria text directly without quotes, introductions, or markdown formatting.`;

    const userPrompt = isArabic
      ? `الهدف العام: "${goalTitle}"\nنوع المهمة: ${taskType === "main" ? "مسار رئيسي" : "مهمة فرعية"}\nعنوان المهمة: "${taskDescription}"\n\nاكتب معيار الإنجاز المحدد والمباشر:`
      : `Goal: "${goalTitle}"\nTask Type: ${taskType}\nTask Title: "${taskDescription}"\n\nWrite the concise completion criteria:`;

    try {
      const response = await GeminiService.callWithRetry(
        {
          systemInstruction: { parts: [{ text: systemPrompt }], role: "system" },
        },
        { role: "user", parts: [{ text: userPrompt }] },
      );

      return (response.text || "").trim().replace(/^["'\u201c\u201d]|["'\u201c\u201d]$/g, "");
    } catch (error) {
      console.error("Gemini generateCompletionCriteria Error:", error);
      throw error;
    }
  }

  /**
   * End-of-week report built from what actually happened, not from the plan.
   * The value is in the patterns — which weekday collapses, which hour works —
   * because those are the things a user cannot see in their own data.
   */
  static async generateWeeklyReview(
    goalContext: {
      title: string;
      ai_summary?: string;
      current_points?: number;
      target_points?: number;
    },
    weekStart: string,
    stats: {
      completedCount: number;
      skippedCount: number;
      loggedDays: number;
      pointsThisWeek: number;
      skipReasons: Record<string, number>;
      byWeekday: Record<string, { completed: number; skipped: number }>;
      byHour: Record<string, number>;
      topTasks: { label: string; completed: number }[];
      strugglingTasks: { label: string; skipped: number }[];
      projection?: { projectedDate: string | null; deltaDays: number | null };
    },
    language: "ar" | "en" = "ar",
  ): Promise<WeeklyReviewResult> {
    const systemPrompt = `
SYSTEM ROLE:
You are a progress analyst inside METRIX. You are handed one week of a user's
real activity data and you write a short, honest review of it.

RULES:
- Ground every sentence in the numbers you were given. Never invent a fact.
- Name patterns the user cannot see themselves (a weekday that collapses, an
  hour that works, a reason that keeps repeating). If the data does not support
  a pattern, return fewer patterns rather than a vague one.
- Be direct, not encouraging-for-the-sake-of-it. A bad week described plainly
  is more useful than a bad week dressed up.
- Answer in ${language === "ar" ? "Arabic" : "English"} only.

RETURN STRICT JSON:
{
  "summary": "2-3 sentences on what actually happened this week",
  "patterns": [
    { "label": "short pattern name", "detail": "one sentence, cites the data" }
  ],
  "suggestion": "one concrete adjustment for next week, one sentence"
}
- "patterns": at most 3 entries, and only ones the data supports.
`;

    const userPrompt = `
GOAL: ${goalContext.title}
SUMMARY: ${goalContext.ai_summary || "-"}
POINTS: ${goalContext.current_points ?? 0} / ${goalContext.target_points ?? 0}
WEEK STARTING: ${weekStart}

WEEK DATA:
${JSON.stringify(stats, null, 2)}
`;

    try {
      const response = await GeminiService.callWithRetry(
        {
          responseMimeType: "application/json",
          systemInstruction: { parts: [{ text: systemPrompt }], role: "system" },
        },
        { role: "user", parts: [{ text: userPrompt }] },
        (text: string) => extractJson(text),
      );

      const responseText = response.text || "";
      if (!responseText) throw new Error("Empty response from Gemini API");

      const parsed = extractJson(responseText);
      return {
        summary: typeof parsed?.summary === "string" ? parsed.summary : "",
        patterns: Array.isArray(parsed?.patterns)
          ? parsed.patterns
              .filter((p: any) => p && typeof p.label === "string")
              .slice(0, 3)
              .map((p: any) => ({
                label: String(p.label),
                detail: typeof p.detail === "string" ? p.detail : "",
              }))
          : [],
        suggestion:
          typeof parsed?.suggestion === "string" ? parsed.suggestion : "",
      };
    } catch (error) {
      console.error("Gemini generateWeeklyReview Error:", error);
      throw error;
    }
  }
}
