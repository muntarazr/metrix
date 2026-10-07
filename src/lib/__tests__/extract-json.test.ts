import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractJson } from '../gemini.ts';

test('extractJson parses valid json directly', () => {
  const res = extractJson('{"status": "ok", "value": 123}');
  assert.deepEqual(res, { status: 'ok', value: 123 });
});

test('extractJson strips markdown code blocks', () => {
  const res = extractJson('```json\n{"status": "ok"}\n```');
  assert.deepEqual(res, { status: 'ok' });
});

test('extractJson strips single-line and multi-line comments', () => {
  const raw = `{
    // status field
    "status": "ok",
    /* questions list */
    "questions": []
  }`;
  const res = extractJson(raw);
  assert.deepEqual(res, { status: 'ok', questions: [] });
});

test('extractJson handles single-quoted keys and strings', () => {
  const raw = `{'status': 'ok', 'message': 'hello'}`;
  const res = extractJson(raw);
  assert.deepEqual(res, { status: 'ok', message: 'hello' });
});

test('extractJson removes trailing commas before closing braces and brackets', () => {
  const raw = `{
    "status": "ok",
    "questions": [
      { "id": "q1", "unit": "minutes", },
    ],
  }`;
  const res = extractJson(raw);
  assert.equal(res.status, 'ok');
  assert.equal(res.questions.length, 1);
  assert.equal(res.questions[0].unit, 'minutes');
});

test('extractJson handles unquoted property names', () => {
  const raw = `{ status: "ok", count: 5 }`;
  const res = extractJson(raw);
  assert.deepEqual(res, { status: 'ok', count: 5 });
});

test('extractJson handles truncated structures with unclosed braces', () => {
  const raw = `{"status": "ok", "goal_understanding": {"summary": "lose weight"`;
  const res = extractJson(raw);
  assert.equal(res.status, 'ok');
  assert.equal(res.goal_understanding.summary, 'lose weight');
});
