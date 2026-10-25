import { hasOverlappingPeriods, parseDateOnly } from "./cycle.js";

const periodFlows = ["spotting", "light", "medium", "heavy"];
const moods = ["very-low", "low", "okay", "good", "very-good"];
const energyLevels = ["low", "usual", "high"];
const ageGroups = ["under18", "adult", "prefer-not"];

export function validateImportData(data, { today, availableSymptoms }) {
  if (
    !data ||
    (data.format !== undefined && data.format !== "cyclecare-export-v1") ||
    !Array.isArray(data.periods) ||
    !Array.isArray(data.symptoms) ||
    data.periods.length > 10000 ||
    data.symptoms.length > 10000
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
      Number.isInteger(entry.periodLength) &&
      entry.periodLength >= 1 &&
      entry.periodLength <= 10 &&
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
      entry.symptoms.length <= availableSymptoms.length &&
      new Set(entry.symptoms).size === entry.symptoms.length &&
      entry.symptoms.every(
        (symptom) =>
          typeof symptom === "string" && availableSymptoms.includes(symptom)
      ) &&
      (entry.id === undefined ||
        ((typeof entry.id === "string" && entry.id.length <= 128) ||
          (typeof entry.id === "number" && Number.isFinite(entry.id)))) &&
      (entry.note === undefined || (typeof entry.note === "string" && entry.note.length <= 4000)) &&
      (entry.flow === undefined || entry.flow === "" || periodFlows.includes(entry.flow)) &&
      (entry.pain === undefined ||
        (typeof entry.pain === "number" && Number.isFinite(entry.pain) &&
          entry.pain >= 0 && entry.pain <= 10)) &&
      (entry.mood === undefined || moods.includes(entry.mood)) &&
      (entry.energy === undefined || energyLevels.includes(entry.energy)) &&
      (entry.sleepHours === undefined ||
        entry.sleepHours === null ||
        (typeof entry.sleepHours === "number" &&
          Number.isFinite(entry.sleepHours) &&
          entry.sleepHours >= 0 &&
          entry.sleepHours <= 24)) &&
      ["medicines", "note"].every(
        (field) => entry[field] === undefined ||
          (typeof entry[field] === "string" && entry[field].length <= 4000)
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
        reminder.id.length > 0 &&
        reminder.id.length <= 128 &&
        typeof reminder.title === "string" &&
        reminder.title.length > 0 &&
        reminder.title.length <= 120 &&
        typeof reminder.message === "string" &&
        reminder.message.length > 0 &&
        reminder.message.length <= 1000 &&
        /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(reminder.time) &&
        typeof reminder.enabled === "boolean"
    );
  const validProfile =
    (data.ageGroup === undefined || ageGroups.includes(data.ageGroup)) &&
    (data.pregnancyMode === undefined || typeof data.pregnancyMode === "boolean") &&
    (data.trackedSymptoms === undefined ||
      (Array.isArray(data.trackedSymptoms) &&
      data.trackedSymptoms.length <= availableSymptoms.length &&
      new Set(data.trackedSymptoms).size === data.trackedSymptoms.length &&
      data.trackedSymptoms.every((symptom) => availableSymptoms.includes(symptom))));

  if (
    !validPeriods ||
    periodDates.size !== periods.length ||
    hasOverlappingPeriods(periods) ||
    !validSymptoms ||
    new Set(symptoms.flatMap((entry) => entry?.id === undefined ? [] : [String(entry.id)])).size !==
    symptoms.filter((entry) => entry.id !== undefined).length ||
    !validReminders ||
    new Set(reminders.map((reminder) => reminder?.id)).size !== reminders.length ||
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
