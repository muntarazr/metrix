import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createRequestClient } from "@/utils/supabase/server-request";
import { requireUser } from "@/lib/api-auth";
import { GeminiService, GeminiQuotaError, extractJson } from "@/lib/gemini";
import { requireAiQuota } from "@/lib/ai-quota";
import { getErrorMessage } from "@/lib/utils";
import {
  buildMilestoneImagePrompt,
  buildMilestonePromptContext,
} from "@/lib/milestone-image-prompt";

type MilestoneTier = "minor" | "major" | "legendary";

const ALLOWED_TIERS: MilestoneTier[] = ["minor", "major", "legendary"];
const ALLOWED_ASPECT_RATIOS = ["1:1", "4:3", "16:9", "9:16", "3:4"] as const;
const ALLOWED_ACCENT_COLORS = [
  "emerald",
  "violet",
  "amber",
  "rose",
  "sky",
  "slate",
] as const;
type MilestoneAspectRatio = (typeof ALLOWED_ASPECT_RATIOS)[number];
type Language = "ar" | "en";

const MAX_MILESTONE_NAME_LENGTH = 120;
const MAX_USER_INPUT_LENGTH = 6_000;
const MAX_TASK_DESCRIPTIONS = 80;
const MAX_TASK_DESCRIPTION_LENGTH = 500;
const MIN_TARGET_POINTS = 100;
const MAX_TARGET_POINTS = 10_000_000;
const MAX_DAILY_CAP = 100_000;

type CreateMilestonePayload = {
  goalId: string;
  userInput: string;
  milestoneName: string;
  targetPoints: number;
  dailyCap: number;
  aspectRatio: MilestoneAspectRatio;
  tasksDescriptions: string[];
  goalContext: Record<string, unknown>;
  language: Language;
};

type DbErrorLike = {
  code?: string;
  message?: string;
  details?: string;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function parsePositiveNumber(value: unknown, max: number, min = 0) {
  const parsed = typeof value === "string" ? Number(value) : value;
  if (!isFiniteNumber(parsed) || parsed <= min || parsed > max) return null;
  return parsed;
}

function trimString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) return null;
  return trimmed;
}

function normalizeLanguage(value: unknown): Language {
  return value === "en" ? "en" : "ar";
}

function normalizeAspectRatio(value: unknown): MilestoneAspectRatio {
  return typeof value === "string" &&
    ALLOWED_ASPECT_RATIOS.includes(value as MilestoneAspectRatio)
    ? (value as MilestoneAspectRatio)
    : "4:3";
}

function normalizeTaskDescriptions(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, MAX_TASK_DESCRIPTIONS)
    .map((item) => item.slice(0, MAX_TASK_DESCRIPTION_LENGTH));
}

function normalizeGoalContext(value: unknown) {
  if (!isRecord(value)) return {};

  const safeContext: Record<string, unknown> = {};
  const allowedKeys = [
    "title",
    "description",
    "ai_summary",
    "domain",
    "current_points",
    "target_points",
    "total_logs",
    "days_since_start",
  ];

  for (const key of allowedKeys) {
    const entry = value[key];
    if (typeof entry === "string") {
      safeContext[key] = entry.slice(0, 1_000);
    } else if (isFiniteNumber(entry)) {
      safeContext[key] = entry;
    }
  }

  return safeContext;
}

function validateCreatePayload(
  body: unknown,
):
  | { ok: true; value: CreateMilestonePayload }
  | { ok: false; response: NextResponse } {
  if (!isRecord(body)) {
    return { ok: false, response: badRequest("Invalid JSON payload") };
  }

  const goalId = trimString(body.goalId, 80);
  if (!goalId) {
    return { ok: false, response: badRequest("Missing or invalid goalId") };
  }

  const userInput = trimString(body.userInput, MAX_USER_INPUT_LENGTH);
  if (!userInput) {
    return { ok: false, response: badRequest("Missing or invalid userInput") };
  }

  const milestoneName = trimString(
    body.milestoneName,
    MAX_MILESTONE_NAME_LENGTH,
  );
  if (!milestoneName) {
    return {
      ok: false,
      response: badRequest("Missing or invalid milestoneName"),
    };
  }

  const targetPoints = parsePositiveNumber(
    body.targetPoints,
    MAX_TARGET_POINTS,
    MIN_TARGET_POINTS - 1,
  );
  if (targetPoints === null) {
    return {
      ok: false,
      response: badRequest(
        `targetPoints must be a finite number of at least ${MIN_TARGET_POINTS}`,
      ),
    };
  }

  const dailyCap = parsePositiveNumber(body.dailyCap, MAX_DAILY_CAP);
  if (dailyCap === null) {
    return {
      ok: false,
      response: badRequest("dailyCap must be a positive finite number"),
    };
  }

  return {
    ok: true,
    value: {
      goalId,
      userInput,
      milestoneName,
      targetPoints,
      dailyCap,
      aspectRatio: normalizeAspectRatio(body.aspectRatio),
      tasksDescriptions: normalizeTaskDescriptions(body.tasksDescriptions),
      goalContext: normalizeGoalContext(body.goalContext),
      language: normalizeLanguage(body.language),
    },
  };
}

function isRpcMissing(error: DbErrorLike) {
  return error.code === "PGRST202";
}

