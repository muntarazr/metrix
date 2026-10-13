/* eslint-disable @typescript-eslint/no-explicit-any */
import { callWithRetry } from "../gemini-client.ts";
import { extractJson } from "../extract-json.ts";
import { checkContentSafety } from "../safety.ts";

export async function evaluateMilestone(
  goalContext: any,
  tasksDescriptions: string[],
  userInput: string,
  language: "ar" | "en",
) {
  const safetyCheck = checkContentSafety(userInput);
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

    return extractJson(responseText);
  } catch (error) {
    console.error("Gemini evaluateMilestone Error:", error);
    throw error;
  }
}
