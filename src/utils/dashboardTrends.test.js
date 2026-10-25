import test from "node:test";
import assert from "node:assert/strict";
import { daysBetween } from "./cycle.js";
import {
  getMoodDistribution,
  getRecentCycleHistory,
  getSymptomFrequency,
} from "./dashboardTrends.js";

test("builds recent completed cycle history with period duration", () => {
  const periods = [
    { startDate: "2025-01-01", periodLength: 5 },
    { startDate: "2025-01-29", periodLength: 4 },
    { startDate: "2025-02-26", periodLength: 6 },
    { startDate: "2025-03-26", periodLength: 3 },
  ];

  assert.deepEqual(getRecentCycleHistory(periods, daysBetween), [
    { startDate: "2025-01-01", cycleLength: 28, periodLength: 5 },
    { startDate: "2025-01-29", cycleLength: 28, periodLength: 4 },
    { startDate: "2025-02-26", cycleLength: 28, periodLength: 6 },
  ]);
});

test("ignores duplicate or invalid period entries and limits cycle history", () => {
  const periods = [
    { startDate: "2025-01-01", periodLength: 5 },
    { startDate: "2025-01-01", periodLength: 6 },
    { startDate: "invalid", periodLength: 5 },
    { startDate: "2025-01-29", periodLength: 4 },
    { startDate: "2025-02-26", periodLength: 0 },
    { startDate: "2025-02-26", periodLength: 5 },
  ];

  assert.deepEqual(getRecentCycleHistory(periods, daysBetween, 1), [
    { startDate: "2025-01-29", cycleLength: 28, periodLength: 4 },
  ]);
  assert.deepEqual(getRecentCycleHistory(periods, daysBetween, 0), []);
});

test("counts each symptom at most once per check-in and sorts frequencies", () => {
  assert.deepEqual(getSymptomFrequency([
    { symptoms: ["Cramps", "Cramps", "Fatigue"] },
    { symptoms: ["Fatigue", "Headache"] },
    { symptoms: ["Cramps"] },
  ]), [
    { symptom: "Cramps", count: 2 },
    { symptom: "Fatigue", count: 2 },
    { symptom: "Headache", count: 1 },
  ]);
});

test("counts only explicitly recorded, supported moods", () => {
  assert.deepEqual(getMoodDistribution([
    { mood: "good" },
    { mood: "good" },
    { mood: "low" },
    { mood: null },
    { mood: "not-a-mood" },
  ]), [
    { mood: "low", count: 1 },
    { mood: "good", count: 2 },
  ]);
});
