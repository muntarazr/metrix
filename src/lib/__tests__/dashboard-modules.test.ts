import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeBreakdown,
  hasMeaningfulProgress,
} from "@/components/dashboard/types";
import {
  heatTier,
  parseLocalDay,
  getDayBadgeLabel,
} from "@/components/dashboard/day-calendar-helpers";

test("normalizeBreakdown correctly parses raw breakdown json and handles defaults", () => {
  const sampleBreakdown = {
    items: [
      { task_id: "task-1", points: "5", status: "done" },
      { task_id: "task-2", points: 3, status: "partial" },
      { task_id: "task-3" },
    ],
  };

  const parsed = normalizeBreakdown(sampleBreakdown);
  assert.equal(parsed.length, 3);
  assert.deepEqual(parsed[0], { task_id: "task-1", points: 5, status: "done" });
  assert.deepEqual(parsed[1], { task_id: "task-2", points: 3, status: "partial" });
  assert.deepEqual(parsed[2], { task_id: "task-3", points: 0, status: undefined });
});

test("hasMeaningfulProgress correctly checks whether task has points or completion", () => {
  assert.equal(hasMeaningfulProgress({ task_id: "1", points: 2 }), true);
  assert.equal(hasMeaningfulProgress({ task_id: "2", status: "done" }), true);
  assert.equal(hasMeaningfulProgress({ task_id: "3", status: "partial" }), true);
  assert.equal(hasMeaningfulProgress({ task_id: "4", points: 0, status: "idle" }), false);
  assert.equal(hasMeaningfulProgress({ task_id: "5", points: 0, status: "missed" }), false);
});

test("heatTier calculates correct heat levels and handles edge cases", () => {
  // No logs -> Tier 0
  assert.equal(heatTier(0, 10, false), 0);
  assert.equal(heatTier(10, 10, false), 0);

  // Logged, 0 or negative points -> Tier 1
  assert.equal(heatTier(0, 10, true), 1);
  assert.equal(heatTier(-5, 10, true), 1);

  // Ratio < 0.35 -> Tier 2
  assert.equal(heatTier(2, 10, true), 2);
  assert.equal(heatTier(3, 10, true), 2);

  // Ratio >= 0.35 and < 0.6 -> Tier 3
  assert.equal(heatTier(3.5, 10, true), 3);
  assert.equal(heatTier(5, 10, true), 3);

  // Ratio >= 0.6 and < 0.85 -> Tier 4
  assert.equal(heatTier(6, 10, true), 4);
  assert.equal(heatTier(8, 10, true), 4);

  // Ratio >= 0.85 -> Tier 5
  assert.equal(heatTier(8.5, 10, true), 5);
  assert.equal(heatTier(9.9, 10, true), 5);
  assert.equal(heatTier(10, 10, true), 5);
  assert.equal(heatTier(20, 10, true), 5);

  // Edge case: dailyCap is 0 or negative
  assert.equal(heatTier(1, 0, true), 2);
});

test("parseLocalDay parses YYYY-MM-DD correctly without timezone drift", () => {
  const date = parseLocalDay("2026-10-10");
  assert.equal(date.getFullYear(), 2026);
  assert.equal(date.getMonth(), 9); // October is index 9
  assert.equal(date.getDate(), 10);
  assert.equal(date.getHours(), 0);

  const dateWithTime = parseLocalDay("2025-01-05T14:30:00Z");
  assert.equal(dateWithTime.getFullYear(), 2025);
  assert.equal(dateWithTime.getMonth(), 0);
  assert.equal(dateWithTime.getDate(), 5);
});

test("getDayBadgeLabel returns bilingual badges correctly", () => {
  assert.equal(getDayBadgeLabel("exceptional", "ar"), "يوم استثنائي");
  assert.equal(getDayBadgeLabel("exceptional", "en"), "Exceptional Day");
  assert.equal(getDayBadgeLabel("strong", "ar"), "يوم قوي");
  assert.equal(getDayBadgeLabel("strong", "en"), "Strong Day");
  assert.equal(getDayBadgeLabel("none", "ar"), null);
  assert.equal(getDayBadgeLabel("none", "en"), null);
});
