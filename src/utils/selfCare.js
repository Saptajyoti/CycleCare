import { parseDateOnly } from "./cycle.js";

export const selfCareCategories = [
  { id: "nutrition", label: "Nutrition", description: "Balanced meals, snacks, and hydration basics." },
  { id: "refreshments", label: "Refreshments", description: "Water, warm drinks, and caffeine-free choices." },
  { id: "relaxation", label: "Relaxation", description: "Short breathing and guided relaxation ideas." },
  { id: "physical-comfort", label: "Physical comfort", description: "Gentle movement and ways to find a comfortable position." },
];

export const selfCareSuggestions = [
  {
    id: "balanced-plate",
    category: "nutrition",
    title: "Build a balanced plate",
    description: "When available, combine foods you enjoy from different food groups, such as grains or other staples, vegetables or fruit, and a protein source.",
    detail: "There is no single meal that works for everyone. Follow your needs, preferences, culture, budget, and any advice from your care team.",
    kind: "fruit",
  },
  {
    id: "easy-snack",
    category: "nutrition",
    title: "Choose an easy snack",
    description: "Keep a familiar snack nearby if that is useful for you.",
    detail: "Fruit, yogurt, nuts, or another preferred snack are examples, not requirements. Consider allergies and dietary needs.",
    kind: "fruit",
  },
  {
    id: "drink-to-thirst",
    category: "nutrition",
    title: "Keep a drink within reach",
    description: "Water is one option; other suitable drinks and foods also contribute fluid.",
    detail: "Drink to thirst and follow any fluid guidance from a healthcare professional. Individual needs vary.",
    kind: "water",
  },
  {
    id: "fresh-water",
    category: "refreshments",
    title: "Fresh water",
    description: "Try a glass or bottle of water at a temperature you prefer.",
    detail: "Drink to thirst. You can add fruit for flavor if that suits you; plain water is fine too.",
    kind: "water",
  },
  {
    id: "warm-herbal-drink",
    category: "refreshments",
    title: "Warm caffeine-free drink",
    description: "Choose a caffeine-free herbal or other warm drink you already enjoy.",
    detail: "Check labels for ingredients, allergies, pregnancy considerations, and medicine interactions when relevant. A warm drink is a comfort choice, not a treatment.",
    kind: "peppermint",
  },
  {
    id: "lemon-water",
    category: "refreshments",
    title: "Water with lemon",
    description: "Add lemon if you enjoy the taste, or choose another caffeine-free drink.",
    detail: "This is an optional flavor idea. It does not treat cramps or change hormones.",
    kind: "lemon",
  },
  {
    id: "slow-breathing",
    category: "relaxation",
    title: "Slow, comfortable breathing",
    description: "Sit in a supported position and breathe gently at a pace that feels comfortable.",
    detail: "If it feels comfortable, breathe in softly for about 3 counts and out for about 4 counts. Repeat for up to one minute. Do not hold your breath; return to normal breathing or stop if you feel dizzy or uncomfortable.",
  },
  {
    id: "guided-body-check",
    category: "relaxation",
    title: "One-minute body check",
    description: "Notice where your body feels supported, without needing to change anything.",
    detail: "Starting at your feet and moving upward, gently notice areas of tension and ease. Skip any area or stop whenever you like.",
  },
  {
    id: "quiet-break",
    category: "relaxation",
    title: "Take a quiet pause",
    description: "If possible, choose a calm place for a short break, music, or another relaxing activity.",
    detail: "There is no right way to relax. Choose what feels safe and accessible to you.",
  },
  {
    id: "gentle-stretch",
    category: "physical-comfort",
    title: "Try a gentle stretch",
    description: "If movement is comfortable for you, try a small shoulder roll or an easy seated side stretch.",
    detail: "Move slowly and within a comfortable range. Do not push through pain; stop if symptoms worsen. Skip movement if it is not suitable for you.",
  },
  {
    id: "easy-walk",
    category: "physical-comfort",
    title: "Consider an easy walk",
    description: "A brief, relaxed walk is an option if it feels right for your body and surroundings.",
    detail: "Keep it gentle, choose a safe route, and stop or rest if you feel unwell. Rest is also a valid choice.",
  },
  {
    id: "comfortable-position",
    category: "physical-comfort",
    title: "Find a supported position",
    description: "Adjust pillows or seating to find a position that feels comfortable.",
    detail: "You can change position or rest as needed. Seek professional advice for severe, new, or worsening pain.",
  },
];

const knownSuggestionIds = new Set(selfCareSuggestions.map((item) => item.id));

export function createEmptySelfCareData() {
  return {
    version: 1,
    completedByDate: {},
    favorites: [],
    comfortFeedback: {},
    reminder: { enabled: false, time: "20:00", lastFiredDate: "" },
  };
}

export function validateSelfCareData(value, today = "9999-12-31") {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const validDate = (date) =>
    parseDateOnly(date) && date <= today;
  const completedByDate = value.completedByDate;
  const favorites = value.favorites;
  const feedback = value.comfortFeedback;
  const reminder = value.reminder;
  const validCompleted =
    completedByDate &&
    typeof completedByDate === "object" &&
    !Array.isArray(completedByDate) &&
    Object.entries(completedByDate).length <= 10000 &&
    Object.entries(completedByDate).every(([date, ids]) =>
      validDate(date) &&
      Array.isArray(ids) &&
      ids.length <= selfCareSuggestions.length &&
      new Set(ids).size === ids.length &&
      ids.every((id) => knownSuggestionIds.has(id))
    );
  const validFavorites =
    Array.isArray(favorites) &&
    favorites.length <= selfCareSuggestions.length &&
    new Set(favorites).size === favorites.length &&
    favorites.every((id) => knownSuggestionIds.has(id));
  const validFeedback =
    feedback &&
    typeof feedback === "object" &&
    !Array.isArray(feedback) &&
    Object.keys(feedback).length <= selfCareSuggestions.length &&
    Object.entries(feedback).every(([id, entry]) =>
      knownSuggestionIds.has(id) &&
      entry &&
      typeof entry === "object" &&
      validDate(entry.date) &&
      typeof entry.helped === "boolean"
    );
  const validReminder =
    reminder &&
    typeof reminder === "object" &&
    typeof reminder.enabled === "boolean" &&
    /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(reminder.time) &&
    (reminder.lastFiredDate === "" || validDate(reminder.lastFiredDate));

  return value.version === 1 &&
    validCompleted &&
    validFavorites &&
    validFeedback &&
    validReminder;
}

export function normalizeSelfCareData(value) {
  if (value == null) return createEmptySelfCareData();
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      throw new Error("Saved self-care data could not be read.");
    }
  }
  if (!validateSelfCareData(value)) {
    throw new Error("Saved self-care data is invalid or uses an unsupported version.");
  }
  return value;
}
