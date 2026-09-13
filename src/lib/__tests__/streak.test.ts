import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeStreak,
  freezesUsedThisWeek,
  hasFreezeBudget,
  getFreezableDate,
  parseStreakFreezes,
  FREEZES_PER_WEEK,
} from "../streak.ts";

const TODAY = new Date(2026, 8, 10); // Thursday, 2026-09-10

test("computeStreak counts consecutive logged days ending today", () => {
  const logged = new Set(["2026-09-10", "2026-09-09", "2026-09-08"]);
  assert.equal(computeStreak(logged, [], TODAY), 3);
});

test("computeStreak does not break the streak when today has no log yet", () => {
  const logged = new Set(["2026-09-09", "2026-09-08"]);
  assert.equal(computeStreak(logged, [], TODAY), 2);
});

test("computeStreak breaks on the first real gap before today", () => {
  const logged = new Set(["2026-09-10", "2026-09-08"]); // missing 09-09
  assert.equal(computeStreak(logged, [], TODAY), 1);
});

test("computeStreak treats a frozen day as a held day, not a break", () => {
  // 09-09 is frozen (not logged) between two logged runs; it should not
  // break the chain, but a rest day itself is not counted as a logged day.
  const logged = new Set(["2026-09-10", "2026-09-08", "2026-09-07"]);
  const freezes = ["2026-09-09"];
  assert.equal(computeStreak(logged, freezes, TODAY), 3);
});

test("parseStreakFreezes drops anything that is not a YYYY-MM-DD string", () => {
  assert.deepEqual(
    parseStreakFreezes(["2026-09-09", "not-a-date", 42, null, "2026-13-99"]),
    // Note: parseStreakFreezes only checks shape, not calendar validity.
    ["2026-09-09", "2026-13-99"],
  );
  assert.deepEqual(parseStreakFreezes(null), []);
  assert.deepEqual(parseStreakFreezes(undefined), []);
});

test("freezesUsedThisWeek only counts freezes inside the current Monday-start week", () => {
  const freezes = ["2026-09-08", "2026-08-31"]; // this week + last week
  assert.equal(freezesUsedThisWeek(freezes, TODAY), 1);
});

test("hasFreezeBudget respects the one-per-week limit", () => {
  assert.equal(FREEZES_PER_WEEK, 1);
  assert.equal(hasFreezeBudget([], TODAY), true);
  assert.equal(hasFreezeBudget(["2026-09-08"], TODAY), false);
});

test("getFreezableDate offers yesterday when it is empty and the streak stands behind it", () => {
  const logged = new Set(["2026-09-08"]); // day before yesterday logged, yesterday empty
  assert.equal(getFreezableDate(logged, [], TODAY), "2026-09-09");
});

test("getFreezableDate returns null when yesterday was already logged", () => {
  const logged = new Set(["2026-09-09", "2026-09-08"]);
  assert.equal(getFreezableDate(logged, [], TODAY), null);
});

test("getFreezableDate returns null when there is no budget left this week", () => {
  const logged = new Set(["2026-09-08"]);
  assert.equal(getFreezableDate(logged, ["2026-09-07"], TODAY), null);
});

test("getFreezableDate returns null when nothing stands behind the gap", () => {
  const logged = new Set<string>(); // nothing logged at all
  assert.equal(getFreezableDate(logged, [], TODAY), null);
});
