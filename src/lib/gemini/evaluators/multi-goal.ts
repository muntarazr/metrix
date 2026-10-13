/* eslint-disable @typescript-eslint/no-explicit-any */
import { callWithRetry } from "../gemini-client.ts";
import { extractJson } from "../extract-json.ts";
import { checkContentSafety, detectLanguage } from "../safety.ts";

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

export async function evaluateMultiGoalDailyLog(
  goals: MultiGoalItemContext[],
  userInput: string,
  language: "ar" | "en" = "ar",
  coachPersona: "strict" | "balanced" | "analytical" = "balanced",
): Promise<MultiGoalEvaluationResult> {
  const safetyCheck = checkContentSafety(userInput);
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
    language === "ar" || detectLanguage(userInput) === "ar";

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
    const response = await callWithRetry(
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