function getRpcHttpStatus(error: DbErrorLike) {
  if (isRpcMissing(error)) return 501;
  if (error.message?.includes("not_a_milestone")) return 400;
  if (error.message?.includes("goal_not_found_or_access_denied")) return 404;
  if (error.message?.includes("log_not_found_or_access_denied")) return 404;
  return 500;
}

function getRpcClientMessage(error: DbErrorLike, fallback: string) {
  if (isRpcMissing(error)) {
    return "Required milestone database migration is not installed.";
  }

  if (error.message?.includes("not_a_milestone")) {
    return "Log is not a milestone.";
  }

  if (error.message?.includes("goal_not_found_or_access_denied")) {
    return "Goal not found or access denied.";
  }

  if (error.message?.includes("log_not_found_or_access_denied")) {
    return "Log not found or access denied.";
  }

  return fallback;
}

function getTierScorePolicy(tier: unknown) {
  switch (tier) {
    case "minor":
      return {
        tier: "minor" as const,
        fallbackMultiplier: 3,
        minMultiplier: 3,
        maxMultiplier: 4,
        maxPercentage: 0.05,
      };
    case "major":
      return {
        tier: "major" as const,
        fallbackMultiplier: 5,
        minMultiplier: 5,
        maxMultiplier: 9,
        maxPercentage: 0.1,
      };
    case "legendary":
      return {
        tier: "legendary" as const,
        fallbackMultiplier: 10,
        minMultiplier: 10,
        maxMultiplier: 10,
        maxPercentage: 0.2,
      };
    default:
      return {
        tier: "minor" as const,
        fallbackMultiplier: 3,
        minMultiplier: 3,
        maxMultiplier: 4,
        maxPercentage: 0.05,
      };
  }
}

async function removeMilestoneImage(
  supabase: Awaited<ReturnType<typeof createRequestClient>>,
  imageUrl: string | null,
) {
  if (!imageUrl) return;

  try {
    const urlObj = new URL(imageUrl);
    const filename = urlObj.pathname.split("/").pop();
    if (!filename) return;

    const { error } = await supabase.storage
      .from("milestones")
      .remove([filename]);
    if (error) {
      console.error("Failed to remove milestone image from storage:", error);
    }
  } catch (error) {
    console.error("Failed to parse or remove milestone image:", error);
  }
}

type SuggestedMilestoneDto = {
  id: string;
  name: string;
  description: string;
  shortDescription: string;
  tier: MilestoneTier;
  points: number;
  accentColor: (typeof ALLOWED_ACCENT_COLORS)[number];
};

function computeScoreForTier(
  tier: MilestoneTier,
  multiplier: number | undefined,
  dailyCap: number,
  targetPoints: number,
) {
  const policy = getTierScorePolicy(tier);
  const safeMult =
    typeof multiplier === "number" && Number.isFinite(multiplier)
      ? clamp(multiplier, policy.minMultiplier, policy.maxMultiplier)
      : policy.fallbackMultiplier;
  const rawScore = Math.floor(safeMult * Math.max(10, dailyCap));
  const maxScore = Math.max(25, Math.floor(policy.maxPercentage * Math.max(200, targetPoints)));
  return Math.max(15, Math.min(rawScore, maxScore));
}

