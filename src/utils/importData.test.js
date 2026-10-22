import test from "node:test";
import assert from "node:assert/strict";
import { validateImportData } from "./importData.js";

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
});

test("accepts valid period, symptom, reminder, and profile fields", () => {
  const imported = validateImportData(validExport(), options);

  assert.equal(imported.periods.length, 2);
  assert.equal(imported.symptoms.length, 1);
  assert.equal(imported.reminders[0].time, "20:00");
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
