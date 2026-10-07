import { test } from "node:test";
import assert from "node:assert/strict";
import { GeminiService } from "../gemini.ts";

test("rebalancePlanLocally adjusts daily times and weights based on difficulty", () => {
  const resultEasy = GeminiService.rebalancePlanLocally({
    goalTitle: "Learn Spanish",
    targetDurationDays: 90,
    previousDurationDays: 90,
    difficulty: "easy",
    targetPoints: 4500,
    tasks: [
      {
        id: "m1",
        task: "Basic Vocabulary",
        frequency: "daily",
        subtasks: [
          { id: "s1", task: "Study 10 words", frequency: "daily", impact_weight: 1, time_required_minutes: 10 },
        ],
      },
    ],
    language: "en",
  });

  assert.equal(resultEasy.status, "ok");
  assert.equal(resultEasy.recommended_daily_time_minutes, 20);
  assert.equal(resultEasy.main_tasks[0].subtasks[0].impact_weight, 1);
  assert.ok(resultEasy.audit_summary.includes("Logical plan audit"));

  const resultLegendary = GeminiService.rebalancePlanLocally({
    goalTitle: "Learn Spanish",
    targetDurationDays: 30,
    previousDurationDays: 90,
    difficulty: "legendary",
    targetPoints: 7500,
    tasks: [
      {
        id: "m1",
        task: "Basic Vocabulary",
        frequency: "daily",
        subtasks: [
          { id: "s1", task: "Study 10 words", frequency: "daily", impact_weight: 1, time_required_minutes: 10 },
        ],
      },
    ],
    language: "ar",
  });

  assert.equal(resultLegendary.status, "ok");
  assert.equal(resultLegendary.recommended_daily_time_minutes, 120);
  assert.equal(resultLegendary.main_tasks[0].subtasks[0].impact_weight, 5);
  assert.ok(resultLegendary.main_tasks[0].subtasks[0].completion_criteria.includes("مكثف"));
  assert.ok(resultLegendary.audit_summary.includes("تمت المراجعة المنطقية"));
});

test("rebalancePlanLocally handles empty or missing subtasks gracefully", () => {
  const result = GeminiService.rebalancePlanLocally({
    goalTitle: "Fitness Goal",
    targetDurationDays: 60,
    previousDurationDays: 60,
    difficulty: "medium",
    targetPoints: 6000,
    tasks: [],
    language: "ar",
  });

  assert.equal(result.status, "ok");
  assert.equal(result.main_tasks.length, 0);
  assert.ok(result.audit_summary.length > 0);
});

test("evaluateRealismLocally flags impossible 20kg weight loss in 7 days", () => {
  const check = GeminiService.evaluateRealismLocally({
    goalTitle: "التحول من ال 105 إلى ال 85",
    targetDurationDays: 7,
    initialPlanDays: 90,
    language: "ar",
  });

  assert.equal(check.is_realistic, false);
  assert.equal(check.severity, "impossible");
  assert.equal(check.recommended_min_days, 140);
  assert.ok(check.warning_message.includes("عجزاً حرارياً"));
  assert.ok(check.warning_message.includes("مستحيل بيولوجياً"));
  assert.ok(check.warning_message.includes("20 كجم"));
});

test("evaluateRealismLocally flags impossible weight loss with regex variations", () => {
  const checkAr = GeminiService.evaluateRealismLocally({
    goalTitle: "خسارة 20 كجم في أسبوع",
    targetDurationDays: 7,
    initialPlanDays: 90,
    language: "ar",
  });

  assert.equal(checkAr.is_realistic, false);
  assert.equal(checkAr.severity, "impossible");
  assert.equal(checkAr.recommended_min_days, 140);

  const checkEn = GeminiService.evaluateRealismLocally({
    goalTitle: "lose 20 kg fast",
    targetDurationDays: 7,
    initialPlanDays: 90,
    language: "en",
  });

  assert.equal(checkEn.is_realistic, false);
  assert.equal(checkEn.severity, "impossible");
  assert.equal(checkEn.recommended_min_days, 140);
});

test("evaluateRealismLocally accepts realistic weight loss duration", () => {
  const check = GeminiService.evaluateRealismLocally({
    goalTitle: "التحول من ال 105 إلى ال 85",
    targetDurationDays: 140,
    initialPlanDays: 90,
    language: "ar",
  });

  assert.equal(check.is_realistic, true);
  assert.equal(check.severity, "realistic");
  assert.equal(check.warning_message, "");
});

test("evaluateRealismLocally warns on tight weight loss duration", () => {
  const check = GeminiService.evaluateRealismLocally({
    goalTitle: "التحول من ال 105 إلى ال 85",
    targetDurationDays: 70, // 70 is < 140 * 0.75 (105) and >= 140 * 0.4 (56)
    initialPlanDays: 90,
    language: "ar",
  });

  assert.equal(check.is_realistic, false);
  assert.equal(check.severity, "warning");
  assert.equal(check.recommended_min_days, 140);
  assert.ok(check.warning_message.includes("مضغوطة جداً"));
});

test("evaluateRealismLocally flags extreme timeline compression on long journeys", () => {
  const check = GeminiService.evaluateRealismLocally({
    goalTitle: "إتقان هندسة البرمجيات وبناء مشاريع كاملة",
    targetDurationDays: 7,
    initialPlanDays: 90,
    language: "ar",
  });

  assert.equal(check.is_realistic, false);
  assert.equal(check.severity, "impossible");
  assert.ok(check.recommended_min_days >= 30);
  assert.ok(check.warning_message.includes("تراكمي"));
});

