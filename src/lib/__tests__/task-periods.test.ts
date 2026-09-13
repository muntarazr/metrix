import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getLocalDateKey,
  getLocalWeekStartMonday,
  getPeriodStart,
  getPeriodTypeFromFrequency,
} from "../task-periods.ts";

test("getLocalDateKey formats a local date as YYYY-MM-DD", () => {
  const date = new Date(2026, 8, 4); // September 4, 2026 (local)
  assert.equal(getLocalDateKey(date), "2026-09-04");
});

test("getLocalDateKey pads single-digit month and day", () => {
  const date = new Date(2026, 0, 5); // January 5, 2026
  assert.equal(getLocalDateKey(date), "2026-01-05");
});

test("getLocalWeekStartMonday returns the same Monday when given a Monday", () => {
  const monday = new Date(2026, 8, 7); // 2026-09-07 is a Monday
  assert.equal(getLocalWeekStartMonday(monday), "2026-09-07");
});

test("getLocalWeekStartMonday rolls a Sunday back to the previous Monday", () => {
  const sunday = new Date(2026, 8, 13); // 2026-09-13 is a Sunday
  assert.equal(getLocalWeekStartMonday(sunday), "2026-09-07");
});

test("getLocalWeekStartMonday rolls a Saturday back to that week's Monday", () => {
  const saturday = new Date(2026, 8, 12); // 2026-09-12 is a Saturday
  assert.equal(getLocalWeekStartMonday(saturday), "2026-09-07");
});

test("getPeriodStart uses the week start for weekly tasks", () => {
  const wednesday = new Date(2026, 8, 9); // 2026-09-09 is a Wednesday
  assert.equal(getPeriodStart("weekly", wednesday), "2026-09-07");
});

test("getPeriodStart uses the local day for daily tasks", () => {
  const wednesday = new Date(2026, 8, 9);
  assert.equal(getPeriodStart("daily", wednesday), "2026-09-09");
});

test("getPeriodTypeFromFrequency defaults unknown values to daily", () => {
  assert.equal(getPeriodTypeFromFrequency("weekly"), "weekly");
  assert.equal(getPeriodTypeFromFrequency("daily"), "daily");
  assert.equal(getPeriodTypeFromFrequency("nonsense"), "daily");
});
