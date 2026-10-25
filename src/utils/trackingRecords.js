import { hasOverlappingPeriods, parseDateOnly } from "./cycle.js";

export function upsertPeriodRecord(records, record, {
  today,
  replacingStartDate,
} = {}) {
  if (!Array.isArray(records)) {
    throw new TypeError("Period records must be a list.");
  }
  if (!parseDateOnly(today)) {
    throw new TypeError("A valid current date is required.");
  }
  if (
    !record ||
    !parseDateOnly(record.startDate) ||
    record.startDate > today
  ) {
    throw new Error("Choose a valid period start date that is not in the future.");
  }
  if (
    !Number.isInteger(record.periodLength) ||
    record.periodLength < 1 ||
    record.periodLength > 10
  ) {
    throw new Error("The recorded period must be between 1 and 10 days.");
  }

  const remaining = records.filter(
    (entry) => entry.startDate !== replacingStartDate
  );
  if (remaining.some((entry) => entry.startDate === record.startDate)) {
    throw new Error("This period start date is already recorded.");
  }

  const updated = [...remaining, record].sort((first, second) =>
    first.startDate.localeCompare(second.startDate)
  );
  if (hasOverlappingPeriods(updated)) {
    throw new Error("These dates overlap another recorded period.");
  }
  return updated;
}

export function upsertSymptomRecord(records, record, {
  today,
  editingId,
} = {}) {
  if (!Array.isArray(records)) {
    throw new TypeError("Symptom records must be a list.");
  }
  if (!parseDateOnly(today)) {
    throw new TypeError("A valid current date is required.");
  }
  if (
    !record ||
    !parseDateOnly(record.date) ||
    record.date > today
  ) {
    throw new Error("Choose a valid date that is not in the future.");
  }

  const existingIndex = editingId
    ? records.findIndex((entry) => entry.id === editingId)
    : -1;
  if (editingId && record.id !== editingId) {
    throw new Error("The check-in identifier changed while it was being edited.");
  }
  if (editingId && existingIndex < 0) {
    throw new Error("This check-in no longer exists. Refresh your records and try again.");
  }
  if (!editingId && records.some((entry) => entry.id === record.id)) {
    throw new Error("This check-in identifier is already in use.");
  }
  if (existingIndex < 0) return [...records, record];

  return records.map((entry, index) =>
    index === existingIndex ? record : entry
  );
}
