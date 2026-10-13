import { test } from "node:test";
import assert from "node:assert/strict";
import {
  GeminiService,
  GeminiQuotaError,
  GeminiImageUnavailableError,
  convertMainTasksToRows,
  pickDailyFocusAngle,
  hashSeed,
  sanitizeGoalEdit,
  DAILY_FOCUS_ANGLES,
} from "../gemini.ts";

test("GeminiService exports all required static methods and properties", () => {
  assert.equal(typeof GeminiService.callWithRetry, "function");
  assert.equal(typeof GeminiService.detectLanguage, "function");
  assert.equal(typeof GeminiService.checkContentSafety, "function");
  assert.equal(typeof GeminiService.generateDailyFocus, "function");
  assert.equal(typeof GeminiService.evaluateDailyLog, "function");
  assert.equal(typeof GeminiService.evaluateMultiGoalDailyLog, "function");
  assert.equal(typeof GeminiService.evaluateMilestone, "function");
  assert.equal(typeof GeminiService.editGoalWithAI, "function");
  assert.equal(typeof GeminiService.sanitizeGoalEdit, "function");
  assert.equal(typeof GeminiService.rebalancePlan, "function");
  assert.equal(typeof GeminiService.evaluateRealismLocally, "function");
  assert.equal(typeof GeminiService.rebalancePlanLocally, "function");
  assert.equal(typeof GeminiService.generateMiniVersion, "function");
  assert.equal(typeof GeminiService.generateCompletionCriteria, "function");
  assert.equal(typeof GeminiService.generateWeeklyReview, "function");
});

test("GeminiQuotaError and GeminiImageUnavailableError instantiate with correct properties", () => {
  const quotaErr = new GeminiQuotaError(45);
  assert.equal(quotaErr.name, "GeminiQuotaError");
  assert.equal(quotaErr.isQuotaExceeded, true);
  assert.equal(quotaErr.retryAfterSeconds, 45);

  const imgErr = new GeminiImageUnavailableError("Plan upgrade required");
  assert.equal(imgErr.name, "GeminiImageUnavailableError");
  assert.equal(imgErr.message, "Plan upgrade required");
});

test("convertMainTasksToRows converts and normalizes nested main/sub tasks", () => {
  const input = [
    {
      id: "main-1",
      goal_id: "goal-123",
      task: "Core Workout",
      impact_weight: 15, // should clamp to 10
      frequency: "daily",
      time_required_minutes: 40,
      completion_criteria: "Complete sets",
      subtasks: [
        {
          id: "sub-1",
          task: "Pushups",
          impact_weight: 8, // should clamp to 5
          frequency: "invalid", // should default to daily
          time_required_minutes: 15,
        },
      ],
    },
  ];

  const rows = convertMainTasksToRows(input);
  assert.equal(rows.length, 2);

  const main = rows.find((r) => r.task_type === "main");
  assert.ok(main);
  assert.equal(main.id, "main-1");
  assert.equal(main.impact_weight, 10);
  assert.equal(main.frequency, "daily");
  assert.equal(main.parent_task_id, null);

  const sub = rows.find((r) => r.task_type === "sub");
  assert.ok(sub);
  assert.equal(sub.id, "sub-1");
  assert.equal(sub.impact_weight, 5);
  assert.equal(sub.frequency, "daily");
  assert.equal(sub.parent_task_id, "main-1");
});

test("hashSeed and pickDailyFocusAngle produce deterministic angles", () => {
  const seed1 = "goal-42-2026-10-10";
  const seed2 = "goal-42-2026-10-10";
  assert.equal(hashSeed(seed1), hashSeed(seed2));

  const arAngle = pickDailyFocusAngle(seed1, "ar");
  const enAngle = pickDailyFocusAngle(seed1, "en");

  assert.ok(DAILY_FOCUS_ANGLES.some((a) => a.arLabel === arAngle.label));
  assert.ok(DAILY_FOCUS_ANGLES.some((a) => a.enLabel === enAngle.label));
  assert.equal(arAngle.prompt, enAngle.prompt);
});

test("sanitizeGoalEdit drops operations on unknown task IDs and preserves valid ones", () => {
  const existingTasks = [
    { id: "m1", task_type: "main", task_description: "Main 1" },
    { id: "s1", task_type: "sub", parent_task_id: "m1", task_description: "Sub 1" },
  ];

  const rawParsed = {
    summary: "Plan adjusted",
    task_changes: [
      { op: "update", id: "s1", task_description: "Updated Sub 1", impact_weight: 4 },
      { op: "update", id: "non-existent-id", task_description: "Should drop" },
      { op: "remove", id: "non-existent-id-2" },
      { op: "add", task_type: "sub", parent_task_id: "non-existent-parent", task_description: "Orphan sub" },
      { op: "add", task_type: "sub", parent_task_id: "m1", task_description: "Valid new sub", impact_weight: 3 },
      { op: "remove", id: "s1", reason: "Replaced" },
    ],
  };

  const sanitized = sanitizeGoalEdit(rawParsed, existingTasks);
  assert.equal(sanitized.summary, "Plan adjusted");
  assert.equal(sanitized.task_changes.length, 3);

  assert.equal(sanitized.task_changes[0].op, "update");
  assert.equal(sanitized.task_changes[0].id, "s1");

  assert.equal(sanitized.task_changes[1].op, "add");
  assert.equal(sanitized.task_changes[1].parent_task_id, "m1");

  assert.equal(sanitized.task_changes[2].op, "remove");
  assert.equal(sanitized.task_changes[2].id, "s1");
});

test("evaluator safety checks reject prohibited self-harm or violence input", async () => {
  const dangerousInput = "I want to bomb a building and hurt people";

  const milestoneResult = await GeminiService.evaluateMilestone(
    { title: "Test Goal" },
    ["Task 1"],
    dangerousInput,
    "en",
  );
  assert.equal(milestoneResult.is_milestone_accepted, false);
  assert.ok(milestoneResult.safe_redirection);

  const miniResult = await GeminiService.generateMiniVersion(
    dangerousInput,
    "Test Goal",
    "en",
  );
  assert.equal(miniResult, "");

  const criteriaResult = await GeminiService.generateCompletionCriteria(
    dangerousInput,
    "Test Goal",
    "sub",
    "en",
  );
  assert.equal(criteriaResult, "");

  const editResult = await GeminiService.editGoalWithAI(
    { id: "g1", title: "Test Goal" },
    dangerousInput,
    [],
  );
  assert.equal(editResult.status, "refused");
});