function buildFallbackSuggestions(params: {
  goalTitle: string;
  taskDescriptions: string[];
  dailyCap: number;
  targetPoints: number;
  language: Language;
  count: number;
  excludeNames: Set<string>;
  lastRejectionReason?: string;
}): SuggestedMilestoneDto[] {
  const {
    goalTitle,
    taskDescriptions,
    dailyCap,
    targetPoints,
    language,
    count,
    excludeNames,
    lastRejectionReason,
  } = params;
  const isAr = language === "ar";
  const primaryTask = taskDescriptions[0] || goalTitle;
  const secondaryTask = taskDescriptions[1] || taskDescriptions[0] || goalTitle;
  const tertiaryTask = taskDescriptions[2] || secondaryTask;

  const reasonLower = (lastRejectionReason || "").toLowerCase();
  const wantsSimpler =
    reasonLower.includes("صعب") ||
    reasonLower.includes("وقت") ||
    reasonLower.includes("كبير") ||
    reasonLower.includes("طاقتي") ||
    reasonLower.includes("hard") ||
    reasonLower.includes("time");

  const pool: Array<{
    name: string;
    description: string;
    shortDescription: string;
    tier: MilestoneTier;
    multiplier: number;
    accentColor: (typeof ALLOWED_ACCENT_COLORS)[number];
  }> = isAr
    ? [
        {
          name: wantsSimpler
            ? `جلسة تركيز مضاعفة: ${primaryTask.slice(0, 32)}`
            : `تحدي الإنجاز المكثّف: ${primaryTask.slice(0, 32)}`,
          description: wantsSimpler
            ? `إتمام 3 أضعاف المعيار المعتاد في "${primaryTask}" خلال جلسة تركيز واحدة متواصلة دون انقطاع وتوثيق النتيجة.`
            : `إنجاز جلسة عميقة تعادل 4 أضعاف الجهد اليومي المعتاد في "${primaryTask}" مع تطبيق عملي كامل.`,
          shortDescription: wantsSimpler
            ? `جلسة تركيز متواصلة تعادل 3 أضعاف المعيار اليومي في ${primaryTask.slice(0, 36)}.`
            : `قفزة عملية تعادل 4 أضعاف الجهد المعتاد في ${primaryTask.slice(0, 36)}.`,
          tier: "minor",
          multiplier: wantsSimpler ? 3 : 4,
          accentColor: "emerald",
        },
        {
          name: `مشروع تطبيقي متكامل في ${secondaryTask.slice(0, 28)}`,
          description: `بناء أو إنهاء مخرج عملي ملموس يجمع مهارات "${secondaryTask}" ويتجاوز المهام اليومية المعتادة بـ 5 أضعاف.`,
          shortDescription: `إنهاء مخرج تطبيقي كامل يدمج مهارات ${secondaryTask.slice(0, 36)} بجهد استثنائي.`,
          tier: wantsSimpler ? "minor" : "major",
          multiplier: wantsSimpler ? 3.5 : 6,
          accentColor: "violet",
        },
        {
          name: `ماراثون التقدم السريع: ${tertiaryTask.slice(0, 28)}`,
          description: `تخصيص يوم ذروة لإنجاز تراكمي يغطي "${primaryTask}" و"${tertiaryTask}" معاً بمعيار جودة عالٍ وبدون تشتت.`,
          shortDescription: `يوم ذروة يجمع بين ${primaryTask.slice(0, 24)} و${tertiaryTask.slice(0, 24)} بمعيار مضاعف.`,
          tier: "major",
          multiplier: 5,
          accentColor: "amber",
        },
        {
          name: `اختبار عملي شامل لهدف ${goalTitle.slice(0, 28)}`,
          description: `تقييم وتطبيق شامل لما تعلمته في "${goalTitle}" عبر تحدٍ عملي حقيقي يثبت إتقانك للمرحلة الحالية.`,
          shortDescription: `اجتياز تحدٍ تطبيقي شامل يثبت إتقان المرحلة الحالية من الهدف.`,
          tier: "minor",
          multiplier: 4,
          accentColor: "sky",
        },
        {
          name: `القفزة الكبرى في ${goalTitle.slice(0, 30)}`,
          description: `إنجاز مرحلة مفصلية كاملة من "${goalTitle}" تعادل أسبوعاً كاملاً من العمل المكثف في مخرج واحد متقن.`,
          shortDescription: `إتمام مرحلة مفصلية تعادل أسبوع عمل مكثف ضمن مسار الهدف.`,
          tier: "legendary",
          multiplier: 10,
          accentColor: "emerald",
        },
      ]
    : [
        {
          name: wantsSimpler
            ? `3x Deep Focus Sprint: ${primaryTask.slice(0, 32)}`
            : `Intensive Breakthrough: ${primaryTask.slice(0, 32)}`,
          description: wantsSimpler
            ? `Complete 3x your standard daily volume on "${primaryTask}" in one uninterrupted deep-focus session.`
            : `Execute a deep practical session equal to 4x your normal daily effort in "${primaryTask}".`,
          shortDescription: `Complete a 3x–4x deep focus sprint on ${primaryTask.slice(0, 36)}.`,
          tier: "minor",
          multiplier: wantsSimpler ? 3 : 4,
          accentColor: "emerald",
        },
        {
          name: `Applied Milestone Project: ${secondaryTask.slice(0, 28)}`,
          description: `Deliver a concrete, finished output combining your skills in "${secondaryTask}" at 5x normal daily effort.`,
          shortDescription: `Ship a tangible applied project in ${secondaryTask.slice(0, 36)}.`,
          tier: wantsSimpler ? "minor" : "major",
          multiplier: wantsSimpler ? 3.5 : 6,
          accentColor: "violet",
        },
        {
          name: `Combined Mastery Sprint: ${tertiaryTask.slice(0, 28)}`,
          description: `Complete a high-output milestone combining "${primaryTask}" and "${tertiaryTask}" with measurable results.`,
          shortDescription: `High-output sprint combining ${primaryTask.slice(0, 24)} and ${tertiaryTask.slice(0, 24)}.`,
          tier: "major",
          multiplier: 5,
          accentColor: "amber",
        },
        {
          name: `Practical Mastery Benchmark: ${goalTitle.slice(0, 26)}`,
          description: `Complete a real-world benchmark challenge for "${goalTitle}" proving mastery of your current phase.`,
          shortDescription: `Pass a real-world benchmark proving mastery of the current phase.`,
          tier: "minor",
          multiplier: 4,
          accentColor: "sky",
        },
      ];

  const filtered = pool.filter((item) => !excludeNames.has(item.name.trim().toLowerCase()));
  const chosen = (filtered.length > 0 ? filtered : pool).slice(0, count);

  return chosen.map((item, idx) => ({
    id: `suggested-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
    name: item.name,
    description: item.description,
    shortDescription: item.shortDescription,
    tier: item.tier,
    points: computeScoreForTier(item.tier, item.multiplier, dailyCap, targetPoints),
    accentColor: item.accentColor,
  }));
}

async function handleSuggestMilestones(
  req: NextRequest,
  body: Record<string, unknown>,
) {
  const goalId = trimString(body.goalId, 80);
  if (!goalId) return badRequest("Missing or invalid goalId");

  const language = normalizeLanguage(body.language);
  const requestedCount = clamp(
    typeof body.count === "number" && Number.isFinite(body.count)
      ? Math.floor(body.count)
      : 3,
    1,
    4,
  );

  const rejectedSuggestions = Array.isArray(body.rejectedSuggestions)
    ? body.rejectedSuggestions
        .filter((item): item is Record<string, unknown> => isRecord(item))
        .map((item) => ({
          name: typeof item.name === "string" ? item.name.slice(0, 140) : "",
          description:
            typeof item.description === "string"
              ? item.description.slice(0, 300)
              : "",
          reason:
            typeof item.reason === "string" ? item.reason.slice(0, 300) : "",
        }))
        .filter((item) => item.name || item.reason)
        .slice(-10)
    : [];

  const currentNames = Array.isArray(body.currentNames)
    ? body.currentNames
        .filter((item): item is string => typeof item === "string")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 20)
    : [];

  const auth = await requireUser(req);
  if (auth.error) return auth.error;
  const { supabase, user } = auth;

  const [goalRes, tasksRes, logsRes] = await Promise.all([
    supabase
      .from("goals")
      .select("id, title, ai_summary, target_points, current_points")
      .eq("id", goalId)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("sub_layers")
      .select("task_description, impact_weight, frequency, completion_criteria, task_type")
      .eq("goal_id", goalId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("daily_logs")
      .select("breakdown")
      .eq("goal_id", goalId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (goalRes.error || !goalRes.data) {
    return NextResponse.json(
      { error: "Goal not found or access denied" },
      { status: 404 },
    );
  }

  const goal = goalRes.data;
  const tasks = tasksRes.data || [];
  const taskDescriptions = tasks
    .map((t) => {
      const desc = typeof t.task_description === "string" ? t.task_description.trim() : "";
      const criteria =
        typeof t.completion_criteria === "string" && t.completion_criteria.trim()
          ? ` (${t.completion_criteria.trim()})`
          : "";
      return desc ? `${desc}${criteria}` : "";
    })
    .filter(Boolean);

  const dailyCap = Math.max(
    15,
    tasks.reduce((sum, t) => sum + (Number(t.impact_weight) || 0), 0) || 30,
  );
  const targetPoints = Math.max(200, Number(goal.target_points) || 1500);

  const completedMilestoneNames: string[] = [];
  for (const row of logsRes.data || []) {
    if (isRecord(row.breakdown) && isRecord(row.breakdown.milestone)) {
      const mName = row.breakdown.milestone.name;
      if (typeof mName === "string" && mName.trim()) {
        completedMilestoneNames.push(mName.trim());
      }
    }
  }

  const excludeNames = new Set<string>(
    [
      ...completedMilestoneNames,
      ...currentNames,
      ...rejectedSuggestions.map((r) => r.name),
    ].map((s) => s.toLowerCase()),
  );

  const lastRejection =
    rejectedSuggestions.length > 0
      ? rejectedSuggestions[rejectedSuggestions.length - 1]
      : undefined;

  try {
    const quotaResponse = await requireAiQuota(
      supabase,
      "gemini",
      "milestone_evaluate",
    );
    if (quotaResponse) {
      return NextResponse.json({
        status: "ok",
        suggestions: buildFallbackSuggestions({
          goalTitle: goal.title,
          taskDescriptions,
          dailyCap,
          targetPoints,
          language,
          count: requestedCount,
          excludeNames,
          lastRejectionReason: lastRejection?.reason,
        }),
      });
    }

    const systemPrompt = `
You are an expert Achievement & Milestone Designer for a goal-tracking app.
Your job is to propose ${requestedCount} concrete, realistic, and motivating "Big Achievements" (Milestones) that the user can actually do and claim on their goal.

CRITICAL RULES:
1. CONSISTENCY WITH GOAL & TASKS:
   - Every suggested milestone MUST be directly derived from the user's Goal Title, AI Summary, and Regular Tasks.
   - A milestone is a special achievement worth 3x to 8x a normal daily task (e.g., a focused sprint, a tangible mini-project, a practical test, or a deep synthesis session), NOT something impossible or unrelated.
2. RESPECT REJECTION REASONS (MOST IMPORTANT):
   - If the user rejected previous suggestions and gave a reason (e.g. "too hard right now", "takes too much time", "not aligned with my current level", "already did this"), you MUST adapt immediately!
   - If they said a milestone was too big/hard, propose smaller, more approachable, well-scoped milestones ('minor' tier, 3x-4x effort) that feel immediately doable.
   - NEVER repeat any milestone from COMPLETED_MILESTONES, CURRENTLY_SHOWN_MILESTONES, or REJECTED_MILESTONES.
3. TIERS & MULTIPLIERS:
   - "minor": 3x-4x daily effort (approachable big win)
   - "major": 5x-7x daily effort (significant milestone)
   - "legendary": 8x-10x daily effort (major phase breakthrough)
4. LANGUAGE:
   - Respond entirely in ${language === "ar" ? "clear, natural Arabic" : "English"}.

OUTPUT JSON ONLY:
{
  "suggestions": [
    {
      "name": "string (short, inspiring, concrete title, max 55 chars)",
      "description": "string (clear, actionable criteria of what to do to claim this milestone, 1-2 sentences)",
      "short_description": "string (concise 1-sentence summary of the achievement, max 16 words)",
      "tier": "minor" | "major" | "legendary",
      "suggested_multiplier": number,
      "accent_color": "emerald" | "violet" | "amber" | "sky"
    }
  ]
}
`;

    const userPrompt = `
GOAL TITLE: ${goal.title}
GOAL SUMMARY: ${goal.ai_summary || ""}
CURRENT PROGRESS: ${goal.current_points || 0} / ${targetPoints} points

REGULAR TASKS:
${JSON.stringify(taskDescriptions.slice(0, 25), null, 2)}

COMPLETED MILESTONES (DO NOT REPEAT):
${JSON.stringify(completedMilestoneNames, null, 2)}

CURRENTLY SHOWN MILESTONES (DO NOT REPEAT):
${JSON.stringify(currentNames, null, 2)}

REJECTED MILESTONES & USER REASONS (LEARN FROM THESE & ADAPT):
${JSON.stringify(rejectedSuggestions, null, 2)}
`;

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

    const parsed = extractJson(response.text || "");
    const rawList = Array.isArray(parsed?.suggestions) ? parsed.suggestions : [];

    const suggestions: SuggestedMilestoneDto[] = rawList
      .filter((item: unknown): item is Record<string, unknown> => isRecord(item))
      .map((item: Record<string, unknown>, idx: number) => {
        const tier: MilestoneTier = ALLOWED_TIERS.includes(
          item.tier as MilestoneTier,
        )
          ? (item.tier as MilestoneTier)
          : "minor";
        const accentColor = ALLOWED_ACCENT_COLORS.includes(
          item.accent_color as (typeof ALLOWED_ACCENT_COLORS)[number],
        )
          ? (item.accent_color as (typeof ALLOWED_ACCENT_COLORS)[number])
          : (["emerald", "violet", "amber", "sky"] as const)[idx % 4];
        const name =
          trimString(item.name, MAX_MILESTONE_NAME_LENGTH) ||
          (language === "ar" ? "إنجاز مقترح" : "Suggested Milestone");
        const description =
          trimString(item.description, 600) ||
          trimString(item.short_description, 240) ||
          name;
        const shortDescription =
          trimString(item.short_description, 240) ||
          (description.length > 120
            ? `${description.slice(0, 120)}…`
            : description);
        const mult = Number(item.suggested_multiplier);

        return {
          id: `suggested-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
          name,
          description,
          shortDescription,
          tier,
          points: computeScoreForTier(tier, mult, dailyCap, targetPoints),
          accentColor,
        };
      })
      .slice(0, requestedCount);

    if (suggestions.length === 0) {
      throw new Error("No valid suggestions returned from AI");
    }

    return NextResponse.json({
      status: "ok",
      suggestions,
    });
  } catch (error) {
    console.warn("Milestone suggest fallback triggered:", error);
    return NextResponse.json({
      status: "ok",
      suggestions: buildFallbackSuggestions({
        goalTitle: goal.title,
        taskDescriptions,
        dailyCap,
        targetPoints,
        language,
        count: requestedCount,
        excludeNames,
        lastRejectionReason: lastRejection?.reason,
      }),
    });
  }
}

