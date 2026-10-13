/* eslint-disable @typescript-eslint/no-explicit-any */
import { callWithRetry } from "./gemini-client.ts";
import { extractJson } from "./extract-json.ts";
import { detectLanguage } from "./safety.ts";
import { evaluateRealismLocally, rebalancePlanLocally } from "./rebalance-local.ts";

/**
 * Intelligently audits and rebalances a plan when the user adjusts
 * timeline duration, difficulty tier, or target points. Recalibrates
 * completion criteria, time required, and impact weights.
 */
export async function rebalancePlan(params: {
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
  const userLanguage = params.language || detectLanguage(params.goalTitle);
  const currentDate = new Date().toISOString().split("T")[0];

  const safeTasks = Array.isArray(params.tasks) ? params.tasks : [];
  if (safeTasks.length === 0) {
    return rebalancePlanLocally(params);
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
    if (parsed && Array.isArray(parsed.main_tasks) && parsed.main_tasks.length > 0) {
      const localCheck = evaluateRealismLocally(params);
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
    return rebalancePlanLocally(params);
  } catch (error) {
    console.warn("Gemini rebalancePlan failed, using local rebalance engine:", error);
    return rebalancePlanLocally(params);
  }
}
