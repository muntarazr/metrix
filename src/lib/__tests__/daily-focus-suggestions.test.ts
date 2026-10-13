import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDailyFocusSessionFromRow,
  normalizeDailyFocusSession,
  type DailyFocusEntryRow,
} from "@/lib/daily-focus";

test("buildDailyFocusSessionFromRow extracts applied_ids and rejected_ids and marks suggestion status", () => {
  const row: DailyFocusEntryRow = {
    id: "test-row-1",
    goal_id: "goal-123",
    prompt_date: "2026-10-13",
    question: "How is your writing habit going?",
    suggestions: {
      items: [
        {
          id: "sug-1",
          change_type: "modify_task",
          title: "Writing Practice",
          target_task_id: "task-write-1",
          action_summary: "Reduce writing duration from 45 to 20 mins",
          reason: "User expressed fatigue and lack of time",
          changes: {
            time_required_minutes: 20,
            completion_criteria: "Write 1 paragraph",
            frequency: "daily",
            impact_weight: 3,
          },
        },
        {
          id: "sug-2",
          change_type: "add_task",
          title: "Morning Stretch",
          reason: "Helps wake up before deep work",
          time_required_minutes: 10,
          frequency: "daily",
          impact_weight: 2,
        },
      ],
      applied_ids: ["sug-1"],
      rejected_ids: ["sug-2"],
    },
  };

  const session = buildDailyFocusSessionFromRow(row, {
    answeredDaysCount: 5,
    requiredAnswerDays: 1,
  });

  assert.strictEqual(session.suggestions.length, 2);
  assert.deepStrictEqual(session.appliedSuggestionIds, ["sug-1"]);
  assert.deepStrictEqual(session.rejectedSuggestionIds, ["sug-2"]);

  const sug1 = session.suggestions.find((s) => s.id === "sug-1");
  assert.ok(sug1);
  assert.strictEqual(sug1.change_type, "modify_task");
  assert.strictEqual(sug1.target_task_id, "task-write-1");
  assert.strictEqual(sug1.action_summary, "Reduce writing duration from 45 to 20 mins");
  assert.strictEqual(sug1.changes?.time_required_minutes, 20);
  assert.strictEqual(sug1.status, "applied");

  const sug2 = session.suggestions.find((s) => s.id === "sug-2");
  assert.ok(sug2);
  assert.strictEqual(sug2.change_type, "add_task");
  assert.strictEqual(sug2.status, "rejected");
});

test("normalizeDailyFocusSession preserves applied and rejected suggestion ids", () => {
  const session = normalizeDailyFocusSession({
    status: "ok",
    question: "Sample Question",
    date: "2026-10-13",
    suggestions: [],
    appliedSuggestionIds: ["sug-applied"],
    rejectedSuggestionIds: ["sug-rejected"],
  });

  assert.ok(session);
  assert.deepStrictEqual(session.appliedSuggestionIds, ["sug-applied"]);
  assert.deepStrictEqual(session.rejectedSuggestionIds, ["sug-rejected"]);
});
