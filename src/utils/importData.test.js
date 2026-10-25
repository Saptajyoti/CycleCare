import test from "node:test";
import assert from "node:assert/strict";
import { validateImportData } from "./importData.js";
import { getCycleEstimate } from "./cycle.js";

const availableSymptoms = ["Cramps", "Headache"];
const options = { today: "2025-06-01", availableSymptoms };

function validExport() {
  return {
    periods: [
      { startDate: "2025-01-01", periodLength: 5, flow: "medium" },
      { startDate: "2025-01-30", periodLength: 4 },
    ],
    symptoms: [
      {
        id: "record-1",
        date: "2025-01-02",
        symptoms: ["Cramps"],
        pain: 3,
        mood: "okay",
        energy: "usual",
        sleepHours: 7,
        medicines: "",
      },
    ],
    reminders: [
      { id: "daily", title: "Check in", message: "Check in", time: "20:00", enabled: false },
    ],
    ageGroup: "adult",
    pregnancyMode: false,
    trackedSymptoms: availableSymptoms,
  };
}

test("accepts valid export data and fills optional profile defaults", () => {
  const { ageGroup, reminders, trackedSymptoms, pregnancyMode } =
    validateImportData(
      { periods: [], symptoms: [] },
      options
    );

  assert.equal(ageGroup, "adult");
  assert.deepEqual(reminders, []);
  assert.deepEqual(trackedSymptoms, availableSymptoms);
  assert.equal(pregnancyMode, false);
  assert.equal(validateImportData({ periods: [], symptoms: [] }, options).selfCare.version, 1);
});

test("accepts valid period, symptom, reminder, and profile fields", () => {
  const imported = validateImportData(validExport(), options);

  assert.equal(imported.periods.length, 2);
  assert.equal(imported.symptoms.length, 1);
  assert.equal(imported.reminders[0].time, "20:00");
});

test("accepts valid self-care preferences and checklist data", () => {
  const exportData = validExport();
  exportData.selfCare = {
    version: 1,
    completedByDate: {
      "2025-05-30": ["balanced-plate", "slow-breathing"],
    },
    favorites: ["fresh-water", "gentle-stretch"],
    comfortFeedback: {
      "fresh-water": { date: "2025-05-30", helped: true },
    },
    reminder: {
      enabled: true,
      time: "20:15",
      lastFiredDate: "2025-05-29",
    },
  };
  const imported = validateImportData(exportData, options);
  assert.deepEqual(imported.selfCare, exportData.selfCare);
});

test("rejects malformed self-care dates, items, feedback, and reminder settings", () => {
  const cases = [
    (data) => { data.completedByDate = { "2025-02-30": ["balanced-plate"] }; },
    (data) => { data.favorites = ["unknown-suggestion"]; },
    (data) => { data.comfortFeedback = { "fresh-water": { date: "2025-05-30", helped: "yes" } }; },
    (data) => { data.reminder.time = "25:00"; },
  ];
  for (const change of cases) {
    const data = validExport();
    data.selfCare = {
      version: 1,
      completedByDate: {},
      favorites: [],
      comfortFeedback: {},
      reminder: { enabled: false, time: "20:00", lastFiredDate: "" },
    };
    change(data.selfCare);
    assert.throws(() => validateImportData(data, options));
  }
});

test("rejects invalid, future, and duplicate period dates", () => {
  const invalidDate = validExport();
  invalidDate.periods[0].startDate = "2025-02-30";
  assert.throws(() => validateImportData(invalidDate, options));

  const futureDate = validExport();
  futureDate.periods[0].startDate = "2025-06-02";
  assert.throws(() => validateImportData(futureDate, options));

  const duplicateDate = validExport();
  duplicateDate.periods[1].startDate = duplicateDate.periods[0].startDate;
  assert.throws(() => validateImportData(duplicateDate, options));
});

test("rejects overlapping periods before imported dates can be used", () => {
  const overlapping = validExport();
  overlapping.periods[1].startDate = "2025-01-05";
  assert.throws(() => validateImportData(overlapping, options));
});

test("only validated imported dates are used for cycle estimates", () => {
  const exportData = validExport();
  exportData.periods.push({
    startDate: "2025-03-01",
    periodLength: 4,
    flow: "light",
  });
  const imported = validateImportData(exportData, options);
  assert.equal(getCycleEstimate(imported.periods)?.medianCycleLength, 30);

  const invalid = validExport();
  invalid.periods.push({
    startDate: "2025-03-01",
    periodLength: 4,
    flow: "light",
  });
  invalid.periods[1].startDate = "2025-01-05";
  assert.throws(() => {
    const rejected = validateImportData(invalid, options);
    getCycleEstimate(rejected.periods);
  });
});

test("rejects invalid symptoms, check-in dates, and reminder times", () => {
  const invalidSymptom = validExport();
  invalidSymptom.symptoms[0].symptoms = ["Unknown symptom"];
  assert.throws(() => validateImportData(invalidSymptom, options));

  const futureCheckIn = validExport();
  futureCheckIn.symptoms[0].date = "2025-06-02";
  assert.throws(() => validateImportData(futureCheckIn, options));

  const invalidReminder = validExport();
  invalidReminder.reminders[0].time = "25:00";
  assert.throws(() => validateImportData(invalidReminder, options));
});

test("rejects malformed symptom and profile field types", () => {
  const invalidPain = validExport();
  invalidPain.symptoms[0].pain = 11;
  assert.throws(() => validateImportData(invalidPain, options));

  const invalidMood = validExport();
  invalidMood.symptoms[0].mood = "unknown";
  assert.throws(() => validateImportData(invalidMood, options));

  const invalidProfile = validExport();
  invalidProfile.ageGroup = "unknown";
  assert.throws(() => validateImportData(invalidProfile, options));
});

test("rejects wrong formats, coerced numeric values, and oversized notes", () => {
  const wrongFormat = validExport();
  wrongFormat.format = "unknown-export";
  assert.throws(() => validateImportData(wrongFormat, options));

  const stringDuration = validExport();
  stringDuration.periods[0].periodLength = "5";
  assert.throws(() => validateImportData(stringDuration, options));

  const oversizedNote = validExport();
  oversizedNote.symptoms[0].note = "x".repeat(4001);
  assert.throws(() => validateImportData(oversizedNote, options));
});

test("rejects duplicate symptom IDs, symptom tags, reminder IDs, and tracked symptoms", () => {
  const duplicateId = validExport();
  duplicateId.symptoms.push({ ...duplicateId.symptoms[0] });
  assert.throws(() => validateImportData(duplicateId, options));

  const duplicateTag = validExport();
  duplicateTag.symptoms[0].symptoms = ["Cramps", "Cramps"];
  assert.throws(() => validateImportData(duplicateTag, options));

  const duplicateReminder = validExport();
  duplicateReminder.reminders.push({ ...duplicateReminder.reminders[0] });
  assert.throws(() => validateImportData(duplicateReminder, options));

  const duplicateTracked = validExport();
  duplicateTracked.trackedSymptoms = ["Cramps", "Cramps"];
  assert.throws(() => validateImportData(duplicateTracked, options));

  const nullSymptom = validExport();
  nullSymptom.symptoms.push(null);
  assert.throws(() => validateImportData(nullSymptom, options));
});
