export function parseDateOnly(value) {
  if (typeof value !== "string") return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const [, year, month, day] = match.map(Number);
  const date = new Date(0);
  date.setHours(0, 0, 0, 0);
  date.setFullYear(year, month - 1, day);

  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
    ? date
    : null;
}

export function localDateStringForDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function daysBetween(firstDate, secondDate) {
  const first = parseDateOnly(firstDate);
  const second = parseDateOnly(secondDate);

  if (!first || !second) return null;

  return Math.round(
    (Date.UTC(second.getFullYear(), second.getMonth(), second.getDate()) -
      Date.UTC(first.getFullYear(), first.getMonth(), first.getDate())) /
      (1000 * 60 * 60 * 24)
  );
}

export function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function hasOverlappingPeriods(entries) {
  if (!Array.isArray(entries)) return false;
  const sorted = entries
    .filter((entry) =>
      entry &&
      parseDateOnly(entry.startDate) &&
      Number.isInteger(entry.periodLength) &&
      entry.periodLength >= 1 &&
      entry.periodLength <= 10
    )
    .sort((first, second) => first.startDate.localeCompare(second.startDate));

  return sorted.some((entry, index) => {
    if (index === 0) return false;
    const previous = sorted[index - 1];
    const previousEnd = localDateStringForDate(
      addDays(parseDateOnly(previous.startDate), previous.periodLength - 1)
    );
    return entry.startDate <= previousEnd;
  });
}

function median(values) {
  if (!values.length) return null;

  const sorted = [...values].sort((first, second) => first - second);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

export function getCycleEstimate(entries, confirmedGap = "") {
  if (!Array.isArray(entries)) return null;

  const uniqueEntries = new Map();
  entries.forEach((entry) => {
    if (entry && parseDateOnly(entry.startDate) && !uniqueEntries.has(entry.startDate)) {
      uniqueEntries.set(entry.startDate, entry);
    }
  });

  const sortedEntries = [...uniqueEntries.values()].sort((first, second) =>
    first.startDate.localeCompare(second.startDate)
  );

  if (sortedEntries.length < 3) return null;

  const intervals = sortedEntries
    .slice(1)
    .map((entry, index) => ({
      days: daysBetween(sortedEntries[index].startDate, entry.startDate),
      startDate: sortedEntries[index].startDate,
      endDate: entry.startDate,
    }))
    .filter((interval) => Number.isInteger(interval.days) && interval.days > 0)
    .slice(-6);

  if (intervals.length < 2) return null;

  const intervalLengths = intervals.map((interval) => interval.days);
  const medianCycleLength = Math.round(median(intervalLengths));
  const latestInterval = intervals[intervals.length - 1];
  const previousMedian = median(intervalLengths.slice(0, -1));
  const gapKey = `${latestInterval.startDate}:${latestInterval.endDate}`;

  if (latestInterval.days > previousMedian + 7 && confirmedGap !== gapKey) {
    return { needsReview: true, gapKey };
  }

  const intervalSpread =
    Math.max(...intervalLengths) - Math.min(...intervalLengths);
  const isIrregular = intervalSpread > 7;
  const largestDeviation = Math.ceil(
    Math.max(...intervalLengths.map((interval) => Math.abs(interval - medianCycleLength)))
  );
  const spreadDays = isIrregular
    ? Math.max(7, largestDeviation)
    : Math.max(2, largestDeviation);
  const latestStart = parseDateOnly(
    sortedEntries[sortedEntries.length - 1].startDate
  );
  const nextStart = addDays(latestStart, medianCycleLength);

  return {
    cyclesUsed: intervals.length,
    historyStatus: intervals.length < 3 ? "limited" : "sufficient",
    medianCycleLength,
    isIrregular,
    intervalSpread,
    recentIntervals: intervalLengths,
    spreadDays,
    nextStart,
    windowStart: addDays(nextStart, -spreadDays),
    windowEnd: addDays(nextStart, spreadDays),
  };
}
