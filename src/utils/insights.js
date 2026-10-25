export function getCrossCyclePatterns(periods, symptoms) {
  if (!Array.isArray(periods) || periods.length < 4 || !Array.isArray(symptoms)) {
    return [];
  }

  const cycleSets = new Map();
  const cycles = periods.slice(0, -1).map((period, index) => ({
    start: period.startDate,
    end: periods[index + 1].startDate,
  }));
  const recentCycles = cycles.slice(-6);

  symptoms.forEach((record) => {
    const cycleIndex = recentCycles.findIndex(
      (cycle) => record.date >= cycle.start && record.date < cycle.end
    );
    if (cycleIndex < 0) return;

    new Set(record.symptoms).forEach((symptom) => {
      if (!cycleSets.has(symptom)) cycleSets.set(symptom, new Set());
      cycleSets.get(symptom).add(cycleIndex);
    });
  });

  return [...cycleSets.entries()]
    .filter(([, cyclesWithSymptom]) => cyclesWithSymptom.size >= 3)
    .map(([symptom, cyclesWithSymptom]) => ({
      symptom,
      cycleCount: cyclesWithSymptom.size,
      cyclesChecked: recentCycles.length,
    }))
    .sort((first, second) =>
      second.cycleCount - first.cycleCount ||
      first.symptom.localeCompare(second.symptom)
    );
}
