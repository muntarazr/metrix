import { GeminiService, extractJson } from '@/lib/gemini';

export interface PlanStrategyResult {
  goal_summary: string;
  success_metric: { metric: string; target: string };
  baseline_daily_time_minutes: number;
  recommended_daily_time_minutes: number;
  estimated_total_days: number;
  estimated_completion_date: string;
  confidence: 'low' | 'medium' | 'high';
  strategy_pillars: string[];
}

export interface PlanPhase {
  phase_number: number;
  name: string;
  duration_days: number;
  objective: string;
}

export interface PlanTaskItem {
  id: string;
  task: string;
  frequency: 'daily' | 'weekly';
  schedule_days: number[] | null;
  impact_weight: number;
  time_required_minutes: number;
  completion_criteria: string;
  notes?: string;
}

export interface SequentialPlanOutput {
  status: 'ok' | 'unrealistic' | 'refused';
  plan: {
    goal_summary: string;
    success_metric: { metric: string; target: string };
    baseline_daily_time_minutes: number;
    recommended_daily_time_minutes: number;
    estimated_total_days: number;
    estimated_completion_date: string;
    confidence: 'low' | 'medium' | 'high';
  };
  phases: PlanPhase[];
  tasks: PlanTaskItem[];
  realism_check: {
    assessment: 'plausible' | 'unrealistic';
    reasons: string[];
    what_must_change?: string[];
  };
  ai_summary: string;
  feasibility_explanation?: string;
  safe_redirection?: {
    message?: string;
    alternatives?: string[];
  };
}

