import { callWithRetry } from "../gemini-client.ts";
import { checkContentSafety } from "../safety.ts";

/**
 * The two-minute version of a task: the smallest act that still counts as
 * showing up. Used on days the full task is not going to happen — keeping the
 * chain alive costs less than rebuilding it.
 */
export async function generateMiniVersion(
  taskDescription: string,
  goalTitle: string,
  language: "ar" | "en" = "ar",
): Promise<string> {
  const safetyCheck = checkContentSafety(
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
    const response = await callWithRetry(
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
export async function generateCompletionCriteria(
  taskDescription: string,
  goalTitle: string,
  taskType: "main" | "sub" = "sub",
  language: "ar" | "en" = "ar",
): Promise<string> {
  const safetyCheck = checkContentSafety(
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
    const response = await callWithRetry(
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
