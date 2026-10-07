import test from "node:test";
import assert from "node:assert/strict";
import { GeminiService } from "@/lib/gemini";

test("GeminiService.checkContentSafety correctly identifies safe multi-goal text", () => {
  const safeText = "اليوم ركضت 5 كم وكتبت كود الواجهة وقرأت فصلين من الكتاب";
  const result = GeminiService.checkContentSafety(safeText);
  assert.equal(result.isSafe, true);
});

test("GeminiService.evaluateMultiGoalDailyLog refuses dangerous or self-harm content", async () => {
  const dangerousText = "I want to commit suicide and hurt myself";
  const result = await GeminiService.evaluateMultiGoalDailyLog(
    [{ id: "1", title: "Goal 1" }],
    dangerousText,
    "en"
  );
  assert.equal(result.status, "refused");
  assert.ok(result.safe_redirection);
});
