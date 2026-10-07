import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calendarDaysSinceGoalCreation,
  getSuggestionsUnlockStatus,
  SUGGESTIONS_REQUIRED_DAYS,
} from '../goal-dates.ts';

test('calendarDaysSinceGoalCreation returns 0 for today', () => {
  const today = new Date().toISOString();
  const days = calendarDaysSinceGoalCreation(today);
  assert.equal(days, 0);
});

test('calendarDaysSinceGoalCreation returns correct difference for past dates', () => {
  const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
  const days = calendarDaysSinceGoalCreation(threeDaysAgo);
  assert.equal(days, 3);
});

test('getSuggestionsUnlockStatus locks goals younger than 5 days', () => {
  const today = new Date().toISOString();
  const statusToday = getSuggestionsUnlockStatus(today);
  assert.equal(statusToday.isLocked, true);
  assert.equal(statusToday.daysPassed, 0);
  assert.equal(statusToday.daysRemaining, 5);
  assert.equal(statusToday.requiredDays, 5);

  const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString();
  const statusTwoDays = getSuggestionsUnlockStatus(twoDaysAgo);
  assert.equal(statusTwoDays.isLocked, true);
  assert.equal(statusTwoDays.daysPassed, 2);
  assert.equal(statusTwoDays.daysRemaining, 3);

  const fourDaysAgo = new Date(Date.now() - 4 * 86400000).toISOString();
  const statusFourDays = getSuggestionsUnlockStatus(fourDaysAgo);
  assert.equal(statusFourDays.isLocked, true);
  assert.equal(statusFourDays.daysPassed, 4);
  assert.equal(statusFourDays.daysRemaining, 1);
});

test('getSuggestionsUnlockStatus unlocks goals 5 or more days old', () => {
  const fiveDaysAgo = new Date(Date.now() - 5 * 86400000).toISOString();
  const statusFiveDays = getSuggestionsUnlockStatus(fiveDaysAgo);
  assert.equal(statusFiveDays.isLocked, false);
  assert.equal(statusFiveDays.daysPassed, 5);
  assert.equal(statusFiveDays.daysRemaining, 0);

  const tenDaysAgo = new Date(Date.now() - 10 * 86400000).toISOString();
  const statusTenDays = getSuggestionsUnlockStatus(tenDaysAgo);
  assert.equal(statusTenDays.isLocked, false);
  assert.equal(statusTenDays.daysRemaining, 0);
});
