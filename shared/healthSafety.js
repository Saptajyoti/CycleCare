function normalizeQuestion(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, " ")
    .trim();
}

function editDistanceAtMostOne(left, right) {
  if (Math.abs(left.length - right.length) > 1) return false;
  let leftIndex = 0;
  let rightIndex = 0;
  let edits = 0;

  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex] === right[rightIndex]) {
      leftIndex += 1;
      rightIndex += 1;
      continue;
    }
    edits += 1;
    if (edits > 1) return false;
    if (left.length > right.length) leftIndex += 1;
    else if (right.length > left.length) rightIndex += 1;
    else {
      leftIndex += 1;
      rightIndex += 1;
    }
  }

  if (leftIndex < left.length || rightIndex < right.length) edits += 1;
  return edits <= 1;
}

function includesTerm(text, tokens, terms) {
  return terms.some((term) => {
    if (text.includes(term)) return true;
    return tokens.some((token) =>
      token.length >= 5 &&
      term.length >= 5 &&
      editDistanceAtMostOne(token, term)
    );
  });
}

function makeGuidance(category, title, message) {
  return { category, title, message };
}

export function getHealthSafetyGuidance(question) {
  const text = normalizeQuestion(question);
  if (!text) return null;

  const tokens = text.split(/\s+/);
  const mentionsActiveBleeding = includesTerm(text, tokens, [
    "bleed", "bleeding", "spotting", "रक्तस्राव", "खून",
  ]);
  const mentionsBleeding = includesTerm(text, tokens, [
    "bleed", "bleeding", "period", "spotting", "रक्तस्राव", "खून",
  ]);
  const mentionsPeriodProduct = includesTerm(text, tokens, [
    "pad", "pads", "tampon", "tampons", "menstrual cup", "पैड",
  ]);
  const mentionsPain = includesTerm(text, tokens, [
    "pain", "cramp", "cramps", "ache", "hurting", "दर्द", "ऐंठन",
  ]);
  const mentionsPregnancy = includesTerm(text, tokens, [
    "pregnant", "pregnancy", "conceive", "गर्भवती", "गर्भावस्था",
  ]);
  const mentionsFaintness = includesTerm(text, tokens, [
    "faint", "fainted", "fainting", "dizzy", "dizziness",
    "lightheaded", "passing out", "बेहोश", "चक्कर",
    "breathless", "short of breath", "breathlessness", "difficulty breathing",
  ]);
  const mentionsSelfHarm = includesTerm(text, tokens, [
    "suicide", "suicidal", "self harm", "self-harm", "hurt myself",
    "kill myself", "end my life", "आत्महत्या", "खुदकुशी",
    "खुद को नुकसान", "मरना चाहती", "मरना चाहता", "जीना नहीं",
  ]) || /\b(can(?:not|'t)? go on|dont want to live|do not want to live)\b/.test(text);

  if (mentionsSelfHarm) {
    return makeGuidance(
      "urgent",
      "Immediate support is available",
      "If you may act on thoughts of self-harm or are in immediate danger, contact local emergency services or go to an emergency department now. In India, call 112 for emergency help or Tele-MANAS at 14416. This app cannot provide crisis monitoring."
    );
  }

  const mentionsHeavyBleeding =
    (mentionsBleeding || mentionsPeriodProduct) && includesTerm(text, tokens, [
      "heavy", "heavily", "soaking", "soaked", "flooding", "flood",
      "a lot", "too much", "बहुत ज्यादा", "बहुत अधिक",
    ]);
  const changingProductHourly =
    /\b(every|each|per)\s+(?:single\s+)?(?:hour|hr)\b/.test(text) ||
    /\b(every|each|per)\s+(?:1\s+2|one(?:\s+to\s+two)?|two)\s+(?:hours?|hrs?)\b/.test(text) ||
    /\b(?:hourly|हर घंटे)\b/.test(text);
  const suddenSeverePain =
    mentionsPain &&
    includesTerm(text, tokens, ["sudden", "severe", "unbearable", "worst", "अचानक", "असहनीय", "तेज"]);
  const pregnancyWarning =
    mentionsPregnancy && (mentionsPain || mentionsActiveBleeding);

  if (
    (mentionsActiveBleeding && mentionsFaintness) ||
    (mentionsHeavyBleeding && mentionsFaintness) ||
    (mentionsBleeding && changingProductHourly && (mentionsHeavyBleeding || mentionsFaintness)) ||
    (changingProductHourly && mentionsFaintness) ||
    suddenSeverePain ||
    pregnancyWarning
  ) {
    return makeGuidance(
      "urgent",
      "Urgent symptoms need prompt assessment",
      "The symptoms you described may need urgent medical assessment. Contact your local emergency service or go to an emergency department now; in India, call 112. Do not wait for an app estimate or an AI answer. CycleCare cannot diagnose the cause."
    );
  }

  const prolongedBleeding =
    mentionsBleeding &&
    (/\b(?:8|9|1\d|[2-9]\d)\s*(?:days?|weeks?)\b/.test(text) ||
      /\b(?:more than|over|longer than)\s+(?:a|one)\s+week\b/.test(text));
  const heavyBleeding = mentionsHeavyBleeding || changingProductHourly;
  const irregularPeriods = includesTerm(text, tokens, [
    "irregular", "irreglar", "unpredictable", "often", "frequently",
  ]) && includesTerm(text, tokens, ["period", "cycle", "bleeding"]);
  const missedPeriod =
    includesTerm(text, tokens, ["missed", "late", "absent", "stopped"]) &&
    includesTerm(text, tokens, ["period", "menstruation", "bleeding"]);
  const disruptivePain =
    mentionsPain &&
    includesTerm(text, tokens, [
      "disabling", "worsening", "worse", "disrupt", "work", "school",
      "activities", "bad", "terrible", "cant walk", "cannot walk",
      "cant stand", "cannot stand", "cannot function", "doubled over",
    ]);

  if (heavyBleeding || prolongedBleeding) {
    return makeGuidance(
      "medical",
      "Consider medical advice about the bleeding",
      "Bleeding that lasts longer than 7 days, repeatedly requires changing period products every 1–2 hours, includes large clots, or disrupts daily life is worth discussing with a qualified healthcare professional. If you feel faint, very weak, or severely short of breath, seek urgent assessment. This app cannot identify the cause."
    );
  }

  if (irregularPeriods || missedPeriod) {
    return makeGuidance(
      "medical",
      "Consider discussing period changes with a healthcare professional",
      "A late or missed period can have many causes. If pregnancy is possible, consider a pregnancy test and follow its instructions. Arrange professional advice if you miss 3 periods in a row, go about 90 days without a period, or a new irregular pattern continues or concerns you. Seek urgent care for severe pain or bleeding when pregnancy is possible."
    );
  }

  if (disruptivePain) {
    return makeGuidance(
      "medical",
      "Pain that affects daily life deserves medical advice",
      "Period pain that is severe, worsening, or stops usual activities should be discussed with a qualified healthcare professional. Sudden severe pain or severe pain when pregnancy is possible needs urgent assessment. Do not start or stop medication based on an AI response."
    );
  }

  return null;
}
