import test from "node:test";
import assert from "node:assert/strict";
import {
  AI_CONSENT_STORAGE_KEY,
  ASSISTANT_ENDPOINT,
  hasAiConsent,
  protectAssistantAnswer,
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
  assert.equal(local.getItem(AI_CONSENT_STORAGE_KEY), "question-to-gemini-v1");
  setAiConsent(false, local);
  assert.equal(hasAiConsent(local), false);
});

test("requires reconfirmation for older, underspecified saved consent", () => {
  const local = storage();
  local.setItem(AI_CONSENT_STORAGE_KEY, "true");
  assert.equal(hasAiConsent(local), false);
});

test("uses the local assistant endpoint outside a production build", () => {
  assert.equal(ASSISTANT_ENDPOINT, "http://localhost:5000/api/assistant");
});

test("sends only the message and explicit consent to the assistant endpoint", async () => {
  let request;
  const answer = await requestAssistantResponse("What is PMS?", async (_url, options) => {
    request = options;
    return { ok: true, json: async () => ({ answer: "A response" }) };
  }, undefined, true);
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
      1,
      true
    ),
    /took too long/
  );
});

test("does not issue a request without explicit AI consent", async () => {
  let requestMade = false;
  await assert.rejects(
    requestAssistantResponse("What is PMS?", async () => {
      requestMade = true;
      return { ok: true, json: async () => ({ answer: "A response" }) };
    }, undefined, false),
    /Give consent/
  );
  assert.equal(requestMade, false);
});

test("does not send safety-screened symptom questions to the AI service", async () => {
  let requestMade = false;
  await assert.rejects(
    requestAssistantResponse("I'm soaking through a pad every hour and feel faint", async () => {
      requestMade = true;
      return { ok: true, json: async () => ({ answer: "A response" }) };
    }, undefined, true),
    /local safety guidance/
  );
  assert.equal(requestMade, false);
});

test("replaces an AI response that introduces urgent symptoms with fixed guidance", () => {
  const protectedAnswer = protectAssistantAnswer(
    "If you have sudden severe pain or very heavy bleeding with faintness, get help."
  );
  assert.equal(protectedAnswer.role, "safety");
  assert.equal(protectedAnswer.category, "urgent");
  assert.match(protectedAnswer.content, /Do not wait for an app estimate or an AI answer/);
});

test("uses a safe message when the assistant endpoint cannot be reached", async () => {
  await assert.rejects(
    requestAssistantResponse("What is PMS?", async () => {
      throw new TypeError("Failed to fetch");
    }, undefined, true),
    /could not be reached/
  );
});
