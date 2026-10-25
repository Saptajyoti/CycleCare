import { parseDateOnly } from "./cycle.js";

const moods = ["very-low", "low", "okay", "good", "very-good"];

export function getRecentCycleHistory(periods, daysBetween, limit = 6) {
  if (
    !Array.isArray(periods) ||
    typeof daysBetween !== "function" ||
    !Number.isInteger(limit) ||
    limit <= 0
  ) return [];

  const sorted = periods
    .filter((period) =>
      period &&
      parseDateOnly(period.startDate) &&
      Number.isInteger(period.periodLength) &&
      period.periodLength >= 1 &&
      period.periodLength <= 10
    )
    .sort((first, second) => first.startDate.localeCompare(second.startDate))
    .filter((period, index, records) =>
      index === 0 || period.startDate !== records[index - 1].startDate
    );

  return sorted.slice(1).map((period, index) => {
    const previous = sorted[index];
    return {
      startDate: previous.startDate,
      cycleLength: daysBetween(previous.startDate, period.startDate),
      periodLength: previous.periodLength,
    };
  }).filter((cycle) =>
    Number.isInteger(cycle.cycleLength) && cycle.cycleLength > 0
  ).slice(-Math.max(0, limit));
}

export function getSymptomFrequency(records, limit = 5) {
  if (!Array.isArray(records)) return [];
  const counts = new Map();
  records.forEach((record) => {
    if (!Array.isArray(record?.symptoms)) return;
    new Set(record.symptoms.filter(
      (symptom) => typeof symptom === "string" && symptom.trim()
    )).forEach((symptom) => {
      counts.set(symptom, (counts.get(symptom) || 0) + 1);
    });
  });
  return [...counts.entries()]
    .map(([symptom, count]) => ({ symptom, count }))
    .sort((first, second) =>
      second.count - first.count || first.symptom.localeCompare(second.symptom)
    )
    .slice(0, Math.max(0, limit));
}

export function getMoodDistribution(records) {
  const counts = new Map(moods.map((mood) => [mood, 0]));
  if (Array.isArray(records)) {
    records.forEach((record) => {
      if (counts.has(record?.mood)) {
        counts.set(record.mood, counts.get(record.mood) + 1);
      }
    });
  }
  return moods
    .map((mood) => ({ mood, count: counts.get(mood) }))
    .filter((entry) => entry.count > 0);
}
