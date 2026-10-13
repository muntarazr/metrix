import test from "node:test";
import assert from "node:assert/strict";
import { translations, getTranslation, en, ar } from "@/lib/translations";
import type { TranslationKey, Language } from "@/lib/translations";

test("translations dictionary contains both en and ar locales", () => {
  assert.ok(translations.en, "en locale should exist");
  assert.ok(translations.ar, "ar locale should exist");
});

test("en and ar dictionaries have perfect bidirectional key symmetry", () => {
  const enKeys = Object.keys(en).sort();
  const arKeys = Object.keys(ar).sort();

  assert.strictEqual(enKeys.length, 481, "en should contain exactly 481 keys");
  assert.strictEqual(arKeys.length, 481, "ar should contain exactly 481 keys");

  const missingInAr = enKeys.filter((k) => !(k in ar));
  const missingInEn = arKeys.filter((k) => !(k in en));

  assert.deepStrictEqual(missingInAr, [], "ar should not miss any key present in en");
  assert.deepStrictEqual(missingInEn, [], "en should not miss any key present in ar");
});

test("all translation values are non-empty strings", () => {
  for (const [key, value] of Object.entries(en)) {
    assert.strictEqual(typeof value, "string", `en.${key} should be a string`);
    assert.ok(value.trim().length > 0, `en.${key} should not be empty`);
  }

  for (const [key, value] of Object.entries(ar)) {
    assert.strictEqual(typeof value, "string", `ar.${key} should be a string`);
    assert.ok(value.trim().length > 0, `ar.${key} should not be empty`);
  }
});

test("getTranslation returns correct localized copy", () => {
  assert.strictEqual(getTranslation("en", "settings"), "Settings");
  assert.strictEqual(getTranslation("ar", "settings"), "الإعدادات");
  assert.strictEqual(getTranslation("en", "mainTasksAndSubtasks"), "Main Tasks & Subtasks");
  assert.strictEqual(getTranslation("ar", "mainTasksAndSubtasks"), "المهام الرئيسية والفرعية");
});

test("getTranslation falls back to en if translation is missing", () => {
  const customKey = "settings" as TranslationKey;
  assert.strictEqual(getTranslation("en", customKey), "Settings");
  assert.strictEqual(getTranslation("ar", customKey), "الإعدادات");
});
