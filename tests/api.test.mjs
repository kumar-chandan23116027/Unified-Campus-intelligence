import test from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";

process.env.PORT = "4398";
process.env.ADMIN_API_KEY = "test-admin-key";
process.env.BODY_LIMIT_BYTES = "1024";
process.env.RATE_LIMIT_WINDOW_MS = "60000";
process.env.RATE_LIMIT_MAX_REQUESTS = "100";
process.env.DATABASE_PATH = "/tmp/campus-intel-api-test.db";
process.env.DATA_MODE = "mock";

const { createCampusServer } = await import("../src/server.js");

const server = createCampusServer();
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
const baseUrl = `http://127.0.0.1:${address.port}`;

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  return { response, payload };
}

test("health, readiness, and dashboard", async () => {
  const health = await request("/api/health");
  assert.equal(health.response.status, 200);
  assert.equal(health.payload.ok, true);

  const ready = await request("/api/ready");
  assert.equal(ready.response.status, 200);
  assert.equal(ready.payload.dataSources, 5);

  const dashboard = await request("/api/dashboard");
  assert.equal(dashboard.response.status, 200);
  assert.equal(dashboard.payload.sources.length, 5);
  assert.equal(dashboard.payload.stats.liveSources, 5);
});

test("malformed JSON and missing assistant fields return 400", async () => {
  const malformed = await request("/api/assistant", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{bad"
  });
  assert.equal(malformed.response.status, 400);
  assert.equal(malformed.payload.error.code, "BAD_REQUEST");

  const missing = await request("/api/assistant", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({})
  });
  assert.equal(missing.response.status, 400);
});

test("body size limit returns 413", async () => {
  const result = await request("/api/assistant", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message: "x".repeat(2000) })
  });
  assert.equal(result.response.status, 413);
});

test("wrong methods, unknown routes, and unknown MCP sources", async () => {
  const wrongMethod = await request("/api/health", { method: "POST" });
  assert.equal(wrongMethod.response.status, 405);

  const unknown = await request("/api/does-not-exist");
  assert.equal(unknown.response.status, 404);

  const unknownMcp = await request("/mcp/unknown");
  assert.equal(unknownMcp.response.status, 404);
});

test("assistant handles known and unknown queries", async () => {
  const known = await request("/api/assistant", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message: "Is an AI book available?" })
  });
  assert.equal(known.response.status, 200);
  assert.equal(known.payload.mode, "rule-based fallback");
  assert.equal(known.payload.sources[0].id, "library");

  const unknown = await request("/api/assistant", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message: "tell me about quantum bananas" })
  });
  assert.equal(unknown.response.status, 200);
  assert.equal(unknown.payload.sources.length, 0);
  assert.match(unknown.payload.answer, /could not identify/i);
});

test("admin CRUD requires authentication and supports duplicate prevention", async () => {
  const unauthenticated = await request("/api/admin/events");
  assert.equal(unauthenticated.response.status, 401);

  const headers = {
    authorization: "Bearer test-admin-key",
    "content-type": "application/json"
  };
  const duplicate = await request("/api/admin/events", {
    method: "POST",
    headers,
    body: JSON.stringify({
      title: "MCP Tool-Building Workshop",
      club: "AI Student Chapter",
      date: "2026-12-30",
      time: "15:00",
      venue: "Innovation Lab"
    })
  });
  assert.equal(duplicate.response.status, 400);
  assert.match(duplicate.payload.error.message, /title already exists/i);
});

test("rate limiter rejects excess requests", async () => {
  process.env.RATE_LIMIT_MAX_REQUESTS = "1";
  const { createCampusServer: createLimitedServer } = await import("../src/server.js");
  const limited = createLimitedServer();
  await new Promise((resolve) => limited.listen(0, "127.0.0.1", resolve));
  const limitedPort = limited.address().port;
  await fetch(`http://127.0.0.1:${limitedPort}/api/health`);
  const rejected = await fetch(`http://127.0.0.1:${limitedPort}/api/health`);
  assert.equal(rejected.status, 429);
  limited.closeAllConnections();
  await new Promise((resolve) => limited.close(resolve));
});

test.after(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  await rm(process.env.DATABASE_PATH, { force: true }).catch(() => {});
});
