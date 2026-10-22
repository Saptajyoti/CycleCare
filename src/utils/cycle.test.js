import test from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  daysBetween,
  getCycleEstimate,
  localDateStringForDate,
  parseDateOnly,
} from "./cycle.js";

function datesFromIntervals(intervals, start = "2025-01-01") {
  const dates = [start];
  let current = parseDateOnly(start);

  intervals.forEach((interval) => {
    current = addDays(current, interval);
    dates.push(localDateStringForDate(current));
  });

  return dates.map((startDate) => ({ startDate }));
}

test("validates date-only values, including leap days", () => {
  assert.equal(parseDateOnly("2024-02-29")?.getDate(), 29);
  assert.equal(parseDateOnly("2025-02-29"), null);
  assert.equal(parseDateOnly("2025-13-01"), null);
  assert.equal(parseDateOnly("2025-1-01"), null);
  assert.equal(parseDateOnly(null), null);
});

test("calculates day intervals across month and year boundaries", () => {
  assert.equal(daysBetween("2024-12-31", "2025-01-01"), 1);
  assert.equal(daysBetween("2024-02-28", "2024-03-01"), 2);
  assert.equal(daysBetween("2025-02-30", "2025-03-01"), null);
});

test("does not estimate with fewer than two complete intervals", () => {
  assert.equal(getCycleEstimate([]), null);
  assert.equal(getCycleEstimate([{ startDate: "2025-01-01" }]), null);
  assert.equal(
    getCycleEstimate([{ startDate: "2025-01-01" }, { startDate: "2025-01-30" }]),
    null
  );
});

test("ignores malformed and duplicate dates before estimating", () => {
  const estimate = getCycleEstimate([
    { startDate: "2025-01-01" },
    { startDate: "2025-01-01" },
    { startDate: "not-a-date" },
    { startDate: "2025-01-30" },
    { startDate: "2025-03-01" },
  ]);

  assert.equal(estimate?.medianCycleLength, 30);
  assert.equal(estimate?.cyclesUsed, 2);
});

test("uses only the six most recent complete intervals", () => {
  const estimate = getCycleEstimate(
    datesFromIntervals([60, 30, 31, 29, 30, 30, 31, 30])
  );

  assert.equal(estimate?.cyclesUsed, 6);
  assert.equal(estimate?.medianCycleLength, 30);
});

test("flags an unusually long recent gap for user review", () => {
  const periods = datesFromIntervals([28, 29, 28, 45]);
  const estimate = getCycleEstimate(periods);

  assert.equal(estimate?.needsReview, true);
  assert.equal(
    getCycleEstimate(periods, estimate.gapKey)?.needsReview,
    undefined
  );
});

test("widens uncertain estimates for irregular recent intervals", () => {
  const periods = datesFromIntervals([28, 28, 28, 38]);
  const review = getCycleEstimate(periods);
  const estimate = getCycleEstimate(periods, review.gapKey);

  assert.equal(estimate?.isIrregular, true);
  assert.equal(estimate?.medianCycleLength, 28);
  assert.equal(estimate?.spreadDays, 10);
});

test("calculates a date window across a year boundary", () => {
  const estimate = getCycleEstimate(
    datesFromIntervals([31, 30], "2024-10-01")
  );

  assert.equal(estimate?.medianCycleLength, 31);
  assert.equal(localDateStringForDate(estimate.nextStart), "2025-01-01");
  assert.equal(localDateStringForDate(estimate.windowStart), "2024-12-30");
  assert.equal(localDateStringForDate(estimate.windowEnd), "2025-01-03");
});
