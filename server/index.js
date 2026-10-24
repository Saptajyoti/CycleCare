require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { GoogleGenAI } = require("@google/genai");

const app = express();
const GEMINI_TIMEOUT_MS = Math.min(
  Math.max(Number(process.env.GEMINI_TIMEOUT_MS) || 30000, 5000),
  60000
);
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

// Validate required environment variables
if (!process.env.GEMINI_API_KEY) {
  console.error("Missing GEMINI_API_KEY in server/.env");
  process.exit(1);
}

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  })
);

app.use(express.json({ limit: "10kb" }));

// Initialize Gemini
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// CycleCare assistant instructions
const SYSTEM_INSTRUCTION = `
You are the CycleCare educational assistant.

Your scope is menstrual health, reproductive health education,
general wellbeing related to menstrual health, and explaining
how to use the CycleCare application.

Rules:
1. Provide general educational information, not a diagnosis.
2. Be clear about uncertainty and avoid unsupported medical claims.
3. Do not recommend starting or stopping medication.
4. Encourage appropriate professional medical care when needed.
5. For potentially life-threatening symptoms, advise urgent
   medical assessment.
6. Politely refuse unrelated questions and redirect users
   to CycleCare's intended topics.
7. Never claim to know the user's medical history.
8. Use clear, empathetic, easy-to-understand language.
9. Do not claim to have accessed the user's CycleCare records.
10. Do not replace a healthcare professional.
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
      error: "The AI assistant is temporarily unavailable.",
      details:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
});

// Handle invalid JSON
app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400) {
    return res.status(400).json({
      error: "Invalid JSON request body.",
    });
  }

  return next(error);
});

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`CycleCare API running on port ${PORT}`);
});
