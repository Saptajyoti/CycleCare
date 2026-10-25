const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const { createServer } = require("node:net");
const { after, before, test } = require("node:test");

let backend;
let baseUrl;

async function getAvailablePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const { port } = server.address();
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  return port;
}

before(async () => {
  const port = await getAvailablePort();
  baseUrl = `http://127.0.0.1:${port}`;
  backend = spawn(process.execPath, ["index.js"], {
    cwd: __dirname,
    env: {
      ...process.env,
      CLIENT_ORIGIN: "https://additional-cyclecare-origin.example",
      GEMINI_API_KEY: "test-only-not-a-real-key",
      PORT: String(port),
    },
    stdio: "ignore",
  });

  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    if (backend.exitCode !== null) {
      throw new Error(`Backend exited during startup with code ${backend.exitCode}`);
    }
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
  throw new Error("Backend did not start before the test timeout");
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
