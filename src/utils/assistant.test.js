import test from "node:test";
import assert from "node:assert/strict";
import {
  AI_CONSENT_STORAGE_KEY,
  ASSISTANT_ENDPOINT,
  hasAiConsent,
  requestAssistantResponse,
  setAiConsent,
} from "./assistant.js";

function storage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
}

test("stores consent locally and removes it when revoked", () => {
  const local = storage();
  assert.equal(hasAiConsent(local), false);
  setAiConsent(true, local);
  assert.equal(local.getItem(AI_CONSENT_STORAGE_KEY), "true");
  setAiConsent(false, local);
  assert.equal(hasAiConsent(local), false);
});

test("uses the local assistant endpoint when no deployment URL is configured", () => {
  assert.equal(ASSISTANT_ENDPOINT, "http://localhost:5000/api/assistant");
});

test("sends only the message and explicit consent to the assistant endpoint", async () => {
  let request;
  const answer = await requestAssistantResponse("What is PMS?", async (_url, options) => {
    request = options;
    return { ok: true, json: async () => ({ answer: "A response" }) };
  });
  assert.equal(answer, "A response");
  assert.equal(request.method, "POST");
  assert.deepEqual(JSON.parse(request.body), { message: "What is PMS?", consent: true });
});

test("turns an expired assistant request into a helpful timeout message", async () => {
  await assert.rejects(
    requestAssistantResponse(
      "What is PMS?",
      (_url, options) => new Promise((_resolve, reject) => {
        options.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
      }),
      1
    ),
    /took too long/
  );
});
