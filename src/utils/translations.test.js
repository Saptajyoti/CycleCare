import test from "node:test";
import assert from "node:assert/strict";
import { navigationKeys, translate, translateSelfCare } from "./translations.js";

test("navigation and accessibility settings have English and Hindi labels", () => {
  for (const key of Object.values(navigationKeys)) {
    assert.ok(translate("en", key), `Missing English label: ${key}`);
    assert.ok(translate("hi", key), `Missing Hindi label: ${key}`);
  }

  for (const key of [
    "devicePreview",
    "language",
    "readingVoice",
    "ageGroup",
    "textSize",
    "highContrast",
    "readThisScreen",
  ]) {
    assert.ok(translate("en", key), `Missing English setting: ${key}`);
    assert.ok(translate("hi", key), `Missing Hindi setting: ${key}`);
    assert.notEqual(translate("hi", key), translate("en", key));
  }
});

test("translation helpers fall back to English and localize self-care labels", () => {
  assert.equal(translate("unknown", "navOverview"), "Overview");
  assert.equal(translate("hi", "unknownKey"), "unknownKey");
  assert.equal(translateSelfCare("hi", "category", "nutrition", 0), "पोषण");
  assert.equal(translateSelfCare("en", "category", "nutrition", 0), null);
});
