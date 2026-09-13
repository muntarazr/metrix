import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildTaskHierarchy,
  getScorableTasks,
  calculateDailyCap,
  normalizeTaskRow,
  type TaskRow,
} from "../task-hierarchy.ts";

function makeRow(overrides: Partial<TaskRow>): TaskRow {
  return {
    id: "id",
    goal_id: "goal",
    task_description: "desc",
    impact_weight: 1,
    frequency: "daily",
    task_type: "main",
    parent_task_id: null,
    sort_order: 0,
    ...overrides,
  };
}

test("normalizeTaskRow clamps sub-task weight to 5 and main weight to 10", () => {
  const sub = normalizeTaskRow(
    makeRow({ id: "s1", task_type: "sub", parent_task_id: "m1", impact_weight: 999 }),
  );
  assert.equal(sub.impact_weight, 5);

  const main = normalizeTaskRow(makeRow({ id: "m1", task_type: "main", impact_weight: 999 }));
  assert.equal(main.impact_weight, 10);
});

test("normalizeTaskRow drops parent_task_id for main tasks", () => {
  const main = normalizeTaskRow(
    makeRow({ id: "m1", task_type: "main", parent_task_id: "should-be-dropped" }),
  );
  assert.equal(main.parent_task_id, null);
});

test("normalizeTaskRow defaults unknown frequency to daily", () => {
  const row = normalizeTaskRow(makeRow({ frequency: "monthly" }));
  assert.equal(row.frequency, "daily");
});

test("buildTaskHierarchy nests sub-tasks under their parent main task", () => {
  const rows: TaskRow[] = [
    makeRow({ id: "m1", task_type: "main", task_description: "Main 1" }),
    makeRow({ id: "s1", task_type: "sub", parent_task_id: "m1", task_description: "Sub 1" }),
    makeRow({ id: "s2", task_type: "sub", parent_task_id: "m1", task_description: "Sub 2" }),
  ];
  const mains = buildTaskHierarchy(rows);
  assert.equal(mains.length, 1);
  assert.equal(mains[0].subtasks.length, 2);
  assert.deepEqual(mains[0].subtasks.map((s) => s.id), ["s1", "s2"]);
});

test("buildTaskHierarchy drops orphan sub-tasks with no parent_task_id", () => {
  const rows: TaskRow[] = [
    makeRow({ id: "m1", task_type: "main" }),
    makeRow({ id: "s1", task_type: "sub", parent_task_id: null }),
  ];
  const mains = buildTaskHierarchy(rows);
  assert.equal(mains.length, 1);
  assert.equal(mains[0].subtasks.length, 0);
});

test("getScorableTasks returns only sub-tasks, carrying the parent id", () => {
  const rows: TaskRow[] = [
    makeRow({ id: "m1", task_type: "main" }),
    makeRow({ id: "s1", task_type: "sub", parent_task_id: "m1", impact_weight: 3 }),
  ];
  const scorable = getScorableTasks(rows);
  assert.equal(scorable.length, 1);
  assert.equal(scorable[0].id, "s1");
  assert.equal(scorable[0].parent_task_id, "m1");
});

test("calculateDailyCap sums sub-task weights plus a base of 5", () => {
  const rows: TaskRow[] = [
    makeRow({ id: "m1", task_type: "main" }),
    makeRow({ id: "s1", task_type: "sub", parent_task_id: "m1", impact_weight: 3 }),
    makeRow({ id: "s2", task_type: "sub", parent_task_id: "m1", impact_weight: 2 }),
  ];
  assert.equal(calculateDailyCap(rows), 10); // 3 + 2 + 5
});

test("calculateDailyCap never drops below the floor of 5", () => {
  assert.equal(calculateDailyCap([]), 5);
});
