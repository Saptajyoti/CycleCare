const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const { after, before, test } = require("node:test");

let backend;
let baseUrl;

before(async () => {
  let startupOutput = "";
  let startupError = "";
  let resolveStartup;
  let rejectStartup;
  const startup = new Promise((resolve, reject) => {
    resolveStartup = resolve;
    rejectStartup = reject;
  });

  backend = spawn(process.execPath, ["index.js"], {
    cwd: __dirname,
    env: {
      ...process.env,
      CLIENT_ORIGIN: "https://additional-cyclecare-origin.example",
      GEMINI_API_KEY: "test-only-not-a-real-key",
      PORT: "0",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  backend.stdout.setEncoding("utf8");
  backend.stderr.setEncoding("utf8");
  backend.stdout.on("data", (chunk) => {
    startupOutput += chunk;
    const match = /CycleCare API running on port (\d+)/.exec(startupOutput);
    if (match) {
      baseUrl = `http://127.0.0.1:${match[1]}`;
      resolveStartup();
    }
  });
  backend.stderr.on("data", (chunk) => {
    startupError += chunk;
  });
  backend.once("error", rejectStartup);
  backend.once("exit", (code, signal) => {
    if (!baseUrl) {
      rejectStartup(new Error(
        `Backend exited during startup (${signal || code}). ${startupError || startupOutput}`
      ));
    }
  });

  let timeout;
  try {
    await Promise.race([
      startup,
      new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new Error(
          `Backend did not start before the test timeout. ${startupError || startupOutput}`
        )), 5000);
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }

  const response = await fetch(`${baseUrl}/api/health`);
  if (!response.ok) {
    throw new Error(`Backend health check failed with status ${response.status}.`);
  }
});

after(async () => {
  if (!backend || backend.exitCode !== null) return;
  const exited = once(backend, "exit");
  backend.kill();
  await exited;
});

test("health endpoint responds without contacting Gemini", async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    status: "ok",
    service: "CycleCare API",
  });
});

test("CORS permits the production, local, and configured frontend origins", async () => {
  const origins = [
    "https://cycle-care-wlhg.onrender.com",
    "http://localhost:5173",
    "https://additional-cyclecare-origin.example",
  ];

  for (const origin of origins) {
    const response = await fetch(`${baseUrl}/api/assistant`, {
      method: "OPTIONS",
      headers: {
        Origin: origin,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
      },
    });
    assert.equal(response.status, 204);
    assert.equal(response.headers.get("access-control-allow-origin"), origin);
  }
});

test("CORS does not allow unrelated browser origins", async () => {
  const response = await fetch(`${baseUrl}/api/assistant`, {
    method: "OPTIONS",
    headers: {
      Origin: "https://unrelated.example",
      "Access-Control-Request-Method": "POST",
    },
  });
  assert.equal(response.headers.get("access-control-allow-origin"), null);
});

test("assistant route requires the explicit consent request format", async () => {
  const response = await fetch(`${baseUrl}/api/assistant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://cycle-care-wlhg.onrender.com",
    },
    body: JSON.stringify({ message: "Test question", consent: false }),
  });
  assert.equal(response.status, 403);
  assert.equal(
    response.headers.get("access-control-allow-origin"),
    "https://cycle-care-wlhg.onrender.com"
  );
  assert.deepEqual(await response.json(), {
    error: "AI consent is required.",
  });
});

test("backend returns fixed urgent guidance without contacting Gemini", async () => {
  const response = await fetch(`${baseUrl}/api/assistant`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "I'm bleeding a lot and feel faint",
      consent: true,
    }),
  });
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.safety, true);
  assert.equal(payload.category, "urgent");
  assert.match(payload.answer, /urgent medical assessment/i);
  assert.match(payload.answer, /112/);
});

test("backend returns fixed medical guidance for misspelled symptoms", async () => {
  const response = await fetch(`${baseUrl}/api/assistant`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "My periods are irreglar and one lasted 9 days",
      consent: true,
    }),
  });
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.safety, true);
  assert.equal(payload.category, "medical");
  assert.match(payload.answer, /qualified healthcare professional/i);
});

test("backend detects urgent English and Hindi symptoms before contacting Gemini", async () => {
  for (const message of [
    "I am bleeding heavily and feel faint",
    "I have sudden unbearable cramps",
    "बहुत ज्यादा खून बह रहा है और चक्कर आ रहे हैं",
    "गर्भवती हूँ और रक्तस्राव हो रहा है",
  ]) {
    const response = await fetch(`${baseUrl}/api/assistant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, consent: true }),
    });
    assert.equal(response.status, 200, message);
    const payload = await response.json();
    assert.equal(payload.safety, true, message);
    assert.equal(payload.category, "urgent", message);
  }
});

test("backend reports invalid port configuration during startup", async () => {
  const invalidServer = spawn(process.execPath, ["index.js"], {
    cwd: __dirname,
    env: {
      ...process.env,
      GEMINI_API_KEY: "test-only-not-a-real-key",
      PORT: "not-a-port",
    },
    stdio: ["ignore", "ignore", "pipe"],
  });
  let stderr = "";
  invalidServer.stderr.setEncoding("utf8");
  invalidServer.stderr.on("data", (chunk) => {
    stderr += chunk;
  });
  const [code] = await once(invalidServer, "exit");
  assert.notEqual(code, 0);
  assert.match(stderr, /PORT must be an integer between 0 and 65535/);
});
