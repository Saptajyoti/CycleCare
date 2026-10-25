require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { GoogleGenAI } = require("@google/genai");

const app = express();
const REQUIRED_ORIGINS = [
  "https://cycle-care-wlhg.onrender.com",
  "http://localhost:5173",
];
const configuredOrigins = (process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = new Set([...REQUIRED_ORIGINS, ...configuredOrigins]);
const GEMINI_TIMEOUT_MS = Math.min(
  Math.max(Number(process.env.GEMINI_TIMEOUT_MS) || 30000, 5000),
  60000
);
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

// Validate required environment variables
if (!process.env.GEMINI_API_KEY) {
  console.error("Missing required GEMINI_API_KEY environment variable.");
  process.exit(1);
}

// Middleware
app.use(
  cors({
    origin(origin, callback) {
      callback(null, !origin || allowedOrigins.has(origin));
    },
  })
);

app.use(express.json({ limit: "10kb" }));

// Initialize Gemini
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});
const healthSafetyModule = import("../shared/healthSafety.js");

// CycleCare assistant instructions
const SYSTEM_INSTRUCTION = `
You are the CycleCare educational assistant.

Your scope is menstrual health, reproductive health education,
general wellbeing related to menstrual health, and explaining
how to use the CycleCare application.

Rules:
1. Provide general educational information, never a diagnosis or treatment plan.
2. Be clear about uncertainty and avoid unsupported medical claims.
3. Never recommend starting, changing, or stopping medication.
4. Encourage appropriate professional medical care when needed.
5. Put urgent assessment guidance before any other information for potentially dangerous symptoms.
6. Never soften, contradict, or replace urgent safety guidance with reassurance.
7. Politely refuse unrelated questions and redirect users
   to CycleCare's intended topics.
8. Never claim to know the user's medical history.
9. Use clear, empathetic, easy-to-understand language.
10. Do not claim to have accessed the user's CycleCare records.
11. Do not replace a healthcare professional.
`;

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "CycleCare API",
  });
});

// AI assistant endpoint
app.post("/api/assistant", async (req, res) => {
  const requestStartedAt = performance.now();
  let geminiDurationMs = null;
  let outcome = "rejected";
  let geminiTimedOut = false;

  res.on("finish", () => {
    console.info("CycleCare AI timing", {
      totalDurationMs: Math.round(performance.now() - requestStartedAt),
      geminiDurationMs,
      model: GEMINI_MODEL,
      outcome,
      status: res.statusCode,
    });
  });

  try {
    const { message, consent } = req.body || {};

    // Require explicit consent
    if (consent !== true) {
      return res.status(403).json({
        error: "AI consent is required.",
      });
    }

    // Validate question
    if (
      typeof message !== "string" ||
      !message.trim() ||
      message.trim().length > 2000
    ) {
      return res.status(400).json({
        error: "Please provide a question of up to 2000 characters.",
      });
    }

    const { getHealthSafetyGuidance } = await healthSafetyModule;
    const safetyGuidance = getHealthSafetyGuidance(message);
    if (safetyGuidance) {
      outcome = "local-safety-guidance";
      return res.json({
        answer: safetyGuidance.message,
        safety: true,
        category: safetyGuidance.category,
      });
    }

    // Generate response using Gemini
    const controller = new AbortController();
    let timeout;
    const geminiStartedAt = performance.now();
    let response;

    try {
      const generation = ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: message.trim(),
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          maxOutputTokens: 250,
          temperature: 0.4,
          httpOptions: { abortSignal: controller.signal },
        },
      });
      const deadline = new Promise((_, reject) => {
        timeout = setTimeout(() => {
          geminiTimedOut = true;
          controller.abort();
          const error = new Error("Gemini request timed out.");
          error.name = "AbortError";
          reject(error);
        }, GEMINI_TIMEOUT_MS);
      });
      response = await Promise.race([generation, deadline]);
    } finally {
      clearTimeout(timeout);
      geminiDurationMs = Math.round(performance.now() - geminiStartedAt);
    }

    const answer = response.text;

    if (!answer || !answer.trim()) {
      return res.status(502).json({
        error: "The AI provider returned an empty response.",
      });
    }

    outcome = "success";
    return res.json({
      answer: answer.trim(),
    });
  } catch (error) {
    if (geminiTimedOut || error?.name === "AbortError") {
      outcome = "timeout";
      return res.status(504).json({
        error: "The AI assistant took too long to respond. Please try again or use the offline answers below.",
      });
    }

    outcome = "provider-error";
    // Log diagnostic information without exposing the API key
    console.error("CycleCare AI request failed:", {
      name: error.name,
      status: error.status,
      code: error.code,
    });

    return res.status(502).json({
      error: "The AI assistant is temporarily unavailable. Please try again later.",
    });
  }
});

// Handle invalid JSON
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);

  if (error instanceof SyntaxError && error.status === 400) {
    return res.status(400).json({
      error: "Invalid JSON request body.",
    });
  }

  if (error.type === "entity.too.large") {
    return res.status(413).json({
      error: "Request body is too large.",
    });
  }

  console.error("CycleCare API request failed:", {
    name: error.name,
    status: error.status,
  });
  return res.status(500).json({
    error: "The server could not process the request.",
  });
});

// Start server
const PORT = Number(process.env.PORT ?? 5000);
if (!Number.isInteger(PORT) || PORT < 0 || PORT > 65535) {
  throw new Error("PORT must be an integer between 0 and 65535.");
}

const server = app.listen(PORT, () => {
  console.log(`CycleCare API running on port ${server.address().port}`);
});