export class PlanArchitectService {
  /**
   * Phase 1: Investigate Goal & Generate Smart Questions
   */
  static async investigateGoal(
    goalText: string,
    previousContext: Record<string, string> = {},
    structuredInput: any = null,
  ) {
    const safetyCheck = GeminiService.checkContentSafety(goalText);
    if (!safetyCheck.isSafe) {
      return {
        status: 'refused',
        safe_redirection: {
          message: safetyCheck.reason,
          alternatives: [
            'Please reach out to professional support if you are in distress.',
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
            .join('\n')
        : 'No previous answers yet.';

    const systemPrompt = `
SYSTEM ROLE:
You are an elite, world-class "Universal Goal Investigator & Execution Architect".
Your purpose is to deeply understand ANY goal in the world—from software development, AI, programming, to business startups, ecommerce, to fitness, athletics, weight loss, to academics, languages, and life mastery.

TOP PRIORITY: SAFETY
- If the goal involves violence, self-harm, illegal activities, weapons, fraud: refuse with status="refused" and safe_redirection.

SECOND PRIORITY: MANDATORY MULTI-DIMENSIONAL INVESTIGATION (2 TO 4 SMART QUESTIONS IN ROUND 1)
- In the initial round (when no previous answers have been recorded):
  - You MUST ALWAYS generate 2 to 4 (up to 5 max) highly intelligent, domain-specific questions to calibrate the plan.
  - NEVER return an empty questions array and NEVER set readiness="ready_for_plan" in the first round!
  - GOLDEN RULE: Do NOT re-ask details already stated in the goal text. Identify the NEXT tactical layer:
    * Fitness/Weight: timeline deadline (months/weeks), baseline capacity, joint health/injuries, weekly frequency & rest days, meal portioning strategy.
    * Tech/Coding/AI: tools & tech stack (multi_choice), baseline level, launch deadline, practical project vs theory.
    * Business/Commerce: business model/niche, target revenue milestone, marketing channels, budget.
    * Studies/Languages: current level, exam/deadline date, focus area (speaking vs grammar).

THIRD PRIORITY: QUESTION TYPES
- "multi_choice": Multiple selections supported (chips) + custom note.
- "single_choice": One option selected (chips) + custom note field.
- "boolean": Exactly options: ["نعم", "لا"] (Arabic) or ["Yes", "No"] (English).
- "number": With explicit "unit" ("minutes", "hours", "days", "weeks", "months", "times", "kg", "km", "usd", "iqd").
- "date": Calendar picker for target completion dates.

EXIT CONDITION:
- Initial Round (${contextEntries.length === 0} answers): Set readiness="not_ready". Return 2-4 smart questions.
- Subsequent Rounds (${contextEntries.length > 0} answers): If sufficient clarity, set readiness="ready_for_plan" and questions=[].

OUTPUT JSON FORMAT ONLY:
{
  "status": "ok" | "needs_info" | "unrealistic" | "refused",
  "goal_understanding": {
    "goal_summary": "string",
    "domain": "health|money|skills|career|study|home|other",
    "goal_nature": "routine_habit|progressive_milestone",
    "risk_flags": ["none|self_harm_risk|violence|illegal|other"],
    "missing_info": ["list of what is missing"],
    "readiness": "not_ready|ready_for_plan"
  },
  "questions": [
    {
      "id": "q1",
      "question": "string",
      "type": "single_choice|multi_choice|number|boolean|date|text",
      "options": ["relevant options"],
      "unit": "string",
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

STRUCTURED_INPUT: ${JSON.stringify(structuredInput || {})}
PREVIOUS_ANSWERS (${contextEntries.length} answers):
${formattedContext}
ROUND STATUS: ${contextEntries.length === 0 ? 'INITIAL ROUND' : `FOLLOW-UP ROUND (${contextEntries.length} answers)`}
`;

    const response = await GeminiService.callWithRetry(
      {
        responseMimeType: 'application/json',
        systemInstruction: {
          parts: [{ text: systemPrompt }],
          role: 'system',
        },
      },
      { role: 'user', parts: [{ text: userPrompt }] },
      (text: string) => extractJson(text),
    );

    const responseText = response.text || '';
    if (!responseText) throw new Error('Empty response from Gemini API');
    return extractJson(responseText);
  }

  /**
   * Stage 1: Formulate Strategic Foundation & Timeline
   */
  static async generateStage1Strategy(
    goal: string,
    answers: Record<string, string>,
    targetDeadline?: string,
  ): Promise<PlanStrategyResult> {
    const userLanguage = GeminiService.detectLanguage(goal);
    const currentDate = new Date().toISOString().split('T')[0];

    const prompt = `
SYSTEM ROLE:
You are Stage 1 of the Universal Plan Architect.
Your role: Define the strategic foundation, realistic timeline, success metric, and core pillars for the goal.

CONSTRAINTS:
1. "estimated_total_days": Calculate realistically based on the goal scope and user answers.
   - If targetDeadline is provided (${targetDeadline || 'none'}), compute the exact day difference from ${currentDate} and adhere strictly to it.
   - Convert months × 30, weeks × 7.
2. "goal_summary": Punchy, inspiring name of the goal in 2-6 words (NOT a description).
3. "success_metric": Quantifiable metric and target (e.g. metric: "الوزن", target: "88 كغ").
4. "strategy_pillars": 3 core pillars of how this goal will be conquered.
5. Language: ${userLanguage === 'ar' ? 'Arabic' : 'English'}.

OUTPUT JSON ONLY:
{
  "goal_summary": "string",
  "success_metric": { "metric": "string", "target": "string" },
  "baseline_daily_time_minutes": number,
  "recommended_daily_time_minutes": number,
  "estimated_total_days": number,
  "estimated_completion_date": "YYYY-MM-DD",
  "confidence": "low|medium|high",
  "strategy_pillars": ["pillar 1", "pillar 2", "pillar 3"]
}
`;

    const userContent = `Goal: ${goal}\nAnswers: ${JSON.stringify(answers)}\nTarget Deadline: ${targetDeadline || 'None'}\nCurrent Date: ${currentDate}`;

    const response = await GeminiService.callWithRetry(
      {
        responseMimeType: 'application/json',
        systemInstruction: { parts: [{ text: prompt }], role: 'system' },
      },
      { role: 'user', parts: [{ text: userContent }] },
      (text: string) => extractJson(text),
    );

    return extractJson(response.text || '{}');
  }

  /**
   * Stage 2: Decompose Roadmap into Progressive Phases (Milestones)
   */
  static async generateStage2Phases(
    goal: string,
    strategy: PlanStrategyResult,
  ): Promise<PlanPhase[]> {
    const userLanguage = GeminiService.detectLanguage(goal);

    const prompt = `
SYSTEM ROLE:
You are Stage 2 of the Universal Plan Architect.
Your role: Given the goal strategy and total duration of ${strategy.estimated_total_days} days, decompose the timeline into 3 clear progressive milestones/phases.

PHASE LOGIC:
- Phase 1: Foundation, habit formation & setup.
- Phase 2: Intensification, skill/strength progression.
- Phase 3: Peak execution, mastery & goal achievement.
- The sum of duration_days across all 3 phases MUST equal exactly ${strategy.estimated_total_days} days.
- Language: ${userLanguage === 'ar' ? 'Arabic' : 'English'}.

OUTPUT JSON ONLY:
{
  "phases": [
    {
      "phase_number": 1,
      "name": "string",
      "duration_days": number,
      "objective": "string"
    },
    {
      "phase_number": 2,
      "name": "string",
      "duration_days": number,
      "objective": "string"
    },
    {
      "phase_number": 3,
      "name": "string",
      "duration_days": number,
      "objective": "string"
    }
  ]
}
`;

    const userContent = `Goal: ${goal}\nStrategy: ${JSON.stringify(strategy)}`;

    const response = await GeminiService.callWithRetry(
      {
        responseMimeType: 'application/json',
        systemInstruction: { parts: [{ text: prompt }], role: 'system' },
      },
      { role: 'user', parts: [{ text: userContent }] },
      (text: string) => extractJson(text),
    );

    const parsed = extractJson(response.text || '{}');
    return Array.isArray(parsed?.phases) ? parsed.phases : [];
  }

  /**
   * Stage 3: Generate High-Impact Actionable Daily & Weekly Tasks with Definition of Done
   */
  static async generateStage3Tasks(
    goal: string,
    answers: Record<string, string>,
    strategy: PlanStrategyResult,
    phases: PlanPhase[],
  ): Promise<{ tasks: PlanTaskItem[]; ai_summary: string; feasibility_explanation: string }> {
    const userLanguage = GeminiService.detectLanguage(goal);

    const prompt = `
SYSTEM ROLE:
You are Stage 3 of the Universal Plan Architect.
Your role: Construct direct, tangible execution tasks for the user that drive this goal to completion.

STRICT RULES:
1. TASK COUNT: Exactly 2 to 3 actionable tasks daily (or up to 4 only if an acceleration sprint task is added for shortened deadlines). Never overload the user with busywork!
2. MANDATORY "completion_criteria" (معيار الإنجاز القاطع):
   - Every task MUST have a concrete, measurable definition of done.
   - Answers: "How does the user verify with 100% certainty that this task is done today without self-deception?"
   - Must contain tangible numbers/outputs (e.g. "برمجة شاشة الدخول واختبارها محلياً بنجاح", "إتمام 4 جولات تمرين وتسجيل العدات", "قراءة 15 صفحة وتدوين فكرتين رئيسيتين").
3. "time_required_minutes": Integer in minutes only (e.g. 20, 30, 45).
4. "frequency": Strictly "daily" or "weekly".
5. "schedule_days": Weekday numbers [0..6] (0=Sunday ... 6=Saturday) where applicable (e.g. workout on [0, 2, 4]), or null if everyday.
6. "impact_weight": Integer 1 to 5 based on how directly this task moves the needle.
7. FEASIBILITY VERIFICATION: Verify that these tasks harmoniously and realistically guarantee achieving the goal.
8. Language: ${userLanguage === 'ar' ? 'Arabic' : 'English'}.

OUTPUT JSON ONLY:
{
  "tasks": [
    {
      "id": "t1",
      "task": "string",
      "frequency": "daily|weekly",
      "schedule_days": [0,1,2,4,5] or null,
      "impact_weight": number,
      "time_required_minutes": number,
      "completion_criteria": "string",
      "notes": "string"
    }
  ],
  "ai_summary": "Brief inspiring summary of how this plan is executed",
  "feasibility_explanation": "Clear explanation confirming why this set of tasks guarantees reaching the goal"
}
`;

    const userContent = `Goal: ${goal}\nAnswers: ${JSON.stringify(answers)}\nStrategy: ${JSON.stringify(strategy)}\nPhases: ${JSON.stringify(phases)}`;

    const response = await GeminiService.callWithRetry(
      {
        responseMimeType: 'application/json',
        systemInstruction: { parts: [{ text: prompt }], role: 'system' },
      },
      { role: 'user', parts: [{ text: userContent }] },
      (text: string) => extractJson(text),
    );

    const parsed = extractJson(response.text || '{}');
    return {
      tasks: Array.isArray(parsed?.tasks) ? parsed.tasks : [],
      ai_summary: parsed?.ai_summary || '',
      feasibility_explanation: parsed?.feasibility_explanation || '',
    };
  }

  /**
   * Master Method: Full Sequential Multi-Stage Generation Pipeline
   */
  static async createSequentialPlan(
    goal: string,
    answers: Record<string, string>,
    targetDeadline?: string,
    structuredInput: any = null,
  ): Promise<SequentialPlanOutput> {
    const safetyCheck = GeminiService.checkContentSafety(goal);
    if (!safetyCheck.isSafe) {
      return {
        status: 'refused',
        plan: {
          goal_summary: goal,
          success_metric: { metric: '', target: '' },
          baseline_daily_time_minutes: 0,
          recommended_daily_time_minutes: 0,
          estimated_total_days: 90,
          estimated_completion_date: '',
          confidence: 'low',
        },
        phases: [],
        tasks: [],
        realism_check: { assessment: 'unrealistic', reasons: [safetyCheck.reason || 'Content safety violation'] },
        ai_summary: safetyCheck.reason || 'Content safety violation',
        safe_redirection: {
          message: safetyCheck.reason,
          alternatives: ['Please reach out to professional support.'],
        },
      };
    }

    try {
      // Stage 1: Strategy, Metric & Duration
      const strategy = await this.generateStage1Strategy(goal, answers, targetDeadline);

      // Stage 2: Roadmaps & Phases
      const phases = await this.generateStage2Phases(goal, strategy);

      // Stage 3: Concrete Actionable Tasks
      const { tasks, ai_summary, feasibility_explanation } = await this.generateStage3Tasks(
        goal,
        answers,
        strategy,
        phases,
      );

      return {
        status: 'ok',
        plan: {
          goal_summary: strategy.goal_summary || goal,
          success_metric: strategy.success_metric || { metric: 'الإنجاز', target: '100%' },
          baseline_daily_time_minutes: strategy.baseline_daily_time_minutes || 30,
          recommended_daily_time_minutes: strategy.recommended_daily_time_minutes || 45,
          estimated_total_days: strategy.estimated_total_days || 90,
          estimated_completion_date: strategy.estimated_completion_date || '',
          confidence: strategy.confidence || 'high',
        },
        phases,
        tasks: tasks.map((t, idx) => ({
          ...t,
          id: t.id || `task_${idx + 1}`,
        })),
        realism_check: {
          assessment: 'plausible',
          reasons: ['Plan constructed sequentially across strategy, milestones, and daily habits.'],
        },
        ai_summary: ai_summary || `خطة متكاملة لإنجاز ${strategy.goal_summary || goal} عبر مهام يومية محكمة.`,
        feasibility_explanation,
      };
    } catch (err) {
      console.error('Sequential plan pipeline error, executing robust synthesis fallback:', err);
      // Fallback to robust direct synthesis if multi-stage suffers transient network issue
      return this.createDirectSynthesisPlan(goal, answers, targetDeadline, structuredInput);
    }
  }

  /**
   * Fast robust single-call synthesis (acts as resilient fallback)
   */
  static async createDirectSynthesisPlan(
    goal: string,
    answers: Record<string, string>,
    targetDeadline?: string,
    structuredInput: any = null,
  ): Promise<SequentialPlanOutput> {
    const userLanguage = GeminiService.detectLanguage(goal);
    const currentDate = new Date().toISOString().split('T')[0];

    const systemPrompt = `
SYSTEM ROLE:
You are an elite "Universal Plan Architect & Execution Engine".
Construct a realistic, high-impact, directly actionable daily execution plan for ANY goal.

CONSTRAINTS:
- Output STRICTLY VALID JSON.
- DIRECT FLAT ACTIONABLE TASKS: 2 TO 3 actionable tasks daily (or up to 4 if accelerated).
- Every single task MUST have a concrete, measurable "completion_criteria" (Definition of Done).
- "time_required_minutes": In minutes only (20, 30, 45...).
- "frequency": Strictly "daily" or "weekly".
- "schedule_days": [0..6] weekday numbers or null.
- "goal_summary": 2 to 6 words concise name.
- Language: ${userLanguage === 'ar' ? 'Arabic' : 'English'}.

OUTPUT JSON ONLY:
{
  "status": "ok",
  "plan": {
    "goal_summary": "string",
    "success_metric": {"metric": "string", "target": "string"},
    "baseline_daily_time_minutes": number,
    "recommended_daily_time_minutes": number,
    "estimated_total_days": number,
    "estimated_completion_date": "YYYY-MM-DD",
    "confidence": "high"
  },
  "tasks": [
    {
      "id": "t1",
      "task": "string",
      "frequency": "daily|weekly",
      "schedule_days": [0,1,2,4,5] or null,
      "impact_weight": number,
      "time_required_minutes": number,
      "completion_criteria": "string",
      "notes": "string"
    }
  ],
  "realism_check": { "assessment": "plausible", "reasons": ["string"] },
  "ai_summary": "string"
}`;

    const userPrompt = `
Current Date: ${currentDate}
Goal: ${goal}
Answers: ${JSON.stringify(answers)}
Target Deadline: ${targetDeadline || 'None'}
`;

    const response = await GeminiService.callWithRetry(
      {
        responseMimeType: 'application/json',
        systemInstruction: { parts: [{ text: systemPrompt }], role: 'system' },
      },
      { role: 'user', parts: [{ text: userPrompt }] },
      (text: string) => extractJson(text),
    );

    const parsed = extractJson(response.text || '{}');
    return {
      status: parsed.status || 'ok',
      plan: parsed.plan || {
        goal_summary: goal,
        success_metric: { metric: 'إنجاز', target: '100%' },
        baseline_daily_time_minutes: 30,
        recommended_daily_time_minutes: 45,
        estimated_total_days: 90,
        estimated_completion_date: '',
        confidence: 'medium',
      },
      phases: [],
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      realism_check: parsed.realism_check || { assessment: 'plausible', reasons: [] },
      ai_summary: parsed.ai_summary || '',
    };
  }

  /**
   * Harmonized Full Plan Rebalance & Feasibility Verification (USER STEP 3.3 DIRECTIVE)
   *
   * When the user modifies, intensifies, or replaces a task:
   * Instead of an isolated single-task replacement, this rebalances the ENTIRE SET OF TASKS:
   * - If the modified task became harder/heavier (e.g. to reach the goal faster), it can reduce the
   *   other tasks (e.g. from 3 tasks down to 2) to eliminate redundant busywork.
   * - Verifies feasibility: "هل ستوصل هذه المهام المستخدم للهدف فعلياً؟"
   */
  static async rebalanceAllTasksWithGoal(params: {
    goalTitle: string;
    allCurrentTasks: PlanTaskItem[];
    modifiedTaskId?: string;
    userInstruction: string;
    targetDeadline?: string;
  }): Promise<{
    tasks: PlanTaskItem[];
    explanation: string;
    feasibility_verified: boolean;
  }> {
    const { goalTitle, allCurrentTasks, modifiedTaskId, userInstruction, targetDeadline } = params;

    const safetyCheck = GeminiService.checkContentSafety(userInstruction);
    if (!safetyCheck.isSafe) {
      return {
        tasks: allCurrentTasks,
        explanation: safetyCheck.reason || 'Content safety violation',
        feasibility_verified: false,
      };
    }

    const userLanguage = GeminiService.detectLanguage(`${goalTitle} ${userInstruction}`);

    const systemPrompt = `
SYSTEM ROLE:
You are an elite "Harmonized Plan Rebalancing Specialist".
The user is reviewing their tasks for the goal "${goalTitle}" and provided this specific adjustment or intensification:
"${userInstruction}"

CRITICAL MANDATE (USER EXPLICIT REQUIREMENT):
1. Do NOT just change one task in an isolated silo!
2. You MUST examine the ENTIRE SET of tasks as a unified system:
   - If the user made a task much harder, heavier, or more comprehensive (e.g. "I intensified my workout/study block to achieve the goal faster"):
     * Rebalance the remaining tasks! If 2 high-impact tasks are now sufficient, REDUCE the total count from 3 or 4 tasks down to 2!
     * Never keep redundant, overlapping, or excessive busywork.
   - If the user made a task lighter, distribute the required leverage appropriately across the remaining tasks.
3. MANDATORY COMPLETION CRITERIA:
   - Every returned task MUST have concrete, measurable "completion_criteria".
4. FEASIBILITY VERIFICATION:
   - Verify that this updated suite of tasks realistically leads the user to achieve "${goalTitle}".
5. Language: Respond in ${userLanguage === 'ar' ? 'Arabic' : 'English'}.

OUTPUT JSON ONLY:
{
  "tasks": [
    {
      "id": "string",
      "task": "string",
      "frequency": "daily|weekly",
      "schedule_days": [0,1,2,4,5] or null,
      "impact_weight": number 1 to 5,
      "time_required_minutes": number,
      "completion_criteria": "string",
      "notes": "string"
    }
  ],
  "explanation": "Clear 2-sentence explanation of how the full plan was rebalanced and why this task count and distribution guarantees reaching the goal",
  "feasibility_verified": true
}
`;

    const userPrompt = `
GOAL: ${goalTitle}
CURRENT TASKS:
${JSON.stringify(allCurrentTasks, null, 2)}

TASK BEING MODIFIED: ${modifiedTaskId ? `Task ID: ${modifiedTaskId}` : 'Full plan rebalance request'}
USER DIRECTION & OPINION:
"${userInstruction}"

TARGET DEADLINE: ${targetDeadline || 'Standard'}
`;

    const response = await GeminiService.callWithRetry(
      {
        responseMimeType: 'application/json',
        systemInstruction: { parts: [{ text: systemPrompt }], role: 'system' },
      },
      { role: 'user', parts: [{ text: userPrompt }] },
      (text: string) => extractJson(text),
    );

    const parsed = extractJson(response.text || '{}');
    const newTasks = Array.isArray(parsed.tasks) && parsed.tasks.length > 0
      ? parsed.tasks
      : allCurrentTasks;

    return {
      tasks: newTasks.map((t: any, idx: number) => ({
        id: t.id || `task_${idx + 1}`,
        task: t.task || `Task ${idx + 1}`,
        frequency: t.frequency === 'weekly' ? 'weekly' : 'daily',
        schedule_days: t.schedule_days ?? null,
        impact_weight: Math.max(1, Math.min(5, Number(t.impact_weight) || 3)),
        time_required_minutes: Math.max(5, Number(t.time_required_minutes) || 20),
        completion_criteria: t.completion_criteria || '',
        notes: t.notes || '',
      })),
      explanation: parsed.explanation || (userLanguage === 'ar' ? 'تمت إعادة موازنة وتنسيق كامل المهام لتناسب رغبتك وتضمن وصولك للهدف.' : 'Tasks rebalanced to match your directive.'),
      feasibility_verified: Boolean(parsed.feasibility_verified ?? true),
    };
  }
}
