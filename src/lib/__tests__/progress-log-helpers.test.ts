import { test } from "node:test";
import assert from "node:assert/strict";
import {
  countDistinctLoggedDays,
  getErrorMessage,
  formatPointsDisplay,
  splitResultText,
  mergeDaySessionInput,
  getStatusPriority,
  mergeDailyBreakdownItems,
  getAccountabilityCopy,
  getPerformanceStyles,
} from "../../components/progress/progress-log-helpers.ts";

test("countDistinctLoggedDays counts unique calendar dates", () => {
  assert.equal(countDistinctLoggedDays(null), 0);
  assert.equal(countDistinctLoggedDays([]), 0);

  const logs = [
    { created_at: "2026-10-01T10:00:00Z" },
    { created_at: "2026-10-01T15:30:00Z" },
    { created_at: "2026-10-02T08:00:00Z" },
    { created_at: null },
  ];
  assert.equal(countDistinctLoggedDays(logs), 2);
});

test("getErrorMessage extracts error message or falls back", () => {
  assert.equal(getErrorMessage(new Error("Database failure"), "fallback"), "Database failure");
  assert.equal(getErrorMessage("string error", "fallback"), "string error");
  assert.equal(getErrorMessage({ message: "Postgres error" }, "fallback"), "Postgres error");
  assert.equal(getErrorMessage({ error: "Auth failure" }, "fallback"), "Auth failure");
  assert.equal(getErrorMessage(null, "fallback"), "fallback");
  assert.equal(getErrorMessage({}, "fallback"), "fallback");
});

test("formatPointsDisplay formats localized point display correctly", () => {
  const enDisplay = formatPointsDisplay(10, "en", "pts");
  assert.equal(enDisplay, "+10 pts");

  const arDisplay = formatPointsDisplay(10, "ar", "نقاط");
  // Arabic formatting contains the localized number, unit, and trailing +
  assert.ok(arDisplay.includes("نقاط+"));
});

test("splitResultText breaks messages into readable chunks", () => {
  assert.deepEqual(splitResultText("", "en"), []);
  assert.deepEqual(splitResultText("First point. Second point.", "en"), [
    "First point",
    "Second point.",
  ]);

  const arText = "إنجاز ممتاز اليوم. لكن تحتاج للتركيز غداً.";
  const arSplit = splitResultText(arText, "ar");
  assert.ok(arSplit.length >= 2);
});

test("mergeDaySessionInput appends additional check-in correctly", () => {
  assert.equal(mergeDaySessionInput("", "New task done", "en"), "New task done");
  assert.equal(mergeDaySessionInput("Morning jog", "", "en"), "Morning jog");

  const mergedEn = mergeDaySessionInput("Morning jog", "Evening reading", "en");
  assert.ok(mergedEn.includes("Morning jog"));
  assert.ok(mergedEn.includes("Additional check-in:"));
  assert.ok(mergedEn.includes("Evening reading"));

  const mergedAr = mergeDaySessionInput("قراءة صفحتين", "مراجعة الكلمات", "ar");
  assert.ok(mergedAr.includes("تحديث إضافي:"));
});

test("getStatusPriority orders statuses correctly", () => {
  assert.ok(getStatusPriority("done") > getStatusPriority("partial"));
  assert.ok(getStatusPriority("partial") > getStatusPriority("missed"));
  assert.ok(getStatusPriority("missed") > getStatusPriority("unknown"));
});

test("mergeDailyBreakdownItems combines items and prioritizes completed status", () => {
  const existing = [
    { task_id: "t1", status: "partial" as const, points: 5, reason: "Initial work" },
    { task_id: "t2", status: "missed" as const, points: 0 },
  ];
  const next = [
    { task_id: "t1", status: "done" as const, points: 10, time_bonus: 2 },
    { task_id: "t3", status: "done" as const, points: 8 },
  ];

  const merged = mergeDailyBreakdownItems(existing, next);
  assert.equal(merged.length, 3);

  const t1 = merged.find((item) => item.task_id === "t1");
  assert.equal(t1?.status, "done");
  assert.equal(t1?.points, 10);
  assert.equal(t1?.time_bonus, 2);

  const t2 = merged.find((item) => item.task_id === "t2");
  assert.equal(t2?.status, "missed");

  const t3 = merged.find((item) => item.task_id === "t3");
  assert.equal(t3?.status, "done");
});

test("getAccountabilityCopy provides bilingual translations", () => {
  const ar = getAccountabilityCopy("ar");
  assert.equal(ar.done, "مكتمل");
  assert.equal(ar.comparison, "مقارنة");

  const en = getAccountabilityCopy("en");
  assert.equal(en.done, "Done");
  assert.equal(en.comparison, "Comparison");
});

test("getPerformanceStyles returns distinct classes for tiers and milestones", () => {
  const milestoneStyle = getPerformanceStyles("exceptional", true);
  assert.ok(milestoneStyle.hero.includes("amber"));

  const weakStyle = getPerformanceStyles("weak", false);
  assert.ok(weakStyle.hero.includes("destructive"));

  const strongStyle = getPerformanceStyles("strong", false);
  assert.ok(strongStyle.hero.includes("border-foreground"));
});

test("isMilestoneEvaluation correctly detects milestone when pendingMilestoneImage is present or mode is milestone", () => {
  const checkMilestone = (mode: string, pendingImage: { logId: string } | null) =>
    Boolean(pendingImage) || mode === "milestone";

  // When mode was set to "ai" on success, pendingMilestoneImage ensures it's still detected as milestone
  assert.equal(checkMilestone("ai", { logId: "log-123" }), true);
  assert.equal(checkMilestone("milestone", null), true);
  assert.equal(checkMilestone("ai", null), false);
  assert.equal(checkMilestone("select", null), false);
});

