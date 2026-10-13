/* eslint-disable @typescript-eslint/no-explicit-any */
import { callWithRetry } from "../gemini-client.ts";
import { extractJson } from "../extract-json.ts";

export interface WeeklyReviewPattern {
  label: string;
  detail: string;
}

export interface WeeklyReviewResult {
  summary: string;
  patterns: WeeklyReviewPattern[];
  suggestion: string;
}

/**
 * End-of-week report built from what actually happened, not from the plan.
 * The value is in the patterns — which weekday collapses, which hour works —
 * because those are the things a user cannot see in their own data.
 */
export async function generateWeeklyReview(
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
    const response = await callWithRetry(
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
