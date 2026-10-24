export const ASSISTANT_ENDPOINT =
  import.meta.env?.VITE_ASSISTANT_API_URL ||
  "http://localhost:5000/api/assistant";
export const AI_CONSENT_STORAGE_KEY = "cyclecare_ai_consent";
const ASSISTANT_TIMEOUT_MS = 35000;

export function hasAiConsent(storage = globalThis.localStorage) {
  return storage?.getItem(AI_CONSENT_STORAGE_KEY) === "true";
}

export function setAiConsent(consented, storage = globalThis.localStorage) {
  if (consented) storage?.setItem(AI_CONSENT_STORAGE_KEY, "true");
  else storage?.removeItem(AI_CONSENT_STORAGE_KEY);
}

export async function requestAssistantResponse(
  message,
  fetchImpl = globalThis.fetch,
  timeoutMs = ASSISTANT_TIMEOUT_MS
) {
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
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || typeof payload.answer !== "string" || !payload.answer.trim()) {
    throw new Error(payload.error || "The AI assistant is temporarily unavailable.");
  }
  return payload.answer.trim();
}
