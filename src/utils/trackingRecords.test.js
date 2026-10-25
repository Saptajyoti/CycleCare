import test from "node:test";
import assert from "node:assert/strict";
import { getCycleEstimate, localDateStringForDate } from "./cycle.js";
import { getCrossCyclePatterns } from "./insights.js";
import { upsertPeriodRecord, upsertSymptomRecord } from "./trackingRecords.js";

const today = "2025-06-30";
const initialPeriods = [
  { startDate: "2025-04-01", periodLength: 5, flow: "medium" },
  { startDate: "2025-04-29", periodLength: 5, flow: "medium" },
];

test("period logging and date correction update the estimate from saved records", () => {
  const created = upsertPeriodRecord(initialPeriods, {
    startDate: "2025-05-27",
    periodLength: 4,
    flow: "light",
  }, { today });
  assert.equal(
    localDateStringForDate(getCycleEstimate(created).nextStart),
    "2025-06-24"
  );

  const corrected = upsertPeriodRecord(created, {
    ...created[2],
    startDate: "2025-05-28",
  }, { today, replacingStartDate: "2025-05-27" });
  assert.deepEqual(corrected.map((record) => record.startDate), [
    "2025-04-01",
    "2025-04-29",
    "2025-05-28",
  ]);
  assert.equal(
    localDateStringForDate(getCycleEstimate(corrected).nextStart),
    "2025-06-26"
  );
});

test("period save rejects duplicate, future, invalid, and overlapping entries", () => {
  assert.throws(() => upsertPeriodRecord(initialPeriods, {
    startDate: "2025-04-29",
    periodLength: 5,
  }, { today }), /already recorded/);
  assert.throws(() => upsertPeriodRecord(initialPeriods, {
    startDate: "2025-07-01",
    periodLength: 5,
  }, { today }), /not in the future/);
  assert.throws(() => upsertPeriodRecord(initialPeriods, {
    startDate: "2025-05-01",
    periodLength: 10,
  }, { today }), /overlap/);
});

test("symptom creation and edit retain a single record and reflect in cycle patterns", () => {
  const records = [
    { id: "check-in-1", date: "2025-04-03", symptoms: ["Cramps"] },
    { id: "check-in-2", date: "2025-05-01", symptoms: ["Cramps"] },
  ];
  const created = upsertSymptomRecord(records, {
    id: "check-in-3",
    date: "2025-05-29",
    symptoms: ["Cramps"],
  }, { today });
  assert.equal(getCrossCyclePatterns([
    ...initialPeriods,
    { startDate: "2025-05-27", periodLength: 4 },
    { startDate: "2025-06-24", periodLength: 5 },
  ], created).find((pattern) => pattern.symptom === "Cramps").cycleCount, 3);

  const edited = upsertSymptomRecord(created, {
    ...created[1],
    date: "2025-05-02",
    symptoms: ["Fatigue"],
  }, { today, editingId: "check-in-2" });
  assert.equal(edited.length, 3);
  assert.equal(edited[1].id, "check-in-2");
  assert.equal(edited[1].date, "2025-05-02");
  assert.equal(edited[1].symptoms[0], "Fatigue");
  assert.throws(() => upsertSymptomRecord(edited, {
    id: "deleted-record",
    date: "2025-05-03",
    symptoms: [],
  }, { today, editingId: "deleted-record" }), /no longer exists/);
});
