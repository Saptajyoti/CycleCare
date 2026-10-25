import test from "node:test";
import assert from "node:assert/strict";
import {
  createEmptySelfCareData,
  normalizeSelfCareData,
  selfCareCategories,
  selfCareSuggestions,
  validateSelfCareData,
} from "./selfCare.js";

test("self-care suggestions cover the four requested areas with non-treatment language", () => {
  assert.deepEqual(
    selfCareCategories.map((category) => category.id),
    ["nutrition", "refreshments", "relaxation", "physical-comfort"]
  );
  assert.ok(selfCareSuggestions.some((item) => item.id === "balanced-plate"));
  assert.ok(selfCareSuggestions.some((item) => item.id === "fresh-water"));
  assert.ok(selfCareSuggestions.some((item) => item.id === "slow-breathing"));
  assert.ok(selfCareSuggestions.some((item) => item.id === "gentle-stretch"));
  assert.ok(selfCareSuggestions.every(
    (item) => !/\b(?:cures|will cure|regulates hormones|will regulate hormones|treats cramps|will treat cramps)\b/i.test(
      `${item.title} ${item.description} ${item.detail}`
    )
  ));
});

test("creates valid defaults and validates checklist, favorite, feedback, and reminder data", () => {
  const defaults = createEmptySelfCareData();
  assert.equal(validateSelfCareData(defaults), true);
  assert.equal(normalizeSelfCareData(null).reminder.enabled, false);

  const saved = {
    ...defaults,
    completedByDate: { "2025-05-30": ["slow-breathing"] },
    favorites: ["fresh-water"],
    comfortFeedback: {
      "fresh-water": { date: "2025-05-30", helped: true },
    },
    reminder: { enabled: true, time: "19:30", lastFiredDate: "2025-05-29" },
  };
  assert.equal(validateSelfCareData(saved, "2025-05-30"), true);
  assert.deepEqual(normalizeSelfCareData(JSON.stringify(saved)), saved);
  assert.equal(validateSelfCareData(saved, "2025-05-28"), false);
  assert.throws(() => normalizeSelfCareData("{"), /could not be read/);
  assert.throws(() => normalizeSelfCareData({ version: 2 }), /unsupported version/);
  assert.equal(validateSelfCareData({
    ...saved,
    favorites: ["unrecognized-item"],
  }), false);
  assert.equal(validateSelfCareData({
    ...saved,
    reminder: { enabled: true, time: "24:00", lastFiredDate: "" },
  }), false);
});
