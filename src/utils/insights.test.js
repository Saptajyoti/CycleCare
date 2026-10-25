import test from "node:test";
import assert from "node:assert/strict";
import { getCrossCyclePatterns } from "./insights.js";

const periods = [
  { startDate: "2025-01-01" },
  { startDate: "2025-01-29" },
  { startDate: "2025-02-26" },
  { startDate: "2025-03-26" },
  { startDate: "2025-04-23" },
];

test("counts symptom patterns once per distinct logged cycle", () => {
  const patterns = getCrossCyclePatterns(periods, [
    { date: "2025-01-05", symptoms: ["Cramps", "Cramps"] },
    { date: "2025-01-10", symptoms: ["Cramps"] },
    { date: "2025-02-01", symptoms: ["Cramps"] },
    { date: "2025-03-01", symptoms: ["Cramps"] },
    { date: "2025-04-01", symptoms: ["Headache"] },
  ]);

  assert.deepEqual(patterns, [
    { symptom: "Cramps", cycleCount: 3, cyclesChecked: 4 },
  ]);
});

test("does not report patterns from fewer than three cycles or outside recorded cycles", () => {
  const patterns = getCrossCyclePatterns(periods.slice(0, 3), [
    { date: "2025-01-05", symptoms: ["Cramps"] },
    { date: "2025-02-01", symptoms: ["Cramps"] },
  ]);
  assert.deepEqual(patterns, []);
  assert.deepEqual(getCrossCyclePatterns([], []), []);
});

test("uses only the latest six complete cycles", () => {
  const manyPeriods = Array.from({ length: 9 }, (_, index) => ({
    startDate: `2025-${String(index + 1).padStart(2, "0")}-01`,
  }));
  const symptoms = manyPeriods.slice(0, -1).map((period) => ({
    date: period.startDate,
    symptoms: ["Cramps"],
  }));
  const patterns = getCrossCyclePatterns(manyPeriods, symptoms);
  assert.deepEqual(patterns, [
    { symptom: "Cramps", cycleCount: 6, cyclesChecked: 6 },
  ]);
});
