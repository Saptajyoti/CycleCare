import { getHealthSafetyGuidance } from "../../shared/healthSafety.js";

export const ASSISTANT_ENDPOINT =
  import.meta.env?.VITE_ASSISTANT_API_URL ||
  (import.meta.env?.PROD
    ? "https://cycle-care-b.onrender.com/api/assistant"
    : "http://localhost:5000/api/assistant");
export const AI_CONSENT_STORAGE_KEY = "cyclecare_ai_consent";
const AI_CONSENT_VERSION = "question-to-gemini-v1";
const ASSISTANT_TIMEOUT_MS = 35000;

export function hasAiConsent(storage = globalThis.localStorage) {
  return storage?.getItem(AI_CONSENT_STORAGE_KEY) === AI_CONSENT_VERSION;
}

export function setAiConsent(consented, storage = globalThis.localStorage) {
  if (consented) storage?.setItem(AI_CONSENT_STORAGE_KEY, AI_CONSENT_VERSION);
  else storage?.removeItem(AI_CONSENT_STORAGE_KEY);
}

export function protectAssistantAnswer(answer) {
  const safetyGuidance = getHealthSafetyGuidance(answer);
  if (safetyGuidance?.category === "urgent") {
    return {
      role: "safety",
      title: safetyGuidance.title,
      category: safetyGuidance.category,
      content: safetyGuidance.message,
    };
  }
  return { role: "assistant", content: answer };
}

export async function requestAssistantResponse(
  message,
  fetchImpl = globalThis.fetch,
  timeoutMs = ASSISTANT_TIMEOUT_MS,
  consented = hasAiConsent()
) {
  if (!consented) {
    throw new Error("Give consent in the AI assistant before sending a question.");
  }
  if (getHealthSafetyGuidance(message)) {
    throw new Error("This question needs the local safety guidance before an AI request.");
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response;

  try {
    response = await fetchImpl(ASSISTANT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, consent: true }),
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("The AI assistant took too long to respond. The offline answers below are still available.");
    }
    throw new Error("The AI assistant could not be reached. Please try again later or use the offline answers below.");
  } finally {
    clearTimeout(timeout);
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || typeof payload.answer !== "string" || !payload.answer.trim()) {
    throw new Error(
      (typeof payload.error === "string" && payload.error) ||
        "The AI assistant is temporarily unavailable."
    );
  }
  return payload.answer.trim();
}
