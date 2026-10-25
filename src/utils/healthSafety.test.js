import test from "node:test";
import assert from "node:assert/strict";
import { getHealthSafetyGuidance } from "../../shared/healthSafety.js";

test("urgent guidance is selected for heavy bleeding with faintness", () => {
  for (const question of [
    "I am bleeding a lot and feel dizzy",
    "I'm soaking through a pad every hour and feel dizzzy",
    "I change my pads every 1-2 hours and feel lightheaded",
    "My period is very heavy and I nearly fainted",
  ]) {
    assert.equal(getHealthSafetyGuidance(question)?.category, "urgent");
  }
});

test("urgent guidance covers sudden severe pain and pregnancy warning symptoms", () => {
  assert.equal(
    getHealthSafetyGuidance("I have sudden severe cramps")?.category,
    "urgent"
  );
  assert.equal(
    getHealthSafetyGuidance("I might be pregnant and have bleeding")?.category,
    "urgent"
  );
  assert.equal(
    getHealthSafetyGuidance("Could I be pregnant because my period is late?")?.category,
    "medical"
  );
});

test("misspelled, indirect and ambiguous period concerns receive fixed medical guidance", () => {
  assert.equal(
    getHealthSafetyGuidance("My cycles are irreglar, should I worry?")?.category,
    "medical"
  );
  assert.match(
    getHealthSafetyGuidance("My bleeding has lasted 9 days")?.message || "",
    /longer than 7 days/
  );
  assert.equal(
    getHealthSafetyGuidance("I have to change pads each hour")?.category,
    "medical"
  );
  assert.equal(
    getHealthSafetyGuidance("Period cramps keep me from going to school")?.category,
    "medical"
  );
});

test("ordinary educational questions are not intercepted", () => {
  assert.equal(getHealthSafetyGuidance("What is a menstrual cycle?"), null);
});

test("Hindi urgent descriptions are screened locally", () => {
  assert.equal(
    getHealthSafetyGuidance("बहुत ज्यादा रक्तस्राव और चक्कर आ रहे हैं")?.category,
    "urgent"
  );
  assert.equal(
    getHealthSafetyGuidance("मैं मरना चाहती हूँ")?.category,
    "urgent"
  );
});