async function handleClaimSuggestedMilestone(
  req: NextRequest,
  body: Record<string, unknown>,
) {
  const goalId = trimString(body.goalId, 80);
  if (!goalId) return badRequest("Missing or invalid goalId");

  const milestoneName = trimString(body.name, MAX_MILESTONE_NAME_LENGTH);
  if (!milestoneName) return badRequest("Missing or invalid milestone name");

  const description =
    trimString(body.description, MAX_USER_INPUT_LENGTH) || milestoneName;
  const shortDescription =
    trimString(body.shortDescription, 240) ||
    (description.length > 120 ? `${description.slice(0, 120)}…` : description);

  const tier: MilestoneTier = ALLOWED_TIERS.includes(body.tier as MilestoneTier)
    ? (body.tier as MilestoneTier)
    : "minor";
  const accentColor = ALLOWED_ACCENT_COLORS.includes(
    body.accentColor as (typeof ALLOWED_ACCENT_COLORS)[number],
  )
    ? (body.accentColor as (typeof ALLOWED_ACCENT_COLORS)[number])
    : "emerald";
  const language = normalizeLanguage(body.language);

  const auth = await requireUser(req);
  if (auth.error) return auth.error;
  const { supabase, user } = auth;

  const [goalRes, tasksRes] = await Promise.all([
    supabase
      .from("goals")
      .select("id, title, target_points")
      .eq("id", goalId)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("sub_layers")
      .select("impact_weight, task_description")
      .eq("goal_id", goalId),
  ]);

  if (goalRes.error || !goalRes.data) {
    return NextResponse.json(
      { error: "Goal not found or access denied" },
      { status: 404 },
    );
  }

  const goal = goalRes.data;
  const tasks = tasksRes.data || [];
  const dailyCap = Math.max(
    15,
    tasks.reduce((sum, t) => sum + (Number(t.impact_weight) || 0), 0) || 30,
  );
  const targetPoints = Math.max(200, Number(goal.target_points) || 1500);
  const tierPolicy = getTierScorePolicy(tier);
  const maxAllowedScore = Math.max(
    25,
    Math.floor(tierPolicy.maxPercentage * targetPoints),
  );
  const defaultScore = computeScoreForTier(
    tier,
    tierPolicy.fallbackMultiplier,
    dailyCap,
    targetPoints,
  );
  const requestedPoints = Number(body.points);
  const finalScore =
    Number.isFinite(requestedPoints) && requestedPoints > 0
      ? clamp(Math.floor(requestedPoints), 10, maxAllowedScore)
      : defaultScore;

  const tasksDescriptions = tasks
    .map((t) => (typeof t.task_description === "string" ? t.task_description.trim() : ""))
    .filter(Boolean);

  const imagePromptContext = buildMilestonePromptContext({
    goalTitle: goal.title,
    goalContext: { title: goal.title },
    tasksDescriptions,
  });
  const imagePrompt = buildMilestoneImagePrompt({
    ...imagePromptContext,
    milestoneName,
    milestoneDescription: description,
    style: "cinematic",
    aspectRatio: "4:3",
  });

  const coachingMessage =
    language === "ar"
      ? `تم توثيق إنجازك المقترح "${milestoneName}" وإضافة النقاط لهدفك مباشرة!`
      : `Suggested milestone "${milestoneName}" completed and points added to your goal!`;

  const breakdownPayload = {
    version: 2,
    items: [],
    milestone: {
      tier,
      imageUrl: null,
      name: milestoneName,
      description,
      short_description: shortDescription,
      accentColor,
      imageStylePreference: "cinematic",
      imageAspectRatio: "4:3",
      imagePrompt,
      imagePromptContext,
      fromSuggestion: true,
    },
  };

  const { data: rpcData, error: recordError } = await supabase.rpc(
    "record_goal_milestone",
    {
      p_goal_id: goalId,
      p_user_input: description,
      p_ai_score: finalScore,
      p_ai_feedback: coachingMessage,
      p_breakdown: breakdownPayload,
    },
  );

  let logId =
    isRecord(rpcData) && typeof rpcData.log_id === "string"
      ? rpcData.log_id
      : null;

  if (recordError) {
    if (!isRpcMissing(recordError)) {
      const status = getRpcHttpStatus(recordError);
      return NextResponse.json(
        {
          error: "milestone_write_failed",
          message: getRpcClientMessage(
            recordError,
            "Failed to save milestone.",
          ),
        },
        { status },
      );
    }

    const { data: fallbackLogData, error: fallbackLogError } = await supabase
      .from("daily_logs")
      .insert({
        goal_id: goalId,
        user_input: description,
        ai_score: finalScore,
        ai_feedback: coachingMessage,
        breakdown: breakdownPayload,
      })
      .select("id")
      .single();

    if (fallbackLogError) {
      throw fallbackLogError;
    }

    logId = fallbackLogData.id;

    const { error: fallbackPointsError } = await supabase.rpc(
      "increment_goal_points",
      {
        goal_uuid: goalId,
        points_to_add: finalScore,
      },
    );

    if (fallbackPointsError) {
      await supabase.from("daily_logs").delete().eq("id", logId);
      throw fallbackPointsError;
    }
  }

  return NextResponse.json({
    status: "ok",
    tier,
    score: finalScore,
    imageUrl: null,
    message: coachingMessage,
    logId,
    imagePrompt,
  });
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    if (isRecord(rawBody) && rawBody.action === "suggest") {
      return await handleSuggestMilestones(req, rawBody);
    }
    if (isRecord(rawBody) && rawBody.action === "claim_suggested") {
      return await handleClaimSuggestedMilestone(req, rawBody);
    }

    const parsedPayload = validateCreatePayload(rawBody);
    if (!parsedPayload.ok) return parsedPayload.response;

    const {
      goalId,
      userInput,
      milestoneName,
      targetPoints,
      dailyCap,
      aspectRatio,
      tasksDescriptions,
      goalContext,
      language,
    } = parsedPayload.value;

    const auth = await requireUser(req);
    if (auth.error) {
      return auth.error;
    }
    const { supabase, user } = auth;

    // Verify goal ownership
    const { data: goal, error: goalError } = await supabase
      .from("goals")
      .select("id, title")
      .eq("id", goalId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (goalError || !goal) {
      return NextResponse.json(
        { error: "Goal not found or access denied" },
        { status: 404 },
      );
    }

    const quotaResponse = await requireAiQuota(supabase, "gemini", "milestone_evaluate");
    if (quotaResponse) return quotaResponse;

    // 1. Evaluate Milestone
    const evaluation = await GeminiService.evaluateMilestone(
      { ...goalContext, title: goal.title },
      tasksDescriptions,
      userInput,
      language,
    );

    if (!evaluation.is_milestone_accepted) {
      return NextResponse.json(
        {
          success: false,
          status: "rejected",
          is_milestone_accepted: false,
          reason: evaluation.rejection_reason || evaluation.coaching_message,
          rejection_reason: evaluation.rejection_reason,
          message: evaluation.coaching_message,
          coaching_message: evaluation.coaching_message,
        },
        { status: 200 },
      );
    }

    // 2. Math Logic Capping
    const tierPolicy = getTierScorePolicy(evaluation.milestone_tier);
    const rawAiMultiplier = Number(evaluation.suggested_base_points_multiplier);
    const safeMultiplier = Number.isFinite(rawAiMultiplier)
      ? clamp(
          rawAiMultiplier,
          tierPolicy.minMultiplier,
          tierPolicy.maxMultiplier,
        )
      : tierPolicy.fallbackMultiplier;

    const finalMilestoneName =
      milestoneName.trim() !== ""
        ? milestoneName.trim()
        : evaluation.generated_name || "Milestone";
    const calculatedScore = Math.floor(safeMultiplier * dailyCap);
    const maxScore = Math.floor(tierPolicy.maxPercentage * targetPoints);
    const finalScore = Math.max(0, Math.min(calculatedScore, maxScore));

    if (finalScore <= 0) {
      return NextResponse.json(
        {
          error: "invalid_milestone_score",
          message: "Calculated milestone score must be greater than zero.",
        },
        { status: 400 },
      );
    }

    // Image is intentionally optional at creation.
    // Users can upload it later via `/api/goal/milestone/image`.
    const imageUrl: string | null = null;
    const imagePromptContext = buildMilestonePromptContext({
      goalTitle: goal.title,
      goalContext,
      tasksDescriptions,
    });
    const imagePrompt = buildMilestoneImagePrompt({
      ...imagePromptContext,
      milestoneName: finalMilestoneName,
      milestoneDescription: userInput,
      style: "cinematic",
      aspectRatio,
    });

    // 5. Atomically insert Daily Log and increment Goal Points via SQL RPC.
    // The migration in `supabase/migrations/*_milestone_atomic_rpc.sql` must be applied.
    const breakdownPayload = {
      version: 2,
      items: [],
      milestone: {
        tier: tierPolicy.tier,
        imageUrl: imageUrl,
        name: finalMilestoneName,
        description: userInput,
        imageStylePreference: "cinematic",
        imageAspectRatio: aspectRatio,
        imagePrompt,
        imagePromptContext,
        short_description:
          typeof evaluation.short_description === "string"
            ? evaluation.short_description.slice(0, 240)
            : "",
      },
    };

    const { data: rpcData, error: recordError } = await supabase.rpc(
      "record_goal_milestone",
      {
        p_goal_id: goalId,
        p_user_input: userInput,
        p_ai_score: finalScore,
        p_ai_feedback:
          typeof evaluation.coaching_message === "string"
            ? evaluation.coaching_message
            : "",
        p_breakdown: breakdownPayload,
      },
    );

    let logId =
      isRecord(rpcData) && typeof rpcData.log_id === "string"
        ? rpcData.log_id
        : null;

    if (recordError) {
      if (!isRpcMissing(recordError)) {
        await removeMilestoneImage(supabase, imageUrl);
        const status = getRpcHttpStatus(recordError);
        return NextResponse.json(
          {
            error: "milestone_write_failed",
            message: getRpcClientMessage(
              recordError,
              "Failed to save milestone.",
            ),
          },
          { status },
        );
      }

      console.warn(
        "record_goal_milestone RPC is missing; using temporary non-atomic fallback. Apply the Supabase milestone migration to enable the hardened path.",
      );

      const { data: fallbackLogData, error: fallbackLogError } = await supabase
        .from("daily_logs")
        .insert({
          goal_id: goalId,
          user_input: userInput,
          ai_score: finalScore,
          ai_feedback:
            typeof evaluation.coaching_message === "string"
              ? evaluation.coaching_message
              : "",
          breakdown: breakdownPayload,
        })
        .select("id")
        .single();

      if (fallbackLogError) {
        await removeMilestoneImage(supabase, imageUrl);
        throw fallbackLogError;
      }

      logId = fallbackLogData.id;

      const { error: fallbackPointsError } = await supabase.rpc(
        "increment_goal_points",
        {
          goal_uuid: goalId,
          points_to_add: finalScore,
        },
      );

      if (fallbackPointsError) {
        await supabase.from("daily_logs").delete().eq("id", logId);
        await removeMilestoneImage(supabase, imageUrl);
        throw fallbackPointsError;
      }
    }

    return NextResponse.json({
      status: "ok",
      tier: tierPolicy.tier,
      score: finalScore,
      imageUrl: imageUrl,
      message: evaluation.coaching_message,
      logId,
      imagePrompt,
    });
  } catch (error: unknown) {
    console.error("Milestone API POST error:", error);
    if (error instanceof GeminiQuotaError) {
      return NextResponse.json(
        {
          error: "quota_exceeded",
          message: "Daily usage limit exceeded.",
        },
        { status: 429 },
      );
    }
    return NextResponse.json(
      {
        error: "Internal server error",
        message: getErrorMessage(error, "Internal server error"),
      },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const {
      logId,
      goalId,
      name,
      description,
      tier,
      accentColor,
      imagePrompt,
      imageStylePreference,
    } =
      await req.json();

    if (!logId || !goalId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (tier && !ALLOWED_TIERS.includes(tier)) {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    }

    if (accentColor && !ALLOWED_ACCENT_COLORS.includes(accentColor)) {
      return NextResponse.json(
        { error: "Invalid accentColor" },
        { status: 400 },
      );
    }

    if (
      imagePrompt !== undefined &&
      (typeof imagePrompt !== "string" || imagePrompt.length > 6_000)
    ) {
      return NextResponse.json(
        { error: "Invalid imagePrompt" },
        { status: 400 },
      );
    }

    if (
      imageStylePreference !== undefined &&
      (typeof imageStylePreference !== "string" ||
        imageStylePreference.length > 64)
    ) {
      return NextResponse.json(
        { error: "Invalid imageStylePreference" },
        { status: 400 },
      );
    }

    const auth = await requireUser(req);
    if (auth.error) {
      return auth.error;
    }
    const { supabase, user } = auth;

    const { data: goal, error: goalError } = await supabase
      .from("goals")
      .select("id")
      .eq("id", goalId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (goalError || !goal) {
      return NextResponse.json(
        { error: "Goal not found or access denied" },
        { status: 404 },
      );
    }

    const { data: log, error: fetchError } = await supabase
      .from("daily_logs")
      .select("id, breakdown")
      .eq("id", logId)
      .eq("goal_id", goalId)
      .maybeSingle();

    if (fetchError || !log) {
      return NextResponse.json({ error: "Log not found" }, { status: 404 });
    }

    const breakdown = isRecord(log.breakdown) ? { ...log.breakdown } : {};
    if (!isRecord(breakdown.milestone)) {
      return NextResponse.json(
        { error: "Log is not a milestone" },
        { status: 400 },
      );
    }

    const updatedMilestone = { ...breakdown.milestone };
    if (typeof name === "string" && name.trim())
      updatedMilestone.name = name.trim();
    if (typeof description === "string") {
      updatedMilestone.description = description;
      updatedMilestone.short_description =
        description.length > 120
          ? description.slice(0, 120) + "…"
          : description;
    }
    if (tier) updatedMilestone.tier = tier;
    if (accentColor) updatedMilestone.accentColor = accentColor;
    if (typeof imagePrompt === "string") {
      updatedMilestone.imagePrompt = imagePrompt.trim();
    }
    if (typeof imageStylePreference === "string") {
      updatedMilestone.imageStylePreference = imageStylePreference.trim();
    }

    breakdown.milestone = updatedMilestone;

    const { error: updateError } = await supabase
      .from("daily_logs")
      .update({ breakdown })
      .eq("id", logId);

    if (updateError) throw updateError;

    return NextResponse.json({ status: "ok", milestone: updatedMilestone });
  } catch (error: unknown) {
    console.error("Milestone API PATCH error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: getErrorMessage(error, "Internal server error"),
      },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { logId, goalId } = await req.json();

    if (!logId || !goalId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const auth = await requireUser(req);
    if (auth.error) {
      return auth.error;
    }
    const { supabase, user } = auth;

    // Verify goal ownership
    const { data: goal, error: goalError } = await supabase
      .from("goals")
      .select("id")
      .eq("id", goalId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (goalError || !goal) {
      return NextResponse.json(
        { error: "Goal not found or access denied" },
        { status: 404 },
      );
    }

    // Fetch the log to verify it belongs to this goal and get the score/image
    const { data: log, error: fetchError } = await supabase
      .from("daily_logs")
      .select("id, ai_score, breakdown")
      .eq("id", logId)
      .eq("goal_id", goalId)
      .maybeSingle();

    if (fetchError || !log) {
      return NextResponse.json({ error: "Log not found" }, { status: 404 });
    }

    const breakdown = isRecord(log.breakdown) ? log.breakdown : {};

    if (!isRecord(breakdown.milestone)) {
      return NextResponse.json(
        { error: "Log is not a milestone" },
        { status: 400 },
      );
    }

    const scoreToRevert = log.ai_score || 0;
    const imageUrl =
      typeof breakdown.milestone.imageUrl === "string"
        ? breakdown.milestone.imageUrl
        : null;

    const { error: deleteError } = await supabase.rpc("delete_goal_milestone", {
      p_goal_id: goalId,
      p_log_id: logId,
    });

    if (deleteError) {
      if (!isRpcMissing(deleteError)) {
        const status = getRpcHttpStatus(deleteError);
        return NextResponse.json(
          {
            error: "milestone_delete_failed",
            message: getRpcClientMessage(
              deleteError,
              "Failed to delete milestone.",
            ),
          },
          { status },
        );
      }

      console.warn(
        "delete_goal_milestone RPC is missing; using temporary non-atomic fallback. Apply the Supabase milestone migration to enable the hardened path.",
      );

      const { error: fallbackDeleteError } = await supabase
        .from("daily_logs")
        .delete()
        .eq("id", logId)
        .eq("goal_id", goalId);

      if (fallbackDeleteError) {
        throw fallbackDeleteError;
      }

      if (scoreToRevert > 0) {
        const { error: fallbackPointsError } = await supabase.rpc(
          "increment_goal_points",
          {
            goal_uuid: goalId,
            points_to_add: -scoreToRevert,
          },
        );

        if (fallbackPointsError) {
          console.error(
            "Milestone log was deleted but point revert failed in fallback path:",
            fallbackPointsError,
          );
          throw fallbackPointsError;
        }
      }
    }

    await removeMilestoneImage(supabase, imageUrl);

    return NextResponse.json({ status: "ok", revertedScore: scoreToRevert });
  } catch (error: unknown) {
    console.error("Milestone API DELETE error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: getErrorMessage(error, "Internal server error"),
      },
      { status: 500 },
    );
  }
}
