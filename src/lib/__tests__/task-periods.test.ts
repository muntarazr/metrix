import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getLocalDateKey,
  getLocalWeekStartMonday,
  getPeriodStart,
  getPeriodTypeFromFrequency,
  getLocalDayWindow,
  normalizeScheduleDays,
  toggleScheduleDay,
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

test("getLocalDayWindow returns start at 00:00:00 and end at 00:00:00 next day", () => {
  const ref = new Date(2026, 8, 17, 15, 30, 0); // 3:30 PM on Sept 17, 2026
  const { start, end } = getLocalDayWindow(ref);

  assert.equal(start.getFullYear(), 2026);
  assert.equal(start.getMonth(), 8);
  assert.equal(start.getDate(), 17);
  assert.equal(start.getHours(), 0);
  assert.equal(start.getMinutes(), 0);
  assert.equal(start.getSeconds(), 0);
  assert.equal(start.getMilliseconds(), 0);

  assert.equal(end.getFullYear(), 2026);
  assert.equal(end.getMonth(), 8);
  assert.equal(end.getDate(), 18);
  assert.equal(end.getHours(), 0);
  assert.equal(end.getMinutes(), 0);
  assert.equal(end.getSeconds(), 0);
  assert.equal(end.getMilliseconds(), 0);

  // A log from yesterday (Sept 16 23:59:59) is strictly before start
  const yesterdayLog = new Date(2026, 8, 16, 23, 59, 59);
  assert.equal(yesterdayLog < start, true);

  // A log from today (Sept 17 10:00:00) is within [start, end)
  const todayLog = new Date(2026, 8, 17, 10, 0, 0);
  assert.equal(todayLog >= start && todayLog < end, true);
});

test("normalizeScheduleDays cleans, deduplicates, and bounds weekday arrays", () => {
  assert.equal(normalizeScheduleDays(null), null);
  assert.equal(normalizeScheduleDays(undefined), null);
  assert.equal(normalizeScheduleDays("not an array"), null);
  assert.equal(normalizeScheduleDays([]), null);
  assert.equal(normalizeScheduleDays([0, 1, 2, 3, 4, 5, 6]), null); // all 7 days returns null
  assert.deepEqual(normalizeScheduleDays([3, 1, 1, 3, 5]), [1, 3, 5]);
  assert.deepEqual(normalizeScheduleDays([0, 8, -2, 4]), [0, 4]); // filters out-of-range
});

test("toggleScheduleDay toggles a day on and off correctly", () => {
  // When initially null (all days active), toggling Friday (5) removes it
  const withoutFriday = toggleScheduleDay(null, 5);
  assert.deepEqual(withoutFriday, [0, 1, 2, 3, 4, 6]);

  // Toggling Friday back on gives null (because all 7 days are active again)
  const restoredAll = toggleScheduleDay(withoutFriday, 5);
  assert.equal(restoredAll, null);

  // Toggling Monday (1) when only [1, 3] active removes it, leaving [3]
  const onlyWed = toggleScheduleDay([1, 3], 1);
  assert.deepEqual(onlyWed, [3]);

  // Toggling Friday (5) when [3] active adds it, giving [3, 5]
  const wedAndFri = toggleScheduleDay(onlyWed, 5);
  assert.deepEqual(wedAndFri, [3, 5]);
});

