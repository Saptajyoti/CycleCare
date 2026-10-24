import { parseDateOnly } from "./cycle.js";

const periodFlows = ["spotting", "light", "medium", "heavy"];
const moods = ["very-low", "low", "okay", "good", "very-good"];
const energyLevels = ["low", "usual", "high"];
const ageGroups = ["under18", "adult", "prefer-not"];

export function validateImportData(data, { today, availableSymptoms }) {
  if (
    !data ||
    !Array.isArray(data.periods) ||
    !Array.isArray(data.symptoms)
  ) {
    throw new Error("Invalid CycleCare export shape");
  }

  const periods = data.periods;
  const symptoms = data.symptoms;
  const validPeriods = periods.every(
    (entry) =>
      entry &&
      parseDateOnly(entry.startDate) &&
      entry.startDate <= today &&
      Number.isInteger(Number(entry.periodLength)) &&
      Number(entry.periodLength) >= 1 &&
      Number(entry.periodLength) <= 10 &&
      (entry.flow === undefined || periodFlows.includes(entry.flow)) &&
      (entry.changesEveryHour === undefined || typeof entry.changesEveryHour === "boolean") &&
      (entry.largeClots === undefined || typeof entry.largeClots === "boolean")
  );
  const periodDates = new Set(periods.map((entry) => entry?.startDate));
  const validSymptoms = symptoms.every(
    (entry) =>
      entry &&
      parseDateOnly(entry.date) &&
      entry.date <= today &&
      Array.isArray(entry.symptoms) &&
      entry.symptoms.every(
        (symptom) =>
          typeof symptom === "string" && availableSymptoms.includes(symptom)
      ) &&
      (entry.id === undefined || typeof entry.id === "string" || typeof entry.id === "number") &&
      (entry.note === undefined || typeof entry.note === "string") &&
      (entry.flow === undefined || entry.flow === "" || periodFlows.includes(entry.flow)) &&
      (entry.pain === undefined ||
        (Number.isFinite(Number(entry.pain)) &&
          Number(entry.pain) >= 0 &&
          Number(entry.pain) <= 10)) &&
      (entry.mood === undefined || moods.includes(entry.mood)) &&
      (entry.energy === undefined || energyLevels.includes(entry.energy)) &&
      (entry.sleepHours === undefined ||
        entry.sleepHours === null ||
        (Number.isFinite(Number(entry.sleepHours)) &&
          Number(entry.sleepHours) >= 0 &&
          Number(entry.sleepHours) <= 24)) &&
      ["medicines", "note"].every(
        (field) => entry[field] === undefined || typeof entry[field] === "string"
      ) &&
      [
        "painStopsActivities",
        "bleedingBetweenPeriods",
        "suddenSevereLowerPain",
        "veryHeavyWithFaintness",
        "pregnancyPossibleWithSymptoms",
        "selfHarmConcern",
      ].every(
        (field) => entry[field] === undefined || typeof entry[field] === "boolean"
      )
  );
  const reminders =
    data.reminders === undefined
      ? []
      : data.reminders;
  const validReminders =
    Array.isArray(reminders) &&
    reminders.every(
      (reminder) =>
        reminder &&
        typeof reminder.id === "string" &&
        typeof reminder.title === "string" &&
        typeof reminder.message === "string" &&
        /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(reminder.time) &&
        typeof reminder.enabled === "boolean"
    );
  const validProfile =
    (data.ageGroup === undefined || ageGroups.includes(data.ageGroup)) &&
    (data.pregnancyMode === undefined || typeof data.pregnancyMode === "boolean") &&
    (data.trackedSymptoms === undefined ||
      (Array.isArray(data.trackedSymptoms) &&
        data.trackedSymptoms.every((symptom) => availableSymptoms.includes(symptom))));

  if (
    !validPeriods ||
    periodDates.size !== periods.length ||
    !validSymptoms ||
    !validReminders ||
    !validProfile
  ) {
    throw new Error("Export contains invalid or unsupported records");
  }

  return {
    periods,
    symptoms,
    reminders,
    pregnancyMode: data.pregnancyMode === true,
    ageGroup: ageGroups.includes(data.ageGroup) ? data.ageGroup : "adult",
    trackedSymptoms: Array.isArray(data.trackedSymptoms)
      ? data.trackedSymptoms
      : availableSymptoms,
  };
}
